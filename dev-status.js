const SOURCES = {
  documentation: "./doc/DOCUMENTATION.md",
  latestUpdates: "./doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md",
};

const statusStrip = document.getElementById("status-strip");
const overviewPanel = document.getElementById("overview-panel");
const latestUpdatePanel = document.getElementById("latest-update-panel");
const flowPanel = document.getElementById("flow-panel");
const architecturePanel = document.getElementById("architecture-panel");
const controlsPanel = document.getElementById("controls-panel");
const principlesPanel = document.getElementById("principles-panel");

boot();

async function boot() {
  try {
    const [documentationMarkdown, latestUpdatesMarkdown] = await Promise.all([
      fetchText(SOURCES.documentation),
      fetchText(SOURCES.latestUpdates),
    ]);

    const documentation = parseDocumentation(documentationMarkdown);
    const latestUpdate = parseLatestUpdate(latestUpdatesMarkdown);

    renderStatusStrip(documentation, latestUpdate);
    renderOverview(documentation, latestUpdate);
    renderLatestUpdate(latestUpdate);
    renderFlow(documentation);
    renderArchitecture(documentation);
    renderControls(documentation);
    renderPrinciples(documentation);
  } catch (error) {
    renderError(error);
  }
}

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Impossible de charger ${path} (${response.status})`);
  }
  return response.text();
}

function parseLatestUpdate(markdown) {
  const lines = markdown.split(/\r?\n/);
  const updateStart = lines.findIndex((line) => /^##\s+\d{4}-\d{2}-\d{2}/.test(line));
  if (updateStart === -1) {
    throw new Error("Aucune entrée de changelog exploitable n'a été trouvée.");
  }

  const date = lines[updateStart].replace(/^##\s+/, "").trim();
  const section = [];
  for (let index = updateStart + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      break;
    }
    section.push(lines[index]);
  }

  const update = {
    date,
    author: null,
    branch: null,
    type: null,
    summary: [],
    files: [],
    notes: [],
  };

  let currentBucket = null;
  for (const rawLine of section) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("- **Author:**")) {
      update.author = cleanInlineMarkdown(line.replace("- **Author:**", ""));
      continue;
    }
    if (line.startsWith("- **Branch:**")) {
      update.branch = cleanInlineMarkdown(line.replace("- **Branch:**", ""));
      continue;
    }
    if (line.startsWith("- **Type:**")) {
      update.type = cleanInlineMarkdown(line.replace("- **Type:**", ""));
      continue;
    }
    if (/^###\s+Summary/.test(line)) {
      currentBucket = "summary";
      continue;
    }
    if (/^###\s+Files/.test(line)) {
      currentBucket = "files";
      continue;
    }
    if (/^###\s+Notes/.test(line)) {
      currentBucket = "notes";
      continue;
    }
    if (line.startsWith("- ") && currentBucket) {
      update[currentBucket].push(cleanInlineMarkdown(line.slice(2)));
    }
  }

  return update;
}

function parseDocumentation(markdown) {
  return {
    overview: extractSectionParagraphs(markdown, "Qu'est-ce que Prototype-0 ?"),
    stack: parseMarkdownTable(extractSection(markdown, "Stack technique")),
    architecture: parseArchitecture(extractCodeBlock(extractSection(markdown, "Architecture du code"))),
    buildLabSteps: parseNumberedEntries(extractSubsection(markdown, "Concepts clés", "Le Build Lab")),
    combat: parseBullets(extractSubsection(markdown, "Concepts clés", "Le combat")),
    maps: parseBullets(extractSubsection(markdown, "Concepts clés", "Les maps")),
    ai: parseBullets(extractSubsection(markdown, "Concepts clés", "L'IA")),
    controls: parseMarkdownTable(extractSection(markdown, "Contrôles")),
    principles: parseBullets(extractSection(markdown, "Principes de développement")),
    direction: parseBullets(extractSection(markdown, "Direction visuelle")),
  };
}

function extractSection(markdown, title) {
  const pattern = new RegExp(`##\\s+${escapeRegExp(title)}\\n([\\s\\S]*?)(?=\\n##\\s+|$)`);
  return markdown.match(pattern)?.[1]?.trim() ?? "";
}

function extractSubsection(markdown, sectionTitle, subsectionTitle) {
  const section = extractSection(markdown, sectionTitle);
  const pattern = new RegExp(`###\\s+${escapeRegExp(subsectionTitle)}\\n([\\s\\S]*?)(?=\\n###\\s+|$)`);
  return section.match(pattern)?.[1]?.trim() ?? "";
}

function extractCodeBlock(sectionContent) {
  return sectionContent.match(/```[a-zA-Z]*\n([\s\S]*?)```/)?.[1]?.trim() ?? "";
}

function extractSectionParagraphs(markdown, title) {
  return extractSection(markdown, title)
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseMarkdownTable(sectionContent) {
  return sectionContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((row) => row.length >= 2);
}

function parseBullets(sectionContent) {
  return sectionContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => cleanInlineMarkdown(line.slice(2)));
}

function parseNumberedEntries(sectionContent) {
  const lines = sectionContent.split(/\r?\n/);
  const entries = [];
  let currentEntry = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s+—\s+(.+)$/);
    if (numberedMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {
        index: numberedMatch[1],
        title: cleanInlineMarkdown(numberedMatch[2]),
        summary: cleanInlineMarkdown(numberedMatch[3]),
        bullets: [],
      };
      continue;
    }

    if (line.startsWith("- ") && currentEntry) {
      currentEntry.bullets.push(cleanInlineMarkdown(line.slice(2)));
    }
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
}

function parseArchitecture(codeBlock) {
  const lines = codeBlock.split(/\r?\n/).filter(Boolean);
  const rootFiles = [];
  const srcGroups = [];
  let currentGroup = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
    const trimmed = line.trim();
    const parts = trimmed.split(/\s{2,}/);
    const name = parts[0];
    const description = parts.slice(1).join(" ");

    if (indent === 0) {
      if (name === "src/") {
        continue;
      }
      rootFiles.push({ name, description });
      currentGroup = null;
      continue;
    }

    if (indent === 2 && name.endsWith("/")) {
      currentGroup = { name: name.replace(/\/$/, ""), items: [] };
      srcGroups.push(currentGroup);
      continue;
    }

    if (indent === 2 && !name.endsWith("/")) {
      if (!currentGroup || currentGroup.name !== "root") {
        currentGroup = srcGroups.find((group) => group.name === "root") ?? { name: "root", items: [] };
        if (!srcGroups.includes(currentGroup)) {
          srcGroups.unshift(currentGroup);
        }
      }
      currentGroup.items.push({ name, description });
      continue;
    }

    if (indent >= 4 && currentGroup) {
      currentGroup.items.push({ name, description });
    }
  }

  return { rootFiles, srcGroups };
}

function renderStatusStrip(documentation, latestUpdate) {
  const stackLabels = documentation.stack.map((row) => `${row[0]}: ${row[1]}`);
  const latestPassLabel = latestUpdate.type ?? "Mise a jour doc";
  const branchLabel = latestUpdate.branch ?? "Branche non indiquee";
  const authorLabel = latestUpdate.author ?? "Auteur non indique";
  statusStrip.innerHTML = `
    <article class="status-card status-card--accent">
      <span class="status-card__label">Dernière passe</span>
      <strong>${escapeHtml(latestPassLabel)}</strong>
      <span>${escapeHtml(latestUpdate.date)}</span>
    </article>
    <article class="status-card">
      <span class="status-card__label">Branche</span>
      <strong>${escapeHtml(branchLabel)}</strong>
      <span>${escapeHtml(authorLabel)}</span>
    </article>
    <article class="status-card">
      <span class="status-card__label">Stack</span>
      <strong>${escapeHtml(stackLabels[0] ?? "Stack non défini")}</strong>
      <span>${escapeHtml(stackLabels.slice(1, 3).join(" · "))}</span>
    </article>
  `;
}

function renderOverview(documentation, latestUpdate) {
  const overview = documentation.overview
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const highlights = latestUpdate.summary
    .slice(0, 4)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  overviewPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Snapshot</span>
      <h2>Projet</h2>
    </div>
    <div class="stack-cluster">
      ${documentation.stack
        .map(
          ([label, value]) => `
            <article class="stack-pill">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </article>
          `,
        )
        .join("")}
    </div>
    <div class="copy-block">${overview}</div>
    <div class="callout-list">
      <h3>Focus du dernier pass</h3>
      <ul>${highlights}</ul>
    </div>
  `;
}

function renderLatestUpdate(latestUpdate) {
  const meta = [latestUpdate.date, latestUpdate.author, latestUpdate.branch].filter(Boolean);
  const summaryMarkup = latestUpdate.summary.length
    ? `<ul class="bullet-list">${latestUpdate.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="muted">Le dernier changelog ne contient pas encore de resume structure.</p>`;

  latestUpdatePanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Latest Pass</span>
      <h2>${escapeHtml(latestUpdate.type ?? "Mise a jour consignée")}</h2>
    </div>
    ${meta.length ? `<p class="muted">${escapeHtml(meta.join(" · "))}</p>` : ""}
    ${summaryMarkup}
    ${latestUpdate.files.length ? `<div class="tag-cloud">${latestUpdate.files.slice(0, 10).map((file) => `<span>${escapeHtml(file)}</span>`).join("")}</div>` : ""}
    ${latestUpdate.notes.length ? `<p class="muted">${escapeHtml(latestUpdate.notes.join(" "))}</p>` : ""}
  `;
}

function renderFlow(documentation) {
  flowPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Loop</span>
      <h2>Flow joueur</h2>
    </div>
    <ol class="step-list">
      ${documentation.buildLabSteps
        .map(
          (step) => `
            <li>
              <strong>${escapeHtml(step.index)}. ${escapeHtml(step.title)}</strong>
              <p>${escapeHtml(step.summary)}</p>
              ${step.bullets.length ? `<ul>${step.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
}

function renderArchitecture(documentation) {
  architecturePanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Code Map</span>
      <h2>Architecture</h2>
    </div>
    <div class="architecture-grid">
      <article>
        <h3>Racine</h3>
        <ul class="bullet-list">
          ${documentation.architecture.rootFiles
            .map((item) => `<li><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.description)}</li>`)
            .join("")}
        </ul>
      </article>
      ${documentation.architecture.srcGroups
        .map(
          (group) => `
            <article>
              <h3>src/${escapeHtml(group.name)}</h3>
              <ul class="bullet-list">
                ${group.items.map((item) => `<li><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(item.description)}</li>`).join("")}
              </ul>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderControls(documentation) {
  controlsPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Controls</span>
      <h2>Inputs</h2>
    </div>
    <table class="data-table">
      <tbody>
        ${documentation.controls
          .map(
            (row) => `
              <tr>
                <th>${escapeHtml(row[0] ?? "")}</th>
                <td>${escapeHtml(row[1] ?? "")}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderPrinciples(documentation) {
  principlesPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Guardrails</span>
      <h2>Principes</h2>
    </div>
    <ul class="bullet-list">
      ${documentation.principles.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
    <h3>Direction visuelle</h3>
    <ul class="bullet-list">
      ${documentation.direction.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const markup = `
    <div class="panel-header">
      <span class="eyebrow">Erreur</span>
      <h2>Impossible de charger le board</h2>
    </div>
    <p class="empty-state">${escapeHtml(message)}</p>
  `;

  for (const panel of [overviewPanel, latestUpdatePanel, flowPanel, architecturePanel, controlsPanel, principlesPanel]) {
    panel.innerHTML = markup;
  }

  statusStrip.innerHTML = `
    <article class="status-card status-card--error">
      <span class="status-card__label">Erreur</span>
      <strong>${escapeHtml(message)}</strong>
    </article>
  `;
}

function cleanInlineMarkdown(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}