// HUD updates
import { config, sandboxModes, moduleConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, moduleState, sandbox, matchState, survivalState, input, allyBot, teamEnemies } from "../state.js";
import { loadout, uiState } from "../state/app-state.js";
import * as dom from "../dom.js";
import { clamp } from "../utils.js";
import { sanitizeIconClass } from "../utils.js";
import { getMapLayout } from "../maps.js";
import { getBuildStats, hasImplant, getModuleBySlot, getActiveDashCooldown, getPulseMagazineSize, getSelectedRuneUltimateTree, getStatusDuration } from "../build/loadout.js";
import { getAllBots, getPrimaryBot, isCombatLive } from "./combat.js";

const {
  mapName,
  mapStatus,
  roundLabel,
  matchScore,
  matchFormat,
  roundBannerLabel,
  roundBannerTitle,
  roundBanner,
  weaponName,
  weaponIcon,
  weaponStatus,
  weaponRole,
  weaponMeter,
  playerHealthFill,
  playerHealthText,
  playerBuildTag,
  slotDash,
  slotDashIcon,
  slotDashName,
  slotDashOverlay,
  slotDashTimer,
  slotModule1,
  slotModule1Icon,
  slotModule1Name,
  slotModule1Overlay,
  slotModule1Timer,
  slotModule2,
  slotModule2Icon,
  slotModule2Name,
  slotModule2Overlay,
  slotModule2Timer,
  slotModule3,
  slotModule3Icon,
  slotModule3Name,
  slotModule3Overlay,
  slotModule3Timer,
  coreSlot,
  coreSlotIcon,
  coreSlotName,
  coreSlotOverlay,
  coreSlotTimer,
} = dom;

export function updateHud() {
  const bottomHud = document.querySelector('.bottom-hud');
  if (bottomHud) {
    // Sync sandbox mode to shell as a class so CSS can handle visibility
    dom.gameShell.classList.toggle("is-training", sandbox.mode === "training");
    dom.gameShell.classList.toggle("is-duel", sandbox.mode === "duel");
  }

  const weaponReady = player.fireCooldown <= 0 && player.reloadTime <= 0;
  const activeWeapon = weapons[player.weapon] ?? weapons.pulse;
  const activeMode = sandboxModes[sandbox.mode];
  const activeLayout = getMapLayout(sandbox.mode);
  const buildStats = getBuildStats();
  const slotAbilities = [getModuleBySlot(0), getModuleBySlot(1), getModuleBySlot(2)];
  const selectedUltimate = content.cores[loadout.core] ?? content.cores.phantomCore;
  mapName.textContent = activeLayout.name ?? activeMode.name;
  mapStatus.textContent = activeLayout.subtitle ?? activeMode.subtitle;
  roundLabel.textContent =
    sandbox.mode === sandboxModes.duel.key
      ? `Round ${matchState.roundNumber}`
      : sandbox.mode === sandboxModes.teamDuel.key
        ? `Squad Round ${matchState.roundNumber}`
      : sandbox.mode === sandboxModes.survival.key
        ? `Wave ${survivalState.wave}`
        : "Practice";
  matchScore.textContent =
    sandbox.mode === sandboxModes.duel.key
      ? `${matchState.playerRounds} - ${matchState.enemyRounds}`
      : sandbox.mode === sandboxModes.teamDuel.key
        ? `${matchState.playerRounds} - ${matchState.enemyRounds}`
      : sandbox.mode === sandboxModes.survival.key
        ? `${survivalState.waveKills}/${Math.max(1, survivalState.waveTargetKills)}`
        : `${getAllBots().filter((bot) => bot.alive).length} targets`;
  matchFormat.textContent =
    sandbox.mode === sandboxModes.duel.key
      ? "BO3"
      : sandbox.mode === sandboxModes.teamDuel.key
        ? "2V2"
      : sandbox.mode === sandboxModes.survival.key
        ? `${survivalState.totalKills} KOs`
        : "Training";
  roundBannerLabel.textContent = matchState.bannerLabel;
  roundBannerTitle.textContent = matchState.bannerTitle;
  roundBanner.classList.toggle("visible", matchState.bannerVisible);
  roundBanner.classList.toggle("countdown", matchState.bannerStyle === "countdown");
  roundBanner.classList.toggle("fight", matchState.bannerStyle === "fight");
  weaponName.textContent = activeWeapon.name;
  if (activeWeapon.iconImg) {
    weaponIcon.className = `content-icon has-img-icon${activeWeapon.category ? ` content-icon--${activeWeapon.category}` : ""}`;
    weaponIcon.style.backgroundImage = `url("${activeWeapon.iconImg}")`;
  } else {
    weaponIcon.className = `content-icon content-icon--${sanitizeIconClass(activeWeapon.icon)}`;
    weaponIcon.style.backgroundImage = "";
  }
  if (weaponRole) {
    weaponRole.textContent =
      player.weapon === weapons.sniper.key
        ? "Charge to punish space. Distance adds kill pressure."
        : player.weapon === weapons.axe.key
          ? "Heavy three-hit brawl chain with stun finisher."
            : player.weapon === weapons.shotgun.key
              ? "Explosive close punish with weak long trades."
            : player.weapon === weapons.cannon.key
              ? "Cursor-placed artillery. Hold to overload a burn zone."
              : activeWeapon.rangeProfile ?? activeWeapon.slotLabel ?? "";
  }
  weaponStatus.textContent =
    player.weapon === weapons.pulse.key && player.reloadTime > 0
      ? `Reload ${player.reloadTime.toFixed(1)}s`
      : player.weapon === weapons.pulse.key
        ? `Ammo ${player.ammo}/${getPulseMagazineSize()}`
      : player.weapon === weapons.axe.key && player.comboTimer > 0
        ? `Combo ${player.comboStep}/3 | ${player.comboTimer.toFixed(1)}s memory`
      : player.weapon === weapons.sniper.key
        ? player.weaponChargeActive
          ? `Charge ${Math.round(player.weaponCharge * 100)}%`
          : weaponReady
            ? "Rail primed"
            : `Rechamber ${player.fireCooldown.toFixed(2)}s`
      : player.weapon === weapons.staff.key
        ? weaponReady
          ? "Sustain beam ready"
          : `Cycling ${player.fireCooldown.toFixed(2)}s`
      : player.weapon === weapons.injector.key
        ? weaponReady
          ? "Marks armed"
          : `Injecting ${player.fireCooldown.toFixed(2)}s`
      : player.weapon === weapons.lance.key
        ? weaponReady
          ? input.altFiring
            ? "Drive primed"
            : "Thrust ready"
          : `Recover ${player.fireCooldown.toFixed(2)}s`
      : player.weapon === weapons.cannon.key
        ? weaponReady
          ? player.weaponChargeActive
            ? `Overload ${Math.round(player.weaponCharge * 100)}%`
            : "Shell loaded"
          : `Breach ${player.fireCooldown.toFixed(2)}s`
      : weaponReady
        ? "Ready"
        : `Cooling ${player.fireCooldown.toFixed(2)}s`;
  if (player.precisionMomentumStacks > 0) {
    weaponStatus.textContent = `${weaponStatus.textContent} | Momentum x${player.precisionMomentumStacks}`;
  }
    if (playerBuildTag) {
      playerBuildTag.textContent = "";
    }

    // Dash gauge: represents the progress of the next charge. 
    // If 2 charges, it's 100%. If 1 charge + recharging, it's progress. 
    // If it's used, rechargeTimer starts high, so dashRatio starts low (empties).
    const maxDashCd = getActiveDashCooldown() || 1.5;
    const dashRatio = moduleState.dash.charges >= 2 ? 1 : Math.max(0, Math.min(1, 1 - moduleState.dash.rechargeTimer / maxDashCd));
    
    weaponMeter.style.width = `${dashRatio * 100}%`;
    weaponMeter.style.background = "linear-gradient(90deg, rgba(82, 196, 248, 0.45) 0%, rgba(82, 196, 248, 0.98) 100%)";
  weaponMeter.style.boxShadow =
    player.weapon === weapons.axe.key
      ? "0 0 14px rgba(158, 247, 199, 0.24)"
      : player.weapon === weapons.shotgun.key
        ? "0 0 14px rgba(255, 157, 98, 0.24)"
      : player.weapon === weapons.sniper.key
        ? "0 0 14px rgba(255, 211, 117, 0.24)"
      : player.weapon === weapons.staff.key
        ? "0 0 14px rgba(149, 255, 180, 0.24)"
      : player.weapon === weapons.injector.key
        ? "0 0 14px rgba(216, 140, 255, 0.24)"
      : player.weapon === weapons.lance.key
        ? "0 0 14px rgba(255, 226, 124, 0.24)"
      : player.weapon === weapons.cannon.key
        ? "0 0 14px rgba(255, 177, 106, 0.24)"
      : "0 0 14px rgba(119, 216, 255, 0.25)";
  playerHealthFill.style.width = `${(player.hp / buildStats.maxHp) * 100}%`;
  playerHealthText.textContent = sandbox.mode === sandboxModes.teamDuel.key
    ? `You ${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""} | Ally ${allyBot?.alive ? `${Math.ceil(allyBot.hp)} / ${Math.ceil(allyBot.maxHp)}` : "Down"}`
    : player.lastStandTime > 0
      ? `${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""} | OVERLOAD ${player.lastStandTime.toFixed(1)}s`
      : `${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""}`;

    const slotPerkIcon = document.getElementById("slot-perk-icon");
    if (slotPerkIcon && loadout.implants && loadout.implants[0]) {
      const currentPerk = content.implants[loadout.implants[0]];
      // Pass a dummy object for slotName if it doesn't exist to avoid errors in setHudSlotPresentation
      setHudSlotPresentation(slotPerkIcon, { textContent: "" }, currentPerk);
    }
  
    setHudSlotPresentation(slotModule1Icon, slotModule1Name, slotAbilities[0] ?? content.modules.boltLinkJavelin);
  setHudSlotPresentation(slotModule2Icon, slotModule2Name, slotAbilities[1] ?? content.modules.orbitalDistorter);
  setHudSlotPresentation(slotModule3Icon, slotModule3Name, slotAbilities[2] ?? content.modules.hexPlateProjector);
  setHudSlotPresentation(coreSlotIcon, coreSlotName, selectedUltimate);

    updateAbilitySlot(slotModule1, slotModule1Overlay, slotModule1Timer, getAbilityHudState(slotAbilities[0]?.key));
  updateAbilitySlot(slotModule2, slotModule2Overlay, slotModule2Timer, getAbilityHudState(slotAbilities[1]?.key));
  updateAbilitySlot(slotModule3, slotModule3Overlay, slotModule3Timer, getAbilityHudState(slotAbilities[2]?.key));
  updateAbilitySlot(coreSlot, coreSlotOverlay, coreSlotTimer, {
    ready: moduleState.core.cooldown <= 0,
    charging: false,
    cooldownRatio: moduleState.core.cooldown <= 0 ? 0 : moduleState.core.cooldown / config.ultimateCooldown,
    timer: moduleState.core.cooldown <= 0 ? "" : moduleState.core.cooldown.toFixed(1),
  });
}

export function updateAbilitySlot(slot, overlay, timerLabel, state) {
  slot.classList.toggle("ready", state.ready);
  slot.classList.toggle("charging", state.charging);
  slot.classList.toggle("recast", !!state.recast);
  slot.classList.toggle("cooling", !state.ready && !state.charging && !state.recast);
  
  const clampedRatio = Math.max(0, Math.min(1, state.cooldownRatio ?? 1));
  const degrees = Math.round(clampedRatio * 360);
  
  // Reverse sweep logic: the dark overlay now occupies the degrees remaining, 
  // wiping clear in the opposite direction.
  const shadowColor = state.recast ? "rgba(43, 137, 226, 0.44)" : "rgba(0, 0, 0, 0.72)";
  overlay.style.background = `conic-gradient(${shadowColor} ${degrees}deg, transparent 0)`;
  
  overlay.style.opacity = state.ready && !state.charging ? "0" : "1";
  
  // Suppress text label if in recast (purely visual blue sweep)
  timerLabel.textContent = state.recast ? "" : state.timer;
}

export function getAbilityHudState(abilityKey) {
  switch (abilityKey) {
    case "dash": {
      const ready = moduleState.dash.charges > 0;
      return {
        ready,
        charging: moduleState.dash.inputHeld && moduleState.dash.activeTime <= 0,
        cooldownRatio: ready ? 0 : Math.max(0, Math.min(1, moduleState.dash.rechargeTimer / getActiveDashCooldown())),
        timer: moduleState.dash.activeTime > 0 ? "GO" : ready ? "" : moduleState.dash.rechargeTimer.toFixed(1),
      };
    }
    case "boltLinkJavelin":
      return {
        ready: moduleState.boltLinkJavelin.cooldown <= 0 && !moduleState.boltLinkJavelin.pendingCooldown && !moduleState.boltLinkJavelin.recastReady,
        recast: moduleState.boltLinkJavelin.recastReady,
        charging: false,
        cooldownRatio:
          moduleState.boltLinkJavelin.recastReady
            ? 1 - (moduleState.boltLinkJavelin.activeTime / getStatusDuration(config.boltLinkJavelinSlowDuration))
            : moduleState.boltLinkJavelin.pendingCooldown
              ? Math.max(0, Math.min(1, moduleState.boltLinkJavelin.activeTime / Math.max(0.001, config.boltLinkJavelinSlowDuration)))
            : moduleState.boltLinkJavelin.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, moduleState.boltLinkJavelin.cooldown / moduleConfig.boltLinkJavelin.cooldown)),
        timer: moduleState.boltLinkJavelin.recastReady
          ? ""
          : moduleState.boltLinkJavelin.pendingCooldown
            ? moduleState.boltLinkJavelin.activeTime.toFixed(1)
          : moduleState.boltLinkJavelin.cooldown <= 0
            ? ""
            : moduleState.boltLinkJavelin.cooldown.toFixed(1),
      };
    case "orbitalDistorter":
      return {
        ready: moduleState.orbitalDistorter.cooldown <= 0,
        charging: moduleState.orbitalDistorter.charging,
        cooldownRatio:
          moduleState.orbitalDistorter.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, moduleState.orbitalDistorter.cooldown / moduleConfig.orbitalDistorter.cooldown)),
        timer: moduleState.orbitalDistorter.charging
          ? moduleState.orbitalDistorter.chargeTime >= config.orbitalDistorterChargeThreshold
            ? "MAX"
            : "..."
          : moduleState.orbitalDistorter.cooldown <= 0
            ? ""
            : moduleState.orbitalDistorter.cooldown.toFixed(1),
      };
    case "vGripHarpoon":
      return {
        ready: moduleState.vGripHarpoon.cooldown <= 0 && moduleState.vGripHarpoon.phase === "idle",
        charging: moduleState.vGripHarpoon.phase === "flying" || moduleState.vGripHarpoon.phase === "pull",
        cooldownRatio: moduleState.vGripHarpoon.cooldown <= 0 ? 0 : moduleState.vGripHarpoon.cooldown / config.vGripHarpoonCooldown,
        timer:
          moduleState.vGripHarpoon.phase === "pull"
            ? "CUT"
            : moduleState.vGripHarpoon.phase === "flying"
              ? "HOOK"
              : moduleState.vGripHarpoon.cooldown <= 0
                ? ""
                : moduleState.vGripHarpoon.cooldown.toFixed(1),
      };
    case "hexPlateProjector": {
      const cdValue = isNaN(moduleState.hexPlateProjector.cooldown) ? 0 : moduleState.hexPlateProjector.cooldown;
      const baseCd = config.hexPlateProjectorCooldown || 5.8;
      return {
        ready: cdValue <= 0,
        charging: false,
        cooldownRatio: cdValue <= 0 ? 0 : cdValue / baseCd,
        timer: cdValue <= 0 ? "" : cdValue.toFixed(1),
      };
    }
    case "reflexAegis": {
      const locked =
        moduleState.reflexAegis.startupTime > 0 ||
        moduleState.reflexAegis.activeTime > 0 ||
        moduleState.reflexAegis.recoveryTime > 0;
      return {
        ready: moduleState.reflexAegis.cooldown <= 0 && !locked,
        charging: moduleState.reflexAegis.startupTime > 0 || moduleState.reflexAegis.activeTime > 0,
        cooldownRatio:
          moduleState.reflexAegis.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, moduleState.reflexAegis.cooldown / config.reflexAegisCooldown)),
        timer:
          moduleState.reflexAegis.activeTime > 0
            ? "PARRY"
            : moduleState.reflexAegis.recoveryTime > 0
              ? "FAIL"
              : moduleState.reflexAegis.startupTime > 0
                ? "SET"
                : (isNaN(moduleState.reflexAegis.cooldown) || moduleState.reflexAegis.cooldown <= 0)
                  ? ""
                  : moduleState.reflexAegis.cooldown.toFixed(1),
      };
    }
    case "emPulseEmitter":
      const emCd = isNaN(moduleState.emPulseEmitter.cooldown) ? 0 : moduleState.emPulseEmitter.cooldown;
      return {
        ready: emCd <= 0,
        charging: false,
        cooldownRatio: emCd <= 0 ? 0 : emCd / (config.emPulseEmitterCooldown || 8),
        timer: emCd <= 0 ? "" : emCd.toFixed(1),
      };
    case "jetBackThruster":
      return {
        ready: moduleState.jetBackThruster.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.jetBackThruster.cooldown <= 0 ? 0 : moduleState.jetBackThruster.cooldown / 3.6,
        timer: moduleState.jetBackThruster.cooldown <= 0 ? "" : moduleState.jetBackThruster.cooldown.toFixed(1),
      };
    case "chainLightning":
      return {
        ready: moduleState.chainLightning.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.chainLightning.cooldown <= 0 ? 0 : moduleState.chainLightning.cooldown / 5.4,
        timer: moduleState.chainLightning.cooldown <= 0 ? "" : moduleState.chainLightning.cooldown.toFixed(1),
      };
    case "blink":
      return {
        ready: moduleState.blink.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.blink.cooldown <= 0 ? 0 : moduleState.blink.cooldown / 3.4,
        timer: moduleState.blink.cooldown <= 0 ? "" : moduleState.blink.cooldown.toFixed(1),
      };
    case "phaseDash":
      return {
        ready: moduleState.phaseDash.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.phaseDash.cooldown <= 0 ? 0 : moduleState.phaseDash.cooldown / 4.6,
        timer: moduleState.phaseDash.time > 0 ? "PHASE" : moduleState.phaseDash.cooldown <= 0 ? "" : moduleState.phaseDash.cooldown.toFixed(1),
      };
    case "swarmMissileRack":
      return {
        ready: moduleState.swarmMissileRack.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.swarmMissileRack.cooldown <= 0 ? 0 : moduleState.swarmMissileRack.cooldown / config.swarmMissileRackCooldown,
        timer: moduleState.swarmMissileRack.cooldown <= 0 ? "" : moduleState.swarmMissileRack.cooldown.toFixed(1),
      };
    case "railShot":
      return {
        ready: moduleState.railShot.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.railShot.cooldown <= 0 ? 0 : moduleState.railShot.cooldown / 5.1,
        timer: moduleState.railShot.cooldown <= 0 ? "" : moduleState.railShot.cooldown.toFixed(1),
      };
    case "voidCoreSingularity":
      return {
        ready: moduleState.voidCoreSingularity.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.voidCoreSingularity.cooldown <= 0 ? 0 : moduleState.voidCoreSingularity.cooldown / config.voidCoreSingularityCooldown,
        timer: moduleState.voidCoreSingularity.cooldown <= 0 ? "" : moduleState.voidCoreSingularity.cooldown.toFixed(1),
      };
    case "ghostDriftModule":
      return {
        ready: moduleState.ghostDriftModule.cooldown <= 0,
        charging: moduleState.ghostDriftModule.time > 0,
        cooldownRatio: moduleState.ghostDriftModule.cooldown <= 0 ? 0 : moduleState.ghostDriftModule.cooldown / config.phaseShiftCooldown,
        timer: moduleState.ghostDriftModule.time > 0 ? "SHIFT" : moduleState.ghostDriftModule.cooldown <= 0 ? "" : moduleState.ghostDriftModule.cooldown.toFixed(1),
      };
    case "spectreProjector":
      return {
        ready: moduleState.spectreProjector.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.spectreProjector.cooldown <= 0 ? 0 : moduleState.spectreProjector.cooldown / 6.2,
        timer: moduleState.spectreProjector.cooldown <= 0 ? "" : moduleState.spectreProjector.cooldown.toFixed(1),
      };
    case "overdriveServos":
      return {
        ready: moduleState.overdriveServos.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.overdriveServos.cooldown <= 0 ? 0 : moduleState.overdriveServos.cooldown / 4.2,
        timer: moduleState.overdriveServos.cooldown <= 0 ? "" : moduleState.overdriveServos.cooldown.toFixed(1),
      };
    default:
      return { ready: false, charging: false, cooldownRatio: 1, timer: "NA" };
  }
}

export function setHudSlotPresentation(slotIcon, slotName, ability) {
  if (!slotIcon || !slotName || !ability) {
    return;
  }
  if (ability.iconImg) {
    slotIcon.className = `ability-slot__icon content-icon has-img-icon${ability.category ? ` content-icon--${ability.category}` : ""}`;
    slotIcon.style.backgroundImage = `url("${ability.iconImg}")`;
  } else {
    slotIcon.className = `ability-slot__icon content-icon content-icon--${sanitizeIconClass(ability.icon)}`;
    slotIcon.style.backgroundImage = "";
  }
  if (slotName && typeof slotName === 'object' && 'textContent' in slotName) {
    slotName.textContent = ability.name;
  }
}

