const SOURCES = {
  documentation: "../../../doc/DOCUMENTATION.md",
  latestUpdates: "../../../doc/COLLAB_UPDATES_MD/LATEST_UPDATES.md",
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
      <span class="status-card__label">Périmètre</span>
      <strong>${latestUpdate.summary.length} changements résumés</strong>
      <span>${latestUpdate.files.length} fichiers cités dans le changelog</span>
    </article>
    <article class="status-card">
      <span class="status-card__label">Stack</span>
      <strong>${escapeHtml(stackLabels[0] ?? "JavaScript")}</strong>
      <span>${escapeHtml(stackLabels.slice(1, 3).join(" · "))}</span>
    </article>
  `;
}

function renderOverview(documentation, latestUpdate) {
  const overviewCopy = documentation.overview.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const stackItems = documentation.stack
    .map((row) => `<li><strong>${escapeHtml(row[0])}</strong> ${escapeHtml(row[1])}</li>`)
    .join("");
  const directionItems = documentation.direction
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  overviewPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Snapshot</span>
      <h2>Projet</h2>
    </div>
    <div class="overview-grid">
      <div class="info-block">
        ${overviewCopy}
      </div>
      <div class="info-grid">
        <article class="mini-card">
          <span class="mini-card__tag">Stack</span>
          <h3>Fondation technique</h3>
          <ul class="stack-list">${stackItems}</ul>
        </article>
        <article class="mini-card">
          <span class="mini-card__tag">Direction</span>
          <h3>Atmosphère ciblée</h3>
          <ul class="bullet-list">${directionItems}</ul>
        </article>
        <article class="mini-card">
          <span class="mini-card__tag">Now</span>
          <h3>Cap courant</h3>
          <p>${escapeHtml(latestUpdate.summary[0] ?? "Aucun résumé disponible.")}</p>
        </article>
        <article class="mini-card">
          <span class="mini-card__tag">Scope</span>
          <h3>Ce que le joueur fait</h3>
          <p>${escapeHtml(documentation.buildLabSteps[2]?.summary ?? "Assembler un build puis entrer dans l'arène.")}</p>
        </article>
      </div>
    </div>
  `;
}

function renderLatestUpdate(latestUpdate) {
  const meta = [latestUpdate.date, latestUpdate.author, latestUpdate.branch].filter(Boolean);
  const summaryMarkup = latestUpdate.summary.length
    ? `<ul class="bullet-list">${latestUpdate.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="muted">Le dernier changelog ne contient pas encore de resume structure.</p>`;
  const filesMarkup = latestUpdate.files.length
    ? `<article class="list-card"><h3>Fichiers mentionnés</h3><ul class="file-list">${latestUpdate.files.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}</ul></article>`
    : "";
  const notesMarkup = latestUpdate.notes.length
    ? `<article class="list-card"><h3>Notes</h3><ul class="bullet-list">${latestUpdate.notes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>`
    : "";

  latestUpdatePanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Latest Pass</span>
      <h2>Changelog</h2>
    </div>
    ${meta.length ? `<div class="update-meta">${meta.map((entry) => `<span>${escapeHtml(entry)}</span>`).join("")}</div>` : ""}
    <article class="list-card">
      <h3>${escapeHtml(latestUpdate.type ?? "Mise a jour consignée")}</h3>
      ${summaryMarkup}
    </article>
    ${filesMarkup}
    ${notesMarkup}
  `;
}

function renderFlow(documentation) {
  const flowSteps = documentation.buildLabSteps
    .map(
      (step) => `
        <article class="flow-step">
          <span class="flow-step__index">${escapeHtml(step.index)}</span>
          <h3>${escapeHtml(step.title)}</h3>
          <p>${escapeHtml(step.summary)}</p>
          ${step.bullets.length ? `<ul class="bullet-list">${step.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        </article>
      `,
    )
    .join("");

  const combatHighlights = documentation.combat.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  flowPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Loop</span>
      <h2>Flow joueur</h2>
    </div>
    <div class="flow-grid">${flowSteps}</div>
    <article class="list-card">
      <h3>Conditions de combat</h3>
      <ul class="bullet-list">${combatHighlights}</ul>
    </article>
  `;
}

function renderArchitecture(documentation) {
  const rootItems = documentation.architecture.rootFiles
    .map((item) => `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description)}</span></li>`)
    .join("");
  const moduleCards = documentation.architecture.srcGroups
    .map(
      (group) => `
        <article class="module-card">
          <span class="module-card__tag">${escapeHtml(group.name)}</span>
          <h3>${group.name === "root" ? "Noyau src" : escapeHtml(group.name)}</h3>
          <ul class="module-card__list">
            ${group.items.map((item) => `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description)}</span></li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");

  architecturePanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Code Map</span>
      <h2>Architecture</h2>
    </div>
    <article class="list-card">
      <h3>Entrées racine</h3>
      <ul class="module-card__list">${rootItems}</ul>
    </article>
    <div class="module-grid">${moduleCards}</div>
  `;
}

function renderControls(documentation) {
  const controls = documentation.controls
    .map(
      (row) => `
        <article class="control-card">
          <span class="control-card__key">${escapeHtml(row[1])}</span>
          <h3>${escapeHtml(row[0])}</h3>
        </article>
      `,
    )
    .join("");
  const mapItems = documentation.maps.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const aiItems = documentation.ai.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  controlsPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Controls</span>
      <h2>Inputs</h2>
    </div>
    <div class="control-grid">${controls}</div>
    <article class="list-card">
      <h3>Maps</h3>
      <ul class="bullet-list">${mapItems}</ul>
    </article>
    <article class="list-card">
      <h3>IA</h3>
      <ul class="bullet-list">${aiItems}</ul>
    </article>
  `;
}

function renderPrinciples(documentation) {
  const principles = documentation.principles.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const direction = documentation.direction.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  principlesPanel.innerHTML = `
    <div class="panel-header">
      <span class="eyebrow">Guardrails</span>
      <h2>Principes</h2>
    </div>
    <div class="pill-grid">
      <article class="pill-card">
        <h3>Principes de dev</h3>
        <ul class="bullet-list">${principles}</ul>
      </article>
      <article class="pill-card">
        <h3>Direction visuelle</h3>
        <ul class="bullet-list">${direction}</ul>
      </article>
    </div>
  `;
}

function renderError(error) {
  const message = escapeHtml(error instanceof Error ? error.message : String(error));
  const errorMarkup = `
    <div class="error-box">
      Impossible de construire la vue développeur. Vérifie que la page est servie depuis Vite ou un serveur statique afin d'autoriser la lecture des fichiers Markdown.<br />
      Détail: ${message}
    </div>
  `;

  statusStrip.innerHTML = errorMarkup;
  overviewPanel.innerHTML = errorMarkup;
  latestUpdatePanel.innerHTML = errorMarkup;
  flowPanel.innerHTML = errorMarkup;
  architecturePanel.innerHTML = errorMarkup;
  controlsPanel.innerHTML = errorMarkup;
  principlesPanel.innerHTML = errorMarkup;
}

function cleanInlineMarkdown(value) {
  return value
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}