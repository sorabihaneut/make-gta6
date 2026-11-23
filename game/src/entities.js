// Sol Corona: Vice Coast - Entities: Player, Vehicles, Traffic, Pedestrians
import { VEHICLE_TYPES, WEAPONS } from './config.js';
import { sound } from './audio.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.speed = 0;
    this.radius = 16;
    this.health = 100;
    this.maxHealth = 100;
    this.armor = 50;
    this.maxArmor = 100;
    this.cash = 1500;
    this.wantedLevel = 0;
    this.inVehicle = null;
    this.weapon = 'pistol';
    this.ammo = {
      fists: Infinity,
      pistol: 96,
      smg: 180,
      shotgun: 36,
    };
    this.lastShotTime = 0;
    this.walkAnim = 0;
    this.isDead = false;
  }

  update(input, world, vehicles) {
    if (this.isDead) return;

    if (this.inVehicle) {
      this.updateInVehicle(input, world);
      return;
    }

    this.updateOnFoot(input, world, vehicles);
  }

  updateOnFoot(input, world, vehicles) {
    let moveX = 0;
    let moveY = 0;

    if (input.isUp()) moveY -= 1;
    if (input.isDownKey()) moveY += 1;
    if (input.isLeft()) moveX -= 1;
    if (input.isRight()) moveX += 1;

    const mag = Math.hypot(moveX, moveY);
    const sprint = input.isSprint();
    const maxSpeed = sprint ? 5.2 : 3.2;

    if (mag > 0) {
      moveX /= mag;
      moveY /= mag;
      this.speed = maxSpeed;
      this.angle = Math.atan2(moveY, moveX);
      this.walkAnim += sprint ? 0.35 : 0.2;
    } else {
      this.speed = 0;
    }

    // Try moving X then Y for smooth slide along buildings
    let nextX = this.x + moveX * this.speed;
    let colX = world.checkCollision(nextX, this.y, this.radius);
    if (!colX.collided) {
      this.x = nextX;
    } else if (colX.pushX) {
      this.x += colX.pushX * 0.5;
    }

    let nextY = this.y + moveY * this.speed;
    let colY = world.checkCollision(this.x, nextY, this.radius);
    if (!colY.collided) {
      this.y = nextY;
    } else if (colY.pushY) {
      this.y += colY.pushY * 0.5;
    }

    // Enter vehicle check
    if (input.isAction()) {
      for (const v of vehicles) {
        if (!v.isDestroyed && Math.hypot(v.x - this.x, v.y - this.y) < 70) {
          this.enterVehicle(v);
          break;
        }
      }
    }
  }

  enterVehicle(v) {
    this.inVehicle = v;
    v.driver = this;
    sound.init();
    sound.playImpact(0.8);
  }

  exitVehicle() {
    if (!this.inVehicle) return;
    const v = this.inVehicle;
    // Spawn beside vehicle
    const exitAngle = v.angle + Math.PI / 2;
    this.x = v.x + Math.cos(exitAngle) * 45;
    this.y = v.y + Math.sin(exitAngle) * 45;
    v.driver = null;
    this.inVehicle = null;
    sound.playImpact(0.8);
  }

  updateInVehicle(input, world) {
    const v = this.inVehicle;
    if (!v) return;

    if (input.isAction()) {
      this.exitVehicle();
      return;
    }

    v.update(input, world);
    this.x = v.x;
    this.y = v.y;
    this.angle = v.angle;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    sound.init();
    sound.playImpact(0.6);

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.7);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addArmor(amount) {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }
}

export class Vehicle {
  constructor(typeKey, x, y, angle = 0) {
    this.typeKey = typeKey;
    const spec = VEHICLE_TYPES[typeKey] || VEHICLE_TYPES.sedan;
    this.spec = spec;
    this.name = spec.name;
    this.width = spec.width;
    this.length = spec.length;
    this.maxSpeed = spec.maxSpeed;
    this.acceleration = spec.acceleration;
    this.reverseSpeed = spec.reverseSpeed;
    this.braking = spec.braking;
    this.turnSpeed = spec.turnSpeed;
    this.friction = spec.friction;
    this.mass = spec.mass;
    this.health = spec.health;
    this.maxHealth = spec.health;
    this.color = spec.color;
    this.roofColor = spec.roofColor;
    this.isPolice = !!spec.isPolice;

    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.angularVelocity = 0;
    this.driver = null;
    this.isDestroyed = false;
    this.skidMarks = [];
    this.sirenTimer = 0;
    this.lightState = false;
  }

  update(input, world) {
    if (this.isDestroyed) return;

    if (this.driver) {
      this.updatePlayerDriven(input, world);
    } else {
      this.speed *= this.friction;
    }

    // Siren lights for police
    if (this.isPolice) {
      this.sirenTimer += 0.2;
      this.lightState = Math.sin(this.sirenTimer * 4) > 0;
    }
  }

  updatePlayerDriven(input, world) {
    // Acceleration & Reverse
    if (input.isUp()) {
      if (this.speed < this.maxSpeed) {
        this.speed += this.acceleration;
      }
    } else if (input.isDownKey()) {
      if (this.speed > 0.5) {
        this.speed -= this.braking;
      } else if (this.speed > -this.reverseSpeed) {
        this.speed -= this.acceleration * 0.7;
      }
    } else {
      this.speed *= this.friction;
    }

    // Handbrake drift
    let currentTurnSpeed = this.turnSpeed;
    if (input.isHandbrake()) {
      this.speed *= 0.94;
      currentTurnSpeed *= 1.4;
      if (Math.abs(this.speed) > 3) {
        sound.playTireScreech();
        this.addSkidMark();
      }
    }

    // Steering proportional to speed
    if (Math.abs(this.speed) > 0.15) {
      const dir = this.speed >= 0 ? 1 : -1;
      if (input.isLeft()) {
        this.angle -= currentTurnSpeed * dir;
      }
      if (input.isRight()) {
        this.angle += currentTurnSpeed * dir;
      }
    }

    // Sound engine RPM pitch
    sound.updateEngine(Math.abs(this.speed) / this.maxSpeed, true);

    // Physics movement & building collision
    const nextX = this.x + Math.cos(this.angle) * this.speed;
    const nextY = this.y + Math.sin(this.angle) * this.speed;

    const col = world.checkCollision(nextX, nextY, this.width / 2);
    if (!col.collided) {
      this.x = nextX;
      this.y = nextY;
    } else {
      // Crash impact
      if (Math.abs(this.speed) > 2) {
        sound.playImpact(Math.abs(this.speed) / 4);
        this.health -= Math.abs(this.speed) * 8;
        if (this.health <= 0) {
          this.destroy();
        }
      }
      this.speed = -this.speed * 0.35; // bounce back
      if (col.pushX) this.x += col.pushX;
      if (col.pushY) this.y += col.pushY;
    }
  }

  addSkidMark() {
    this.skidMarks.push({
      x: this.x,
      y: this.y,
      angle: this.angle,
      life: 200,
    });
    if (this.skidMarks.length > 50) this.skidMarks.shift();
  }

  destroy() {
    this.isDestroyed = true;
    this.health = 0;
    this.speed = 0;
    this.color = '#1f2937';
    this.roofColor = '#111827';
    sound.playImpact(2.0);
  }
}

export class Pedestrian {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 1.0 + Math.random() * 0.8;
    this.radius = 12;
    this.health = 40;
    this.isPanicked = false;
    this.panicTimer = 0;
    this.walkAnim = Math.random() * 10;
    this.isDead = false;
    this.shirtColor = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)];
  }

  update(world, player, vehicles) {
    if (this.isDead) return;

    this.walkAnim += 0.15;

    // Panic if gunshots nearby or vehicle speeds near
    const distToPlayer = Math.hypot(this.x - player.x, this.y - player.y);
    if (this.isPanicked) {
      this.panicTimer -= 1;
      if (this.panicTimer <= 0) this.isPanicked = false;
      this.speed = 3.6;
    }

    // Vehicle run-over check
    for (const v of vehicles) {
      if (Math.abs(v.speed) > 2.5 && Math.hypot(v.x - this.x, v.y - this.y) < v.length / 2) {
        this.isDead = true;
        this.health = 0;
        sound.playImpact(1.2);
        if (v.driver === player) {
          player.wantedLevel = Math.max(player.wantedLevel, 1);
        }
        return;
      }
    }

    // Move along current direction
    const nextX = this.x + Math.cos(this.angle) * this.speed;
    const nextY = this.y + Math.sin(this.angle) * this.speed;
    const col = world.checkCollision(nextX, nextY, this.radius);

    if (!col.collided) {
      this.x = nextX;
      this.y = nextY;
    } else {
      this.angle += Math.PI * 0.5 + (Math.random() - 0.5);
    }
  }
}
