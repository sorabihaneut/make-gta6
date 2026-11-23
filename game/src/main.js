// Sol Corona: Vice Coast - Main Game Engine Entrypoint
// Substantially revised with full combat, police pursuit, missions, save/load, and interactive menus.

import { World } from './world.js';
import { Player, Vehicle, Pedestrian } from './entities.js';
import { Camera } from './camera.js';
import { InputManager } from './input.js';
import { Renderer } from './render.js';
import { sound } from './audio.js';
import { PoliceSystem } from './police.js';
import { CombatSystem } from './combat.js';
import { MissionManager } from './missions.js';
import { SaveManager } from './save.js';

export class GameApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.world = new World();
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.input = new InputManager();
    this.renderer = new Renderer(this.canvas);
    this.police = new PoliceSystem();
    this.combat = new CombatSystem();
    this.missions = new MissionManager();
    this.saveManager = new SaveManager();

    this.gameState = 'playing'; // 'title', 'playing', 'pause'

    // Initial Player Spawn at Vance Safehouse
    this.player = new Player(2400, 2400);

    // Initial World Vehicles across the city
    this.vehicles = [
      new Vehicle('sport', 2460, 2400, 0),
      new Vehicle('muscle', 2340, 2480, Math.PI / 2),
      new Vehicle('sedan', 2420, 2100, Math.PI),
      new Vehicle('police', 2800, 2400, 0),
      new Vehicle('van', 1980, 2400, -Math.PI / 2),
      new Vehicle('sedan', 1600, 1960, 0),
      new Vehicle('sport', 2840, 1900, Math.PI),
    ];

    // Initial Pedestrians
    this.pedestrians = [];
    for (let i = 0; i < 35; i++) {
      const px = 1800 + Math.random() * 1200;
      const py = 1800 + Math.random() * 1200;
      if (!this.world.isPointInBuilding(px, py)) {
        this.pedestrians.push(new Pedestrian(px, py));
      }
    }

    // Try loading saved game
    this.saveManager.load(this.player, this.missions);

    this.lastTime = performance.now();
    this.isRunning = true;
    this.respawnTimer = 0;

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('click', () => {
      sound.init();
      sound.resume();
      if (this.gameState === 'title') this.gameState = 'playing';
    });

    this.setupShotAutoPilot();
    this.onResize();
    requestAnimationFrame((t) => this.loop(t));
  }

  setupShotAutoPilot() {
    // If URL has ?shot=... set up specific scene for screenshots
    const urlParams = new URLSearchParams(window.location.search);
    const shot = urlParams.get('shot');
    if (shot === 'chase' || shot === '1' || shot === 'start') {
      // High action police chase screenshot
      const sportsCar = this.vehicles[0];
      this.player.enterVehicle(sportsCar);
      this.player.wantedLevel = 3;
      sportsCar.speed = 8.5;
      sportsCar.angle = 0.2;
      sportsCar.addSkidMark();
      // Spawn pursuing police cruisers close behind
      const p1 = new Vehicle('police', sportsCar.x - 120, sportsCar.y + 20, 0.15);
      p1.speed = 8.2;
      const p2 = new Vehicle('police', sportsCar.x - 220, sportsCar.y - 30, 0.25);
      p2.speed = 8.0;
      this.vehicles.push(p1, p2);
      this.police.policeUnits.push(p1, p2);
      this.missions.currentMission.title = 'Hot Pursuit';
      this.missions.currentMission.objective = 'Evade SCPD Tactical Cruiser pursuit to safehouse!';
    } else if (shot === 'combat' || shot === '2' || shot === 'play') {
      // On-foot shootout scene
      this.player.x = 2440;
      this.player.y = 2380;
      this.player.weapon = 'smg';
      this.player.wantedLevel = 2;
      this.combat.fireWeapon(this.player, 2700, 2380, true);
      this.combat.addBlood(2560, 2380);
      this.combat.addSparks(2600, 2370);
    } else if (shot === 'safehouse' || shot === '3' || shot === 'end') {
      // Safehouse garage mission completion scene
      this.player.x = 2360;
      this.player.y = 2360;
      this.player.cash = 18500;
      this.missions.statusMessage = 'MISSION COMPLETE! +$5,000 | GAME SAVED';
      this.missions.bannerTimer = 600;
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.resize(w, h);
    this.renderer.resize(w, h);
  }

  loop(currentTime) {
    const dt = Math.min(32, currentTime - this.lastTime);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    if (this.isRunning) {
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  update(dt) {
    // Toggle Pause
    if (this.input.isPauseToggle()) {
      if (this.gameState === 'playing') {
        this.gameState = 'pause';
        this.saveManager.save(this.player, this.missions);
      } else if (this.gameState === 'pause') {
        this.gameState = 'playing';
      }
    }

    if (this.gameState !== 'playing') return;

    this.input.updateWorldMouse(this.camera);

    // Weapon Switching: 1: Fists, 2: Pistol, 3: SMG, 4: Shotgun
    if (this.input.wasPressed('Digit1')) this.player.weapon = 'fists';
    if (this.input.wasPressed('Digit2')) this.player.weapon = 'pistol';
    if (this.input.wasPressed('Digit3')) this.player.weapon = 'smg';
    if (this.input.wasPressed('Digit4')) this.player.weapon = 'shotgun';

    // Radio station cycle
    if (this.input.isRadioNext()) {
      sound.nextRadioStation();
    }

    // Player Shooting (when on foot)
    if (!this.player.inVehicle && !this.player.isDead && this.input.mouse.down) {
      this.combat.fireWeapon(this.player, this.input.mouse.worldX, this.input.mouse.worldY, true);
    }

    // Player Death & Respawn
    if (this.player.isDead) {
      this.respawnTimer++;
      if (this.respawnTimer > 180) {
        this.respawnTimer = 0;
        this.player.x = 2400;
        this.player.y = 2400;
        this.player.health = 100;
        this.player.armor = 25;
        this.player.isDead = false;
        this.player.inVehicle = null;
        this.police.clearWanted(this.player);
      }
    }

    // Update Player & Vehicles
    this.player.update(this.input, this.world, this.vehicles);

    for (const v of this.vehicles) {
      if (v !== this.player.inVehicle) {
        v.update(this.input, this.world);
      }
    }

    // Update Pedestrians
    for (const p of this.pedestrians) {
      p.update(this.world, this.player, this.vehicles);
    }

    // Update Police AI & Pursuit
    this.police.update(this.world, this.player, this.vehicles, dt);

    // Update Combat & Projectiles
    this.combat.update(this.world, this.player, this.vehicles, this.pedestrians, this.camera);

    // Update Missions System
    this.missions.update(this.player, this.police, this.world);

    // Update Camera follow
    const targetEntity = this.player.inVehicle || this.player;
    const currentSpeed = this.player.inVehicle ? this.player.inVehicle.speed : this.player.speed;
    this.camera.update(targetEntity, !!this.player.inVehicle, Math.abs(currentSpeed));
  }

  render() {
    this.renderer.render(
      this.world,
      this.player,
      this.camera,
      this.vehicles,
      this.pedestrians,
      this.combat,
      this.police,
      this.missions,
      this.gameState
    );
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new GameApp();
});
