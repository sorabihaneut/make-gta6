// Sol Corona: Vice Coast - 2.5D Open World Visual Renderer
import { COLORS, WORLD } from './config.js';
import { sound } from './audio.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  render(world, player, camera, vehicles, pedestrians, combat, police, missions, gameState = 'playing') {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // Fill ocean background
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, 0, this.width, this.height);

    const cam = camera.getOffset();

    // Camera Transformation Matrix
    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // 1. Draw Ground (Beach coast on west, lush city grass elsewhere)
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, world.width, world.height);

    // West Coast Beach Sand strip
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(0, 0, 320, world.height);

    // 2. Draw Roads with asphalt textures & lane markings
    this.drawRoads(ctx, world, camera);

    // 3. Draw Tire Skid Marks
    this.drawSkidMarks(ctx, vehicles);

    // 4. Draw Props (Palm trees, street lights)
    this.drawProps(ctx, world, camera);

    // 5. Draw Combat decals, pickups & bullets
    if (combat) {
      combat.render(ctx);
    }

    // 6. Draw Vehicles
    for (const v of vehicles) {
      if (camera.isVisible(v.x - v.length, v.y - v.length, v.length * 2, v.length * 2)) {
        this.drawVehicle(ctx, v);
      }
    }

    // 7. Draw Pedestrians
    for (const p of pedestrians) {
      if (!p.isDead && camera.isVisible(p.x - 20, p.y - 20, 40, 40)) {
        this.drawPedestrian(ctx, p);
      }
    }

    // 8. Draw Player (if not in vehicle)
    if (!player.inVehicle && !player.isDead) {
      this.drawPlayer(ctx, player);
    }

    // 9. Draw 2.5D Buildings with 3D Depth Extrusion and Neon Accents
    this.drawBuildings(ctx, world, camera, cam);

    // 10. Draw Mission Waypoint in world space
    if (missions && missions.currentWaypoint) {
      this.drawWaypoint(ctx, missions.currentWaypoint);
    }

    ctx.restore();

    // 11. Draw Screen Space HUD & Circular Minimap
    this.drawHUD(ctx, player, world, vehicles, camera, missions, gameState);

    // 12. Menus & Overlays (Title, Pause, Wasted)
    if (gameState === 'title') {
      this.drawTitleScreen(ctx);
    } else if (gameState === 'pause') {
      this.drawPauseMenu(ctx);
    } else if (player.isDead) {
      this.drawWastedScreen(ctx);
    }
  }

  drawRoads(ctx, world, camera) {
    ctx.fillStyle = COLORS.asphalt;

    // Draw horizontal & vertical roads
    for (const r of world.roads) {
      if (camera.isVisible(r.x, r.y, r.width, r.height)) {
        ctx.fillRect(r.x, r.y, r.width, r.height);

        // Sidewalk curbs
        ctx.fillStyle = COLORS.sidewalk;
        if (r.type === 'horizontal') {
          ctx.fillRect(r.x, r.y, r.width, 14);
          ctx.fillRect(r.x, r.y + r.height - 14, r.width, 14);
        } else {
          ctx.fillRect(r.x, r.y, 14, r.height);
          ctx.fillRect(r.x + r.width - 14, r.y, 14, r.height);
        }
        ctx.fillStyle = COLORS.asphalt;
      }
    }

    // Road lane markings
    ctx.strokeStyle = COLORS.asphaltLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 24]);

    for (const r of world.roads) {
      if (camera.isVisible(r.x, r.y, r.width, r.height)) {
        ctx.beginPath();
        if (r.type === 'horizontal') {
          ctx.moveTo(r.x, r.y + r.height / 2);
          ctx.lineTo(r.x + r.width, r.y + r.height / 2);
        } else {
          ctx.moveTo(r.x + r.width / 2, r.y);
          ctx.lineTo(r.x + r.width / 2, r.y + r.height);
        }
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }

  drawSkidMarks(ctx, vehicles) {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.4)';
    for (const v of vehicles) {
      for (const sm of v.skidMarks) {
        ctx.save();
        ctx.translate(sm.x, sm.y);
        ctx.rotate(sm.angle);
        ctx.fillRect(-18, -14, 36, 4);
        ctx.fillRect(-18, 10, 36, 4);
        ctx.restore();
      }
    }
  }

  drawProps(ctx, world, camera) {
    for (const prop of world.props) {
      if (camera.isVisible(prop.x - 40, prop.y - 40, 80, 80)) {
        // Palm tree shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(prop.x + 12, prop.y + 16, 22, 10, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Palm trunk
        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.arc(prop.x, prop.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Palm Fronds
        ctx.fillStyle = '#15803d';
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.ellipse(prop.x + Math.cos(a) * 20, prop.y + Math.sin(a) * 20, 18, 7, a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawVehicle(ctx, v) {
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(v.angle);

    // Vehicle Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(-v.length / 2 + 6, -v.width / 2 + 8, v.length, v.width);

    // Tires (4 wheels)
    ctx.fillStyle = '#111827';
    const wheelW = 16;
    const wheelH = 7;
    ctx.fillRect(-v.length * 0.35, -v.width / 2 - 2, wheelW, wheelH);
    ctx.fillRect(v.length * 0.2, -v.width / 2 - 2, wheelW, wheelH);
    ctx.fillRect(-v.length * 0.35, v.width / 2 - 5, wheelW, wheelH);
    ctx.fillRect(v.length * 0.2, v.width / 2 - 5, wheelW, wheelH);

    // Vehicle Main Body
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.roundRect(-v.length / 2, -v.width / 2, v.length, v.width, 8);
    ctx.fill();

    // Windshield & Rear Window
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-v.length * 0.18, -v.width * 0.4, v.length * 0.45, v.width * 0.8);

    // Vehicle Cabin / Roof
    ctx.fillStyle = v.roofColor;
    ctx.beginPath();
    ctx.roundRect(-v.length * 0.12, -v.width * 0.35, v.length * 0.35, v.width * 0.7, 4);
    ctx.fill();

    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(v.length / 2 - 4, -v.width / 2 + 4, 4, 8);
    ctx.fillRect(v.length / 2 - 4, v.width / 2 - 12, 4, 8);

    // Headlight Beams (subtle light cones)
    ctx.fillStyle = 'rgba(254, 240, 138, 0.12)';
    ctx.beginPath();
    ctx.moveTo(v.length / 2, -v.width / 2 + 8);
    ctx.lineTo(v.length / 2 + 180, -v.width / 2 - 40);
    ctx.lineTo(v.length / 2 + 180, v.width / 2 + 40);
    ctx.lineTo(v.length / 2, v.width / 2 - 8);
    ctx.closePath();
    ctx.fill();

    // Taillights
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-v.length / 2, -v.width / 2 + 4, 3, 8);
    ctx.fillRect(-v.length / 2, v.width / 2 - 12, 3, 8);

    // Police Flashing Light Bar
    if (v.isPolice) {
      ctx.fillStyle = v.lightState ? '#2563eb' : '#dc2626';
      ctx.fillRect(-4, -v.width * 0.3, 8, v.width * 0.6);

      // Bloom flash
      ctx.fillStyle = v.lightState ? 'rgba(37, 99, 235, 0.35)' : 'rgba(220, 38, 38, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 52, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawPlayer(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Player Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs animation
    const legOffset = Math.sin(player.walkAnim) * 6;
    ctx.fillStyle = '#1e293b'; // Dark denim jeans
    ctx.fillRect(-8, -12 + legOffset, 12, 7);
    ctx.fillRect(-8, 5 - legOffset, 12, 7);

    // Torso (Vice Coast cyan shirt)
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fbcfe8'; // Skin tone
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // Dark sunglasses / hair
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, -6, 6, 12);

    // Drawn Weapon
    ctx.fillStyle = '#475569';
    ctx.fillRect(6, 4, 14, 4);

    ctx.restore();
  }

  drawPedestrian(ctx, ped) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = ped.shirtColor;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawBuildings(ctx, world, camera, cam) {
    for (const b of world.buildings) {
      if (camera.isVisible(b.x - 80, b.y - 80, b.width + 160, b.height + 160)) {
        // Calculate 2.5D extrusion offset from camera center
        const dx = (b.x + b.width / 2 - cam.x) * 0.045;
        const dy = (b.y + b.height / 2 - cam.y) * 0.045;

        // Facade walls (cast outward)
        ctx.fillStyle = b.facadeColor;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + dx, b.y + dy);
        ctx.lineTo(b.x + b.width + dx, b.y + dy);
        ctx.lineTo(b.x + b.width, b.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(b.x + b.width, b.y);
        ctx.lineTo(b.x + b.width + dx, b.y + dy);
        ctx.lineTo(b.x + b.width + dx, b.y + b.height + dy);
        ctx.lineTo(b.x + b.width, b.y + b.height);
        ctx.closePath();
        ctx.fill();

        // Building Roof
        ctx.fillStyle = b.roofColor;
        ctx.fillRect(b.x + dx, b.y + dy, b.width, b.height);

        // Neon Roof Trim / Accent
        ctx.strokeStyle = b.accentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(b.x + dx + 2, b.y + dy + 2, b.width - 4, b.height - 4);

        // Building Signage / Label
        if (b.label) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(b.label, b.x + dx + b.width / 2, b.y + dy + b.height / 2);
        }
      }
    }
  }

  drawWaypoint(ctx, wp) {
    ctx.save();
    ctx.translate(wp.x, wp.y);

    const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.5;
    ctx.strokeStyle = COLORS.neonPink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 32 + pulse * 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 0, 127, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 32 + pulse * 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▼', 0, 0);

    ctx.restore();
  }

  drawHUD(ctx, player, world, vehicles, camera, missions, gameState) {
    // 1. Top-Right Wanted Level Stars
    this.drawWantedStars(ctx, player.wantedLevel);

    // 2. Top-Right Health & Armor Bars & Cash
    this.drawStatsHUD(ctx, player);

    // 3. Bottom-Left Circular Minimap Radar
    this.drawMinimap(ctx, player, world, vehicles, missions);

    // 4. Mission Objective Banner (Top Center)
    if (missions && missions.currentMission) {
      this.drawMissionBanner(ctx, missions.currentMission, missions.statusMessage);
    }

    // 5. Speedometer & Radio station (if in vehicle)
    if (player.inVehicle) {
      this.drawSpeedometer(ctx, player.inVehicle);
      this.drawRadioDisplay(ctx);
    }
  }

  drawWantedStars(ctx, level) {
    const x = this.width - 180;
    const y = 30;
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';

    for (let i = 0; i < 5; i++) {
      if (i < level) {
        ctx.fillStyle = COLORS.wantedStar;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      }
      ctx.fillText('★', x + i * 30, y);
    }
  }

  drawStatsHUD(ctx, player) {
    const baseX = this.width - 240;
    const baseY = 65;

    // Cash Display
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`$${player.cash.toLocaleString()}`, this.width - 30, baseY);

    // Health Bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(baseX, baseY + 12, 210, 14);
    ctx.fillStyle = COLORS.health;
    ctx.fillRect(baseX, baseY + 12, (player.health / player.maxHealth) * 210, 14);

    // Armor Bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(baseX, baseY + 32, 210, 14);
    ctx.fillStyle = COLORS.armor;
    ctx.fillRect(baseX, baseY + 32, (player.armor / player.maxArmor) * 210, 14);

    // Weapon & Ammo Indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    const ammoCount = player.ammo[player.weapon] === Infinity ? '∞' : player.ammo[player.weapon];
    ctx.fillText(`${player.weapon.toUpperCase()} | ${ammoCount}`, this.width - 30, baseY + 70);
  }

  drawMinimap(ctx, player, world, vehicles, missions) {
    const mapSize = 160;
    const mapX = 30;
    const mapY = this.height - mapSize - 30;
    const radius = mapSize / 2;
    const centerX = mapX + radius;
    const centerY = mapY + radius;

    ctx.save();

    // Outer Radar Ring
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.neonCyan;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Clip to radar circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();

    const scale = 0.08;

    // Draw Roads on Radar
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 5;
    for (const r of world.roads) {
      const rx = centerX + (r.x + r.width / 2 - player.x) * scale;
      const ry = centerY + (r.y + r.height / 2 - player.y) * scale;
      if (r.type === 'horizontal') {
        ctx.beginPath();
        ctx.moveTo(rx - (r.width / 2) * scale, ry);
        ctx.lineTo(rx + (r.width / 2) * scale, ry);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(rx, ry - (r.height / 2) * scale);
        ctx.lineTo(rx, ry + (r.height / 2) * scale);
        ctx.stroke();
      }
    }

    // Draw Vehicles on Radar
    for (const v of vehicles) {
      const vx = centerX + (v.x - player.x) * scale;
      const vy = centerY + (v.y - player.y) * scale;
      ctx.fillStyle = v.isPolice ? COLORS.policeBlue : '#f8fafc';
      ctx.beginPath();
      ctx.arc(vx, vy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Mission Objective Blip
    if (missions && missions.currentWaypoint) {
      const wx = centerX + (missions.currentWaypoint.x - player.x) * scale;
      const wy = centerY + (missions.currentWaypoint.y - player.y) * scale;
      ctx.fillStyle = COLORS.neonPink;
      ctx.beginPath();
      ctx.arc(wx, wy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Blip
    ctx.fillStyle = '#fbbf24';
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(player.angle);
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  drawMissionBanner(ctx, mission, statusMsg) {
    const w = 520;
    const h = 54;
    const x = this.width / 2 - w / 2;
    const y = 25;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.neonPink;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = COLORS.neonPink;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MISSION: ${mission.title.toUpperCase()}`, this.width / 2, y + 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(statusMsg || mission.objective, this.width / 2, y + 40);
  }

  drawSpeedometer(ctx, v) {
    const x = this.width - 120;
    const y = this.height - 45;
    const mph = Math.floor(Math.abs(v.speed) * 12);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - 50, y - 25, 120, 48, 6);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${mph}`, x + 10, y);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('MPH', x + 10, y + 16);
  }

  drawRadioDisplay(ctx) {
    const x = this.width / 2;
    const y = this.height - 40;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(x - 140, y - 18, 280, 32, 6);
    ctx.fill();

    ctx.fillStyle = COLORS.neonCyan;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`♫ ${sound.getCurrentStation()} [R]`, x, y + 4);
  }

  drawTitleScreen(ctx) {
    ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.neonPink;
    ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
    ctx.fillText('SOL CORONA', this.width / 2, this.height / 2 - 80);

    ctx.fillStyle = COLORS.neonCyan;
    ctx.font = 'bold 36px "Trebuchet MS", sans-serif';
    ctx.fillText('VICE COAST', this.width / 2, this.height / 2 - 30);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText('WASD / Arrows to Move & Steer | F to Enter/Exit Vehicles', this.width / 2, this.height / 2 + 35);
    ctx.fillText('Space for Handbrake / Drift | Left Click to Fire | 1-4 Switch Weapons', this.width / 2, this.height / 2 + 65);
    ctx.fillText('R for Radio Stations | E for Horn | Escape to Pause', this.width / 2, this.height / 2 + 95);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('[ PRESS ENTER OR CLICK TO START CRIME EMPIRE ]', this.width / 2, this.height / 2 + 155);
  }

  drawPauseMenu(ctx) {
    ctx.fillStyle = 'rgba(8, 10, 16, 0.75)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.neonCyan;
    ctx.font = 'bold 42px "Trebuchet MS", sans-serif';
    ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.fillText('Game saved to browser safehouse storage.', this.width / 2, this.height / 2 + 15);
    ctx.fillText('Press ESCAPE to Resume Playing', this.width / 2, this.height / 2 + 55);
  }

  drawWastedScreen(ctx) {
    ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 56px "Trebuchet MS", sans-serif';
    ctx.fillText('WASTED', this.width / 2, this.height / 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Respawning at Vance Safehouse...', this.width / 2, this.height / 2 + 50);
  }
}
