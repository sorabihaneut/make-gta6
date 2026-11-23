// Sol Corona: Vice Coast - Narrative Crime Missions Engine
import { sound } from './audio.js';

export const MISSIONS_LIST = [
  {
    id: 1,
    title: 'The Welcome Mat',
    reward: 2500,
    objective: 'Steal the Vance Turbo GT sports car and deliver it to your Safehouse garage.',
    targetLocation: { x: 2360, y: 2360 }, // Vance Safehouse
    pickupLocation: { x: 2460, y: 2400 },
    requiredVehicle: 'sport',
  },
  {
    id: 2,
    title: 'Harbor Contraband',
    reward: 5000,
    objective: 'Drive to Corona Ocean Port docks and seize the syndicate contraband cache.',
    targetLocation: { x: 800, y: 3800 },
    spawnHostiles: true,
  },
  {
    id: 3,
    title: 'Hot Pursuit',
    reward: 7500,
    objective: "Escape the 3-Star tactical police lockdown! Lose heat at the Speedy Respray Garage.",
    targetLocation: { x: 1540, y: 1960 }, // Respray garage
    setWanted: 3,
  },
  {
    id: 4,
    title: 'Downtown Reckoning',
    reward: 15000,
    objective: 'Infiltrate Neon Flamingo Club and eliminate the syndicate bosses to rule Vice Coast.',
    targetLocation: { x: 2840, y: 1960 },
    bossEncounter: true,
  },
];

export class MissionManager {
  constructor() {
    this.currentIndex = 0;
    this.currentMission = null;
    this.currentWaypoint = null;
    this.completedCount = 0;
    this.bannerTimer = 0;
    this.isMissionActive = false;
    this.statusMessage = '';

    this.startMission(0);
  }

  startMission(index) {
    if (index >= MISSIONS_LIST.length) {
      this.currentMission = {
        title: 'Vice Coast Kingpin',
        objective: 'City Conquered! Explore Sol Corona freely, steal cars, and rule the streets.',
      };
      this.currentWaypoint = null;
      this.isMissionActive = false;
      return;
    }

    this.currentIndex = index;
    this.currentMission = MISSIONS_LIST[index];
    this.currentWaypoint = this.currentMission.targetLocation;
    this.isMissionActive = true;
    this.statusMessage = `NEW MISSION: ${this.currentMission.title}`;
    this.bannerTimer = 240;

    sound.playMissionFanfare();
  }

  update(player, police, world) {
    if (!this.isMissionActive || !this.currentMission) return;

    if (this.bannerTimer > 0) this.bannerTimer--;

    // Check if player reached mission waypoint
    const wp = this.currentWaypoint;
    if (wp) {
      const dist = Math.hypot(player.x - wp.x, player.y - wp.y);

      if (dist < 75) {
        // Mission specific completion checks
        if (this.currentMission.id === 1) {
          if (player.inVehicle) {
            this.completeMission(player, police);
          } else {
            this.statusMessage = 'Deliver the sports car inside the garage!';
          }
        } else if (this.currentMission.id === 3) {
          // Clear wanted level at respray garage
          police.clearWanted(player);
          this.completeMission(player, police);
        } else {
          this.completeMission(player, police);
        }
      }
    }
  }

  completeMission(player, police) {
    const reward = this.currentMission.reward;
    player.cash += reward;
    this.completedCount++;
    this.statusMessage = `MISSION COMPLETE! +$${reward.toLocaleString()}`;
    this.bannerTimer = 300;

    sound.playMissionFanfare();

    // Trigger next mission
    setTimeout(() => {
      this.startMission(this.currentIndex + 1);
      if (this.currentMission && this.currentMission.setWanted) {
        player.wantedLevel = this.currentMission.setWanted;
      }
    }, 4000);
  }
}
