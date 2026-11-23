// Sol Corona: Vice Coast - Police Pursuit & Wanted Level AI System
import { Vehicle } from './entities.js';
import { sound } from './audio.js';
import { COLORS } from './config.js';

export class PoliceSystem {
  constructor() {
    this.policeUnits = [];
    this.maxUnits = 6;
    this.spawnTimer = 0;
    this.cooldownTimer = 0;
    this.searchRadius = 900;
    this.lineOfSightLostTime = 0;
  }

  update(world, player, vehicles, dt) {
    if (player.isDead) return;

    // Filter dead or destroyed units
    this.policeUnits = this.policeUnits.filter((u) => !u.isDestroyed);

    // If player has wanted level, manage pursuit & spawns
    if (player.wantedLevel > 0) {
      this.handleSpawns(world, player, vehicles);
      this.handlePursuit(world, player, dt);
      sound.updateSirens(player.wantedLevel, this.policeUnits.length > 0);
    } else {
      sound.updateSirens(0, false);
      // Remove excess police units if heat cleared
      if (this.policeUnits.length > 0) {
        this.policeUnits.forEach((u) => {
          u.speed *= 0.95;
        });
      }
    }
  }

  handleSpawns(world, player, vehicles) {
    this.spawnTimer++;
    const targetCount = Math.min(this.maxUnits, player.wantedLevel * 2);

    if (this.policeUnits.length < targetCount && this.spawnTimer > 180) {
      this.spawnTimer = 0;

      // Spawn police cruiser just off-screen ahead or behind player
      const angle = player.angle + (Math.random() - 0.5) * 1.5;
      const dist = 750 + Math.random() * 200;
      const spawnX = Math.max(100, Math.min(world.width - 100, player.x + Math.cos(angle) * dist));
      const spawnY = Math.max(100, Math.min(world.height - 100, player.y + Math.sin(angle) * dist));

      if (!world.isPointInBuilding(spawnX, spawnY)) {
        const cruiser = new Vehicle('police', spawnX, spawnY, angle + Math.PI);
        cruiser.speed = 4.0;
        this.policeUnits.push(cruiser);
        vehicles.push(cruiser);
      }
    }
  }

  handlePursuit(world, player, dt) {
    let anyInSight = false;

    for (const cruiser of this.policeUnits) {
      const dist = Math.hypot(player.x - cruiser.x, player.y - cruiser.y);

      if (dist < this.searchRadius) {
        anyInSight = true;

        // Steer toward player
        const targetAngle = Math.atan2(player.y - cruiser.y, player.x - cruiser.x);
        let angleDiff = targetAngle - cruiser.angle;

        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        cruiser.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), cruiser.turnSpeed * 1.2);

        // Accelerate aggressively toward player
        if (cruiser.speed < cruiser.maxSpeed) {
          cruiser.speed += cruiser.acceleration * 1.1;
        }

        // Ramming tactical collision
        if (dist < 65) {
          cruiser.speed *= 0.7;
          player.takeDamage(12 + player.wantedLevel * 4);
          sound.playImpact(1.8);
        }
      }

      // Physics update
      const nextX = cruiser.x + Math.cos(cruiser.angle) * cruiser.speed;
      const nextY = cruiser.y + Math.sin(cruiser.angle) * cruiser.speed;
      const col = world.checkCollision(nextX, nextY, cruiser.width / 2);

      if (!col.collided) {
        cruiser.x = nextX;
        cruiser.y = nextY;
      } else {
        cruiser.speed *= -0.4;
        cruiser.angle += (Math.random() - 0.5) * 1.2;
        if (col.pushX) cruiser.x += col.pushX;
        if (col.pushY) cruiser.y += col.pushY;
      }
    }

    // Cooldown mechanic: if line of sight broken for extended time, heat drops
    if (!anyInSight) {
      this.lineOfSightLostTime++;
      if (this.lineOfSightLostTime > 400) {
        this.lineOfSightLostTime = 0;
        player.wantedLevel = Math.max(0, player.wantedLevel - 1);
        if (player.wantedLevel === 0) {
          this.policeUnits.forEach((u) => u.destroy());
          this.policeUnits = [];
        }
      }
    } else {
      this.lineOfSightLostTime = 0;
    }
  }

  clearWanted(player) {
    player.wantedLevel = 0;
    this.policeUnits.forEach((u) => u.destroy());
    this.policeUnits = [];
    sound.updateSirens(0, false);
  }
}
