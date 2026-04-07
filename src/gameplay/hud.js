// HUD updates
import { config, sandboxModes, abilityConfig } from "../config.js";
import { content, weapons } from "../content.js";
import { player, enemy, abilityState, loadout, sandbox, matchState, survivalState, input } from "../state.js";
import * as dom from "../dom.js";
import { clamp } from "../utils.js";
import { sanitizeIconClass } from "../utils.js";
import { getMapLayout } from "../maps.js";
import { getBuildStats, hasPerk, getAbilityBySlot, getActiveDashCooldown, getPulseMagazineSize, getSelectedRuneUltimateTree } from "../build/loadout.js";
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
  slotAbility1,
  slotAbility1Icon,
  slotAbility1Name,
  slotAbility1Overlay,
  slotAbility1Timer,
  slotAbility2,
  slotAbility2Icon,
  slotAbility2Name,
  slotAbility2Overlay,
  slotAbility2Timer,
  slotAbility3,
  slotAbility3Icon,
  slotAbility3Name,
  slotAbility3Overlay,
  slotAbility3Timer,
  ultimateSlot,
  ultimateSlotIcon,
  ultimateSlotName,
  ultimateSlotOverlay,
  ultimateSlotTimer,
} = dom;

export function updateHud() {
  const weaponReady = player.fireCooldown <= 0 && player.reloadTime <= 0;
  const activeWeapon = weapons[player.weapon] ?? weapons.pulse;
  const activeMode = sandboxModes[sandbox.mode];
  const activeLayout = getMapLayout(sandbox.mode);
  const primaryBot = getPrimaryBot();
  const buildStats = getBuildStats();
  const slotAbilities = [getAbilityBySlot(0), getAbilityBySlot(1), getAbilityBySlot(2)];
  const selectedUltimate = content.ultimates[loadout.ultimate] ?? content.ultimates.phantomSplit;
  mapName.textContent = activeLayout.name ?? activeMode.name;
  mapStatus.textContent = activeLayout.subtitle ?? activeMode.subtitle;
  roundLabel.textContent =
    sandbox.mode === sandboxModes.duel.key
      ? `Round ${matchState.roundNumber}`
      : sandbox.mode === sandboxModes.survival.key
        ? `Wave ${survivalState.wave}`
        : "Practice";
  matchScore.textContent =
    sandbox.mode === sandboxModes.duel.key
      ? `${matchState.playerRounds} - ${matchState.enemyRounds}`
      : sandbox.mode === sandboxModes.survival.key
        ? `${survivalState.waveKills}/${Math.max(1, survivalState.waveTargetKills)}`
        : `${getAllBots().filter((bot) => bot.alive).length} targets`;
  matchFormat.textContent =
    sandbox.mode === sandboxModes.duel.key
      ? "BO3"
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
    const keystoneTree = getSelectedRuneUltimateTree();
    const keystoneName = keystoneTree ? content.runeTrees[keystoneTree]?.nodes.ultimate.name : "No keystone";
    const perkName = content.perks[loadout.perks[0]]?.name ?? "No perk";
    playerBuildTag.textContent = player.lastStandTime > 0
      ? `${keystoneName} | ${perkName} | OVERLOAD ${player.lastStandTime.toFixed(1)}s`
      : `${keystoneName} | ${perkName}`;
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
  enemyHealthFill.style.width = primaryBot
    ? `${(Math.max(0, primaryBot.hp) / primaryBot.maxHp) * 100}%`
      : "0%";
  playerHealthText.textContent = player.lastStandTime > 0
    ? `${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""} | OVERLOAD ${player.lastStandTime.toFixed(1)}s`
    : `${Math.ceil(player.hp)} / ${Math.ceil(buildStats.maxHp)}${player.shield > 0 ? ` +${Math.ceil(player.shield)}` : ""}`;
  enemyHealthText.textContent = primaryBot
    ? primaryBot.alive
      ? `${Math.ceil(primaryBot.hp)} / ${primaryBot.maxHp}`
      : "Down"
    : "--";

  setHudSlotPresentation(slotDashIcon, slotDashName, { icon: "ability-dash", name: "Dash" });
  setHudSlotPresentation(slotAbility1Icon, slotAbility1Name, slotAbilities[0] ?? content.abilities.shockJavelin);
  setHudSlotPresentation(slotAbility2Icon, slotAbility2Name, slotAbilities[1] ?? content.abilities.magneticField);
  setHudSlotPresentation(slotAbility3Icon, slotAbility3Name, slotAbilities[2] ?? content.abilities.energyShield);
  setHudSlotPresentation(ultimateSlotIcon, ultimateSlotName, selectedUltimate);

  updateAbilitySlot(slotDash, slotDashOverlay, slotDashTimer, getAbilityHudState("dash"));
  updateAbilitySlot(slotAbility1, slotAbility1Overlay, slotAbility1Timer, getAbilityHudState(slotAbilities[0]?.key));
  updateAbilitySlot(slotAbility2, slotAbility2Overlay, slotAbility2Timer, getAbilityHudState(slotAbilities[1]?.key));
  updateAbilitySlot(slotAbility3, slotAbility3Overlay, slotAbility3Timer, getAbilityHudState(slotAbilities[2]?.key));
  updateAbilitySlot(ultimateSlot, ultimateSlotOverlay, ultimateSlotTimer, {
    ready: abilityState.ultimate.cooldown <= 0,
    charging: false,
    cooldownRatio: abilityState.ultimate.cooldown <= 0 ? 0 : abilityState.ultimate.cooldown / config.ultimateCooldown,
    timer: abilityState.ultimate.cooldown <= 0 ? "" : abilityState.ultimate.cooldown.toFixed(1),
  });
}

export function updateAbilitySlot(slot, overlay, timerLabel, state) {
  slot.classList.toggle("ready", state.ready);
  slot.classList.toggle("charging", state.charging);
  slot.classList.toggle("cooling", !state.ready && !state.charging);
  const clampedRatio = Math.max(0, Math.min(1, state.cooldownRatio ?? 1));
  const cooldownDegrees = Math.round(clampedRatio * 360);
  const clearDegrees = 360 - cooldownDegrees;
  const shadowColor = state.charging ? "rgba(55, 33, 10, 0.82)" : "rgba(6, 10, 14, 0.88)";
  const clearColor = state.charging ? "rgba(55, 33, 10, 0.16)" : "rgba(6, 10, 14, 0.12)";
  overlay.style.background = `conic-gradient(from -90deg, ${clearColor} 0deg ${clearDegrees}deg, ${shadowColor} ${clearDegrees}deg 360deg)`;
  overlay.style.opacity = state.ready && !state.charging ? "0" : "1";
  timerLabel.textContent = state.timer;
}

export function getAbilityHudState(abilityKey) {
  switch (abilityKey) {
    case "dash": {
      const ready = abilityState.dash.charges > 0;
      return {
        ready,
        charging: abilityState.dash.inputHeld && abilityState.dash.activeTime <= 0,
        cooldownRatio: ready ? 0 : Math.max(0, Math.min(1, abilityState.dash.rechargeTimer / getActiveDashCooldown())),
        timer: abilityState.dash.activeTime > 0 ? "GO" : ready ? "" : abilityState.dash.rechargeTimer.toFixed(1),
      };
    }
    case "shockJavelin":
      return {
        ready: abilityState.javelin.cooldown <= 0 && !abilityState.javelin.pendingCooldown && !abilityState.javelin.recastReady,
        charging: abilityState.javelin.recastReady,
        cooldownRatio:
          abilityState.javelin.recastReady
            ? 0
            : abilityState.javelin.pendingCooldown
              ? Math.max(0, Math.min(1, abilityState.javelin.activeTime / Math.max(0.001, config.javelinSlowDuration)))
            : abilityState.javelin.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, abilityState.javelin.cooldown / abilityConfig.javelin.cooldown)),
        timer: abilityState.javelin.recastReady
          ? "RE"
          : abilityState.javelin.pendingCooldown
            ? abilityState.javelin.activeTime.toFixed(1)
          : abilityState.javelin.cooldown <= 0
            ? ""
            : abilityState.javelin.cooldown.toFixed(1),
      };
    case "magneticField":
      return {
        ready: abilityState.field.cooldown <= 0,
        charging: abilityState.field.charging,
        cooldownRatio:
          abilityState.field.cooldown <= 0
            ? 0
            : Math.max(0, Math.min(1, abilityState.field.cooldown / abilityConfig.field.cooldown)),
        timer: abilityState.field.charging
          ? abilityState.field.chargeTime >= abilityConfig.field.chargeThreshold
            ? "MAX"
            : "..."
          : abilityState.field.cooldown <= 0
            ? ""
            : abilityState.field.cooldown.toFixed(1),
      };
    case "magneticGrapple":
      return {
        ready: abilityState.grapple.cooldown <= 0 && abilityState.grapple.phase === "idle",
        charging: abilityState.grapple.phase === "flying" || abilityState.grapple.phase === "pull",
        cooldownRatio: abilityState.grapple.cooldown <= 0 ? 0 : abilityState.grapple.cooldown / config.grappleCooldown,
        timer:
          abilityState.grapple.phase === "pull"
            ? "CUT"
            : abilityState.grapple.phase === "flying"
              ? "HOOK"
              : abilityState.grapple.cooldown <= 0
                ? ""
                : abilityState.grapple.cooldown.toFixed(1),
      };
    case "energyShield":
      return {
        ready: abilityState.shield.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.shield.cooldown <= 0 ? 0 : abilityState.shield.cooldown / config.shieldCooldown,
        timer: abilityState.shield.cooldown <= 0 ? "" : abilityState.shield.cooldown.toFixed(1),
      };
    case "empBurst":
      return {
        ready: abilityState.emp.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.emp.cooldown <= 0 ? 0 : abilityState.emp.cooldown / config.boosterCooldown,
        timer: abilityState.emp.cooldown <= 0 ? "" : abilityState.emp.cooldown.toFixed(1),
      };
    case "backstepBurst":
      return {
        ready: abilityState.backstep.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.backstep.cooldown <= 0 ? 0 : abilityState.backstep.cooldown / 3.6,
        timer: abilityState.backstep.cooldown <= 0 ? "" : abilityState.backstep.cooldown.toFixed(1),
      };
    case "chainLightning":
      return {
        ready: abilityState.chainLightning.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.chainLightning.cooldown <= 0 ? 0 : abilityState.chainLightning.cooldown / 5.4,
        timer: abilityState.chainLightning.cooldown <= 0 ? "" : abilityState.chainLightning.cooldown.toFixed(1),
      };
    case "blinkStep":
      return {
        ready: abilityState.blink.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.blink.cooldown <= 0 ? 0 : abilityState.blink.cooldown / 3.4,
        timer: abilityState.blink.cooldown <= 0 ? "" : abilityState.blink.cooldown.toFixed(1),
      };
    case "phaseDash":
      return {
        ready: abilityState.phaseDash.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.phaseDash.cooldown <= 0 ? 0 : abilityState.phaseDash.cooldown / 4.6,
        timer: abilityState.phaseDash.time > 0 ? "PHASE" : abilityState.phaseDash.cooldown <= 0 ? "" : abilityState.phaseDash.cooldown.toFixed(1),
      };
    case "pulseBurst":
      return {
        ready: abilityState.pulseBurst.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.pulseBurst.cooldown <= 0 ? 0 : abilityState.pulseBurst.cooldown / 3.2,
        timer: abilityState.pulseBurst.cooldown <= 0 ? "" : abilityState.pulseBurst.cooldown.toFixed(1),
      };
    case "railShot":
      return {
        ready: abilityState.railShot.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.railShot.cooldown <= 0 ? 0 : abilityState.railShot.cooldown / 5.1,
        timer: abilityState.railShot.cooldown <= 0 ? "" : abilityState.railShot.cooldown.toFixed(1),
      };
    case "gravityWell":
      return {
        ready: abilityState.gravityWell.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.gravityWell.cooldown <= 0 ? 0 : abilityState.gravityWell.cooldown / config.gravityWellCooldown,
        timer: abilityState.gravityWell.cooldown <= 0 ? "" : abilityState.gravityWell.cooldown.toFixed(1),
      };
    case "phaseShift":
      return {
        ready: abilityState.phaseShift.cooldown <= 0,
        charging: abilityState.phaseShift.time > 0,
        cooldownRatio: abilityState.phaseShift.cooldown <= 0 ? 0 : abilityState.phaseShift.cooldown / config.phaseShiftCooldown,
        timer: abilityState.phaseShift.time > 0 ? "SHIFT" : abilityState.phaseShift.cooldown <= 0 ? "" : abilityState.phaseShift.cooldown.toFixed(1),
      };
    case "hologramDecoy":
      return {
        ready: abilityState.hologramDecoy.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.hologramDecoy.cooldown <= 0 ? 0 : abilityState.hologramDecoy.cooldown / 6.2,
        timer: abilityState.hologramDecoy.cooldown <= 0 ? "" : abilityState.hologramDecoy.cooldown.toFixed(1),
      };
    case "speedSurge":
      return {
        ready: abilityState.speedSurge.cooldown <= 0,
        charging: false,
        cooldownRatio: abilityState.speedSurge.cooldown <= 0 ? 0 : abilityState.speedSurge.cooldown / 4.2,
        timer: abilityState.speedSurge.cooldown <= 0 ? "" : abilityState.speedSurge.cooldown.toFixed(1),
      };
    default:
      return { ready: false, charging: false, cooldownRatio: 1, timer: "NA" };
  }
}

export function setHudSlotPresentation(slotIcon, slotName, ability) {
  if (!slotIcon || !slotName || !ability) {
    return;
  }
  slotIcon.className = `ability-slot__icon content-icon content-icon--${sanitizeIconClass(ability.icon)}`;
  slotName.textContent = ability.name;
}

