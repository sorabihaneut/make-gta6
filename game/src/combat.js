// Sol Corona: Vice Coast - Weapons, Projectiles & Combat Engine
import { WEAPONS, COLORS } from './config.js';
import { sound } from './audio.js';

export class CombatSystem {
  constructor() {
    this.bullets = [];
    this.particles = [];
    this.decals = []; // Blood, blast marks
    this.pickups = []; // Health and armor drops
  }

  fireWeapon(shooter, targetX, targetY, isPlayer = false) {
    const weaponKey = shooter.weapon || 'pistol';
    const spec = WEAPONS[weaponKey] || WEAPONS.pistol;
    const now = Date.now();

    if (now - (shooter.lastShotTime || 0) < spec.fireRate) return;
    if (shooter.ammo && shooter.ammo[weaponKey] <= 0) return;

    shooter.lastShotTime = now;
    if (shooter.ammo && shooter.ammo[weaponKey] !== Infinity) {
      shooter.ammo[weaponKey]--;
    }

    sound.init();
    sound.playGunshot(weaponKey);

    const baseAngle = Math.atan2(targetY - shooter.y, targetX - shooter.x);
    const pellets = spec.pellets || 1;

    for (let i = 0; i < pellets; i++) {
      const spread = (Math.random() - 0.5) * spec.spread;
      const angle = baseAngle + spread;
      this.bullets.push({
        x: shooter.x + Math.cos(baseAngle) * 24,
        y: shooter.y + Math.sin(baseAngle) * 24,
        vx: Math.cos(angle) * (spec.bulletSpeed || 20),
        vy: Math.sin(angle) * (spec.bulletSpeed || 20),
        rangeRemaining: spec.range,
        damage: spec.damage,
        isPlayerShooter: isPlayer,
      });
    }

    // Muzzle flash particle
    this.particles.push({
      x: shooter.x + Math.cos(baseAngle) * 26,
      y: shooter.y + Math.sin(baseAngle) * 26,
      vx: 0,
      vy: 0,
      radius: 8,
      life: 5,
      color: '#fef08a',
    });
  }

  update(world, player, vehicles, pedestrians, camera) {
    // 1. Update Projectiles
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      const dist = Math.hypot(b.vx, b.vy);
      b.rangeRemaining -= dist;

      // Hit wall/building
      if (world.checkCollision(b.x, b.y, 4).collided || b.rangeRemaining <= 0) {
        this.addSparks(b.x, b.y);
        this.bullets.splice(i, 1);
        continue;
      }

      // Hit Vehicle
      let hit = false;
      for (const v of vehicles) {
        if (!v.isDestroyed && Math.hypot(v.x - b.x, v.y - b.y) < v.width) {
          v.health -= b.damage;
          this.addSparks(b.x, b.y);
          if (v.health <= 0) {
            v.destroy();
            camera.shake(12);
            this.addExplosion(v.x, v.y);
          }
          hit = true;
          break;
        }
      }
      if (hit) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Hit Pedestrian
      if (b.isPlayerShooter) {
        for (const p of pedestrians) {
          if (!p.isDead && Math.hypot(p.x - b.x, p.y - b.y) < p.radius + 6) {
            p.health -= b.damage;
            p.isPanicked = true;
            p.panicTimer = 300;
            this.addBlood(p.x, p.y);
            if (p.health <= 0) {
              p.isDead = true;
              player.wantedLevel = Math.max(player.wantedLevel, 1);
              // Drop cash
              this.pickups.push({
                x: p.x,
                y: p.y,
                type: 'cash',
                amount: 80 + Math.floor(Math.random() * 120),
              });
            }
            hit = true;
            break;
          }
        }
      } else {
        // Hit Player
        if (!player.isDead && Math.hypot(player.x - b.x, player.y - b.y) < player.radius + 6) {
          player.takeDamage(b.damage);
          camera.shake(6);
          this.addBlood(player.x, player.y);
          hit = true;
        }
      }

      if (hit) {
        this.bullets.splice(i, 1);
      }
    }

    // 2. Pickups collection
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.hypot(player.x - p.x, player.y - p.y) < 32) {
        sound.init();
        if (p.type === 'cash') {
          player.cash += p.amount;
          sound.playImpact(0.4);
        } else if (p.type === 'health') {
          player.heal(50);
        } else if (p.type === 'armor') {
          player.addArmor(50);
        }
        this.pickups.splice(i, 1);
      }
    }

    // 3. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  addSparks(x, y) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 2,
        life: 10,
        color: '#f59e0b',
      });
    }
  }

  addBlood(x, y) {
    this.decals.push({ x, y, radius: 8 + Math.random() * 6, color: '#991b1b' });
    if (this.decals.length > 80) this.decals.shift();
  }

  addExplosion(x, y) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 6 + Math.random() * 6,
        life: 25,
        color: ['#ef4444', '#f97316', '#eab308'][Math.floor(Math.random() * 3)],
      });
    }
  }

  render(ctx) {
    // Render Decals
    for (const d of this.decals) {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render Pickups
    for (const p of this.pickups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
      ctx.restore();
    }

    // Render Bullets (Tracers)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    for (const b of this.bullets) {
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5);
      ctx.stroke();
    }

    // Render Particles
    for (const pt of this.particles) {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
