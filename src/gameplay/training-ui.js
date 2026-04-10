import { sandboxModes, config } from "../config.js";
import { sandbox, trainingBots, abilityState, player } from "../state.js";
import { trainingToolState } from "../state/app-state.js";
import { resetBotsForMode } from "./combat.js";
import { statusLine } from "../dom.js";
import { playUiCue, unlockAudio } from "../audio.js";

// DOM Elements
const trainingPanel = document.getElementById("training-tools-panel");
const respawnBtn = document.getElementById("tt-respawn-btn");
const toggleFireBtn = document.getElementById("tt-toggle-fire-btn");
const resetCdBtn = document.getElementById("tt-reset-cd-btn");
const modifyBotBtn = document.getElementById("tt-modify-bot-btn");
const selectedBotLabel = document.getElementById("tt-selected-bot-label");
const botSliders = document.getElementById("tt-bot-sliders");

const indivFireBtn = document.getElementById("tt-bot-fire-btn");

const hpSlider = document.getElementById("tt-hp-slider");
const hpVal = document.getElementById("tt-hp-val");

const armorSlider = document.getElementById("tt-armor-slider");
const armorVal = document.getElementById("tt-armor-val");

const tenacitySlider = document.getElementById("tt-tenacity-slider");
const tenacityVal = document.getElementById("tt-tenacity-val");

function updatePanelVisibility() {
  if (!trainingPanel) return;
  if (sandbox.mode === sandboxModes.training.key) {
    trainingPanel.classList.remove("is-hidden");
  } else {
    trainingPanel.classList.add("is-hidden");
  }
}

setInterval(updatePanelVisibility, 200);

respawnBtn?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("confirm");
  resetBotsForMode(sandboxModes.training.key);
  statusLine.textContent = "Training bots respawned with active configs.";
});

function refreshBotFireCooldowns() {
  for (const bot of trainingBots) {
    const override = trainingToolState.botOverrides[bot.kind];
    let isFiring = trainingToolState.botsFire;
    if (override && override.canFire && override.canFire !== "default") {
      isFiring = override.canFire === "on";
    }
    bot.shootCooldown = isFiring ? 0.35 + trainingBots.indexOf(bot) * 0.08 : 999;
  }
}

toggleFireBtn?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("click");
  trainingToolState.botsFire = !trainingToolState.botsFire;
  toggleFireBtn.textContent = trainingToolState.botsFire ? "Atk: ON" : "Atk: OFF";
  refreshBotFireCooldowns();
  statusLine.textContent = trainingToolState.botsFire ? "Global bot fire enabled." : "Global bot fire disabled.";
});

resetCdBtn?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("click");
  player.fireCooldown = 0;
  abilityState.boltLinkJavelin.cooldown = 0;
  abilityState.orbitalDistorter.cooldown = 0;
  abilityState.hexPlateProjector.cooldown = 0;
  abilityState.core.cooldown = 0;
  abilityState.reflexAegis.cooldown = 0;
  abilityState.dash.charges = config.baseDashCharges || 2;
  statusLine.textContent = "Cooldowns reset.";
});

modifyBotBtn?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("click");
  trainingToolState.trainingConfig.isSelecting = true;
  statusLine.textContent = "Select a bot with your cursor.";
  modifyBotBtn.textContent = "Selecting...";
});

function updateIndivFireButtonLabel() {
  const kind = trainingToolState.trainingConfig.selectedBotId;
  const overrides = trainingToolState.botOverrides[kind];
  if (!indivFireBtn || !overrides) return;
  
  if (overrides.canFire === "on") indivFireBtn.textContent = "Indiv Atk: ON";
  else if (overrides.canFire === "off") indivFireBtn.textContent = "Indiv Atk: OFF";
  else indivFireBtn.textContent = "Indiv Atk: Default";
}

document.addEventListener("training-bot-selected", (e) => {
  const kind = e.detail;
  trainingToolState.trainingConfig.isSelecting = false;
  
  if (modifyBotBtn) modifyBotBtn.textContent = "Modify Bot (Click)";
  if (selectedBotLabel) selectedBotLabel.textContent = `Bot: ${kind}`;
  
  if (!trainingToolState.botOverrides[kind]) {
    trainingToolState.botOverrides[kind] = {
      maxHp: 140,
      armor: 0,
      tenacity: 0,
      canFire: "default"
    };
  }
  
  if (!trainingToolState.botOverrides[kind].canFire) {
    trainingToolState.botOverrides[kind].canFire = "default";
  }
  
  const overrides = trainingToolState.botOverrides[kind];
  updateIndivFireButtonLabel();
  
  if (hpSlider && hpVal) {
    hpSlider.value = overrides.maxHp;
    hpVal.textContent = overrides.maxHp;
  }
  
  if (armorSlider && armorVal) {
    armorSlider.value = overrides.armor;
    armorVal.textContent = overrides.armor;
  }
  
  if (tenacitySlider && tenacityVal) {
    tenacitySlider.value = overrides.tenacity;
    tenacityVal.textContent = overrides.tenacity;
  }
  
  botSliders?.classList.remove("is-hidden");
});

indivFireBtn?.addEventListener("click", () => {
  unlockAudio();
  playUiCue("click");
  const kind = trainingToolState.trainingConfig.selectedBotId;
  if (!kind) return;
  const overrides = trainingToolState.botOverrides[kind];
  if (!overrides) return;
  
  if (overrides.canFire === "default") overrides.canFire = "on";
  else if (overrides.canFire === "on") overrides.canFire = "off";
  else overrides.canFire = "default";
  
  updateIndivFireButtonLabel();
  refreshBotFireCooldowns();
  
  statusLine.textContent = `Bot ${kind} attack state set to ${overrides.canFire}.`;
});

function applyCurrentSliderToBot() {
  const kind = trainingToolState.trainingConfig.selectedBotId;
  if (!kind) return;
  
  const overrides = trainingToolState.botOverrides[kind];
  if (!overrides) return;
  
  if (hpSlider) overrides.maxHp = parseInt(hpSlider.value);
  if (armorSlider) overrides.armor = parseInt(armorSlider.value);
  if (tenacitySlider) overrides.tenacity = parseInt(tenacitySlider.value);
  
  if (hpVal) hpVal.textContent = overrides.maxHp;
  if (armorVal) armorVal.textContent = overrides.armor;
  if (tenacityVal) tenacityVal.textContent = overrides.tenacity;
  
  const activeBot = trainingBots.find(b => b.kind === kind);
  if (activeBot) {
    activeBot.maxHp = overrides.maxHp;
    activeBot.hp = Math.min(activeBot.hp, overrides.maxHp);
    activeBot.armor = overrides.armor;
    activeBot.tenacity = overrides.tenacity;
  }
}

hpSlider?.addEventListener("input", applyCurrentSliderToBot);
armorSlider?.addEventListener("input", applyCurrentSliderToBot);
tenacitySlider?.addEventListener("input", applyCurrentSliderToBot);
