// HUD updates
import { config, sandboxModes, moduleConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, moduleState, sandbox, matchState, survivalState, input, allyBot, teamEnemies } from "../state.js";
import { loadout } from "../state/app-state.js";
import * as dom from "../dom.js";
import { clamp } from "../utils.js";
import { sanitizeIconClass } from "../utils.js";
import { getMapLayout } from "../maps.js";
import { getBuildStats, hasImplant, getModuleBySlot, getActiveDashCooldown, getPulseMagazineSize, getSelectedRuneCoreTree, getStatusDuration } from "../build/loadout.js";
import { getAllBots, getPrimaryBot } from "./combat.js";

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
  enemyHealthFill,
  playerHealthText,
  enemyHealthText,
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
  const weaponReady = player.fireCooldown <= 0 && player.reloadTime <= 0;
  const activeWeapon = weapons[player.weapon] ?? weapons.pulse;
  const activeMode = sandboxModes[sandbox.mode];
  const activeLayout = getMapLayout(sandbox.mode);
  const primaryBot = getPrimaryBot();
  const buildStats = getBuildStats();
  const slotModules = [getModuleBySlot(0), getModuleBySlot(1), getModuleBySlot(2)];
  const selectedUltimate = content.cores[loadout.core] ?? content.cores.phantomCore;
  const activeEnemies = sandbox.mode === sandboxModes.teamDuel.key ? teamEnemies.filter(Boolean) : [];
  const livingEnemies = activeEnemies.filter((bot) => bot.alive);
  const teamEnemyRatio = activeEnemies.length
    ? activeEnemies.reduce((sum, bot) => sum + Math.max(0, bot.hp) / Math.max(1, bot.maxHp), 0) / activeEnemies.length
    : 0;
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
  weaponIcon.className = `content-icon content-icon--${sanitizeIconClass(activeWeapon.icon)}`;
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
    const keystoneTree = getSelectedRuneCoreTree();
    const keystoneName = keystoneTree ? content.runeTrees[keystoneTree]?.nodes.ultimate.name : "No keystone";
    const perkName = content.implants[loadout.implants[0]]?.name ?? "No implant";
    playerBuildTag.textContent = player.lastStandTime > 0
      ? `${keystoneName} | ${perkName} | OVERLOAD ${player.lastStandTime.toFixed(1)}s`
      : `${keystoneName} | ${perkName}`;
    if (player.reflexAegisHitBonusTime > 0 && player.reflexAegisHitBonusDamage > 0) {
      playerBuildTag.textContent = `${playerBuildTag.textContent} | Counter +${Math.round(player.reflexAegisHitBonusDamage)}`;
    }
  }
  const pulseMeterRatio = player.reloadTime > 0
    ? 1 - player.reloadTime / config.pulseReloadTime
    : player.ammo / getPulseMagazineSize();
  const sniperMeterRatio = player.weaponChargeActive
    ? player.weaponCharge
    : 1 - player.fireCooldown / Math.max(0.001, config.sniperBaseCooldown);
  const cannonMeterRatio = player.weaponChargeActive
    ? player.weaponCharge
    : 1 - player.fireCooldown / Math.max(0.001, config.cannonPrimaryCooldown);
  weaponMeter.style.width = `${
    Math.max(
      0,
      Math.min(
        100,
        (
          player.weapon === weapons.pulse.key
            ? pulseMeterRatio
            : player.weapon === weapons.sniper.key
              ? sniperMeterRatio
            : player.weapon === weapons.cannon.key
              ? cannonMeterRatio
            : 1 - player.fireCooldown / activeWeapon.cooldown
        ) * 100,
      ),
    )
  }%`;
  weaponMeter.style.background =
    player.weapon === weapons.axe.key
      ? "linear-gradient(90deg, rgba(158, 247, 199, 0.45), rgba(158, 247, 199, 0.98))"
      : player.weapon === weapons.shotgun.key
        ? "linear-gradient(90deg, rgba(255, 157, 98, 0.45), rgba(255, 157, 98, 0.98))"
      : player.weapon === weapons.sniper.key
        ? "linear-gradient(90deg, rgba(255, 211, 117, 0.45), rgba(255, 211, 117, 0.98))"
      : player.weapon === weapons.staff.key
        ? "linear-gradient(90deg, rgba(149, 255, 180, 0.45), rgba(149, 255, 180, 0.98))"
      : player.weapon === weapons.injector.key
        ? "linear-gradient(90deg, rgba(216, 140, 255, 0.45), rgba(216, 140, 255, 0.98))"
      : player.weapon === weapons.lance.key
        ? "linear-gradient(90deg, rgba(255, 226, 124, 0.45), rgba(255, 226, 124, 0.98))"
      : player.weapon === weapons.cannon.key
        ? "linear-gradient(90deg, rgba(255, 177, 106, 0.45), rgba(255, 177, 106, 0.98))"
      : "linear-gradient(90deg, rgba(119, 216, 255, 0.4), rgba(119, 216, 255, 0.95))";
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
  enemyHealthFill.style.width = sandbox.mode === sandboxModes.teamDuel.key
    ? `${teamEnemyRatio * 100}%`
    : primaryBot
      ? `${(Math.max(0, primaryBot.hp) / primaryBot.maxHp) * 100}%`
      : "0%";
  playerHealthText.textContent = sandbox.mode === sandboxModes.teamDuel.key
    ? `You ${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""} | Ally ${allyBot?.alive ? `${Math.ceil(allyBot.hp)} / ${Math.ceil(allyBot.maxHp)}` : "Down"}`
    : player.lastStandTime > 0
      ? `${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""} | OVERLOAD ${player.lastStandTime.toFixed(1)}s`
      : `${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""}`;
  enemyHealthText.textContent = sandbox.mode === sandboxModes.teamDuel.key
    ? activeEnemies.length
      ? activeEnemies.map((bot, index) => `E${index + 1} ${bot.alive ? `${Math.ceil(bot.hp)} / ${Math.ceil(bot.maxHp)}` : "Down"}`).join(" | ")
      : "--"
    : primaryBot
      ? primaryBot.alive
        ? `${Math.ceil(primaryBot.hp)} / ${primaryBot.maxHp}`
        : "Down"
      : "--";

  setHudSlotPresentation(slotDashIcon, slotDashName, { icon: "module-dash", name: "Dash" });
  setHudSlotPresentation(slotModule1Icon, slotModule1Name, slotModules[0] ?? content.modules.boltLinkJavelin);
  setHudSlotPresentation(slotModule2Icon, slotModule2Name, slotModules[1] ?? content.modules.orbitalDistorter);
  setHudSlotPresentation(slotModule3Icon, slotModule3Name, slotModules[2] ?? content.modules.hexPlateProjector);
  setHudSlotPresentation(coreSlotIcon, coreSlotName, selectedUltimate);

  updateModuleSlot(slotDash, slotDashOverlay, slotDashTimer, getModuleHudState("dash"));
  updateModuleSlot(slotModule1, slotModule1Overlay, slotModule1Timer, getModuleHudState(slotModules[0]?.key));
  updateModuleSlot(slotModule2, slotModule2Overlay, slotModule2Timer, getModuleHudState(slotModules[1]?.key));
  updateModuleSlot(slotModule3, slotModule3Overlay, slotModule3Timer, getModuleHudState(slotModules[2]?.key));
  updateModuleSlot(coreSlot, coreSlotOverlay, coreSlotTimer, {
    ready: moduleState.core.cooldown <= 0,
    charging: false,
    cooldownRatio: moduleState.core.cooldown <= 0 ? 0 : moduleState.core.cooldown / config.ultimateCooldown,
    timer: moduleState.core.cooldown <= 0 ? "" : moduleState.core.cooldown.toFixed(1),
  });
}

export function updateModuleSlot(slot, overlay, timerLabel, state) {
  slot.classList.toggle("ready", state.ready);
  slot.classList.toggle("charging", state.charging);
  slot.classList.toggle("recast", !!state.recast);
  slot.classList.toggle("cooling", !state.ready && !state.charging && !state.recast);
  const clampedRatio = Math.max(0, Math.min(1, state.cooldownRatio ?? 1));
  const cooldownDegrees = Math.round(clampedRatio * 360);
  const clearDegrees = 360 - cooldownDegrees;
  const shadowColor = state.charging ? "rgba(55, 33, 10, 0.82)" : "rgba(6, 10, 14, 0.88)";
  const clearColor = state.charging ? "rgba(55, 33, 10, 0.16)" : "rgba(6, 10, 14, 0.12)";
  overlay.style.background = `conic-gradient(from -90deg, ${clearColor} 0deg ${clearDegrees}deg, ${shadowColor} ${clearDegrees}deg 360deg)`;
  overlay.style.opacity = state.ready && !state.charging ? "0" : "1";
  timerLabel.textContent = state.timer;
}

export function getModuleHudState(moduleKey) {
  switch (moduleKey) {
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
            ? 1 - (moduleState.boltLinkJavelin.activeTime / getStatusDuration(config.javelinSlowDuration))
            : moduleState.boltLinkJavelin.pendingCooldown
              ? Math.max(0, Math.min(1, moduleState.boltLinkJavelin.activeTime / Math.max(0.001, config.javelinSlowDuration)))
            : moduleState.boltLinkJavelin.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, moduleState.boltLinkJavelin.cooldown / moduleConfig.javelin.cooldown)),
        timer: moduleState.boltLinkJavelin.recastReady
          ? "RECAST"
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
          ? moduleState.orbitalDistorter.chargeTime >= moduleConfig.field.chargeThreshold
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
    case "hexPlateProjector":
      return {
        ready: moduleState.hexPlateProjector.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.hexPlateProjector.cooldown <= 0 ? 0 : moduleState.hexPlateProjector.cooldown / config.shieldCooldown,
        timer: moduleState.hexPlateProjector.cooldown <= 0 ? "" : moduleState.hexPlateProjector.cooldown.toFixed(1),
      };
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
                : moduleState.reflexAegis.cooldown <= 0
                  ? ""
                  : moduleState.reflexAegis.cooldown.toFixed(1),
      };
    }
    case "emPulseEmitter":
      return {
        ready: moduleState.emPulseEmitter.cooldown <= 0,
        charging: false,
        cooldownRatio: moduleState.emPulseEmitter.cooldown <= 0 ? 0 : moduleState.emPulseEmitter.cooldown / config.boosterCooldown,
        timer: moduleState.emPulseEmitter.cooldown <= 0 ? "" : moduleState.emPulseEmitter.cooldown.toFixed(1),
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

export function setHudSlotPresentation(slotIcon, slotName, module) {
  if (!slotIcon || !slotName || !module) {
    return;
  }
  slotIcon.className = `module-slot__icon content-icon content-icon--${sanitizeIconClass(module.icon)}`;
  slotName.textContent = module.name;
}

