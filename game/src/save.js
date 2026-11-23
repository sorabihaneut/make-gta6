// Sol Corona: Vice Coast - Save and Progression Manager
// Persists cash, weapons, and completed missions in localStorage.

export class SaveManager {
  constructor() {
    this.storageKey = 'sol_corona_vice_coast_save';
  }

  save(player, missionManager) {
    try {
      const data = {
        cash: player.cash,
        health: player.health,
        armor: player.armor,
        weapon: player.weapon,
        ammo: player.ammo,
        completedMissions: missionManager.completedCount,
        missionIndex: missionManager.currentIndex,
        savedAt: Date.now(),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load(player, missionManager) {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return false;
      const data = JSON.parse(raw);

      if (typeof data.cash === 'number') player.cash = data.cash;
      if (typeof data.armor === 'number') player.armor = data.armor;
      if (data.weapon) player.weapon = data.weapon;
      if (data.ammo) player.ammo = { ...player.ammo, ...data.ammo };
      if (typeof data.missionIndex === 'number') {
        missionManager.completedCount = data.completedMissions || 0;
        missionManager.startMission(data.missionIndex);
      }
      return true;
    } catch {
      return false;
    }
  }
}
