import { getAccountSnapshot, updatePlayerProgression } from "./service.js";

function getSafeServerProgression() {
  const snapshot = getAccountSnapshot();
  const progression = snapshot.progression ?? {};

  return {
    snapshot,
    progression: {
      xp: Math.max(0, Math.floor(Number(progression.xp) || 0)),
      level: Math.max(1, Math.floor(Number(progression.level) || 1)),
      best_survival_wave: Math.max(0, Math.floor(Number(progression.best_survival_wave) || 0)),
      wins: Math.max(0, Math.floor(Number(progression.wins) || 0)),
      losses: Math.max(0, Math.floor(Number(progression.losses) || 0)),
      winstreak: Math.max(0, Math.floor(Number(progression.winstreak) || 0)),
    },
  };
}

function canSyncServer(snapshot) {
  return Boolean(snapshot?.configReady && snapshot?.isAuthenticated);
}

export async function syncServerProgressionAfterMatch({ xp, level, result }) {
  const { snapshot, progression } = getSafeServerProgression();
  if (!canSyncServer(snapshot)) {
    return null;
  }

  const nextWins = progression.wins + (result === "win" ? 1 : 0);
  const nextLosses = progression.losses + (result === "loss" ? 1 : 0);
  const nextWinstreak = result === "win" ? progression.winstreak + 1 : 0;

  try {
    return await updatePlayerProgression({
      xp,
      level,
      wins: nextWins,
      losses: nextLosses,
      winstreak: nextWinstreak,
      best_survival_wave: progression.best_survival_wave,
    });
  } catch (error) {
    console.warn("Failed to sync match progression to Supabase.", error);
    return null;
  }
}

export async function syncServerProgressionAfterSurvival({ xp, level, bestSurvivalWave }) {
  const { snapshot, progression } = getSafeServerProgression();
  if (!canSyncServer(snapshot)) {
    return null;
  }

  try {
    return await updatePlayerProgression({
      xp,
      level,
      wins: progression.wins,
      losses: progression.losses,
      winstreak: progression.winstreak,
      best_survival_wave: Math.max(progression.best_survival_wave, Math.floor(Number(bestSurvivalWave) || 0)),
    });
  } catch (error) {
    console.warn("Failed to sync survival progression to Supabase.", error);
    return null;
  }
}