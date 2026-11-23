// Sol Corona: Vice Coast - World City Generator & Spatial Map
import { WORLD, COLORS } from './config.js';

export class World {
  constructor() {
    this.width = WORLD.width;
    this.height = WORLD.height;
    this.roads = [];
    this.intersections = [];
    this.buildings = [];
    this.props = []; // Palm trees, street lamps, fire hydrants
    this.landmarks = [];
    this.spawnPoints = [];

    this.generateCity();
  }

  generateCity() {
    const step = WORLD.blockSize + WORLD.roadWidth;
    const cols = Math.floor(this.width / step);
    const rows = Math.floor(this.height / step);

    // 1. Generate grid roads and intersections
    for (let c = 0; c <= cols; c++) {
      const x = c * step + WORLD.roadWidth / 2;
      this.roads.push({
        type: 'vertical',
        x: x - WORLD.roadWidth / 2,
        y: 0,
        width: WORLD.roadWidth,
        height: this.height,
        lanes: 4,
      });
    }

    for (let r = 0; r <= rows; r++) {
      const y = r * step + WORLD.roadWidth / 2;
      this.roads.push({
        type: 'horizontal',
        x: 0,
        y: y - WORLD.roadWidth / 2,
        width: this.width,
        height: WORLD.roadWidth,
        lanes: 4,
      });
    }

    // Intersections for traffic AI routing
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        const x = c * step + WORLD.roadWidth / 2;
        const y = r * step + WORLD.roadWidth / 2;
        this.intersections.push({ x, y, radius: WORLD.roadWidth / 2 });
      }
    }

    // 2. City Blocks with Architecture and Special Locations
    const buildingColors = [
      { roof: '#1e293b', facade: '#0f172a', accent: COLORS.neonCyan },
      { roof: '#334155', facade: '#1e293b', accent: COLORS.neonPink },
      { roof: '#3b4252', facade: '#2e3440', accent: COLORS.neonOrange },
      { roof: '#475569', facade: '#334155', accent: '#38bdf8' },
      { roof: '#27272a', facade: '#18181b', accent: COLORS.neonPurple },
    ];

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const blockX = c * step + WORLD.roadWidth;
        const blockY = r * step + WORLD.roadWidth;
        const blockW = WORLD.blockSize;
        const blockH = WORLD.blockSize;

        // Subdivide block into 2x2 or 4 lots
        const subW = (blockW - 16) / 2;
        const subH = (blockH - 16) / 2;

        for (let sx = 0; sx < 2; sx++) {
          for (let sy = 0; sy < 2; sy++) {
            const bX = blockX + sx * (subW + 8) + 4;
            const bY = blockY + sy * (subH + 8) + 4;
            const palette = buildingColors[(c * 3 + r * 5 + sx + sy * 2) % buildingColors.length];
            const height2D = 40 + ((c * 7 + r * 11 + sx * 3) % 45); // Height extrusion for 2.5D

            // Check if special landmark
            let isSafehouse = (c === 5 && r === 5 && sx === 0 && sy === 0);
            let isRespray = (c === 3 && r === 4 && sx === 1 && sy === 1);
            let isClub = (c === 6 && r === 4 && sx === 0 && sy === 1);
            let isBank = (c === 4 && r === 6 && sx === 1 && sy === 0);

            let label = null;
            if (isSafehouse) label = 'Safehouse & Garage';
            else if (isRespray) label = "Pay 'n' Spray Respray";
            else if (isClub) label = 'The Neon Flamingo Lounge';
            else if (isBank) label = 'Corona First Depository';

            this.buildings.push({
              x: bX,
              y: bY,
              width: subW,
              height: subH,
              height2D: height2D,
              roofColor: palette.roof,
              facadeColor: palette.facade,
              accentColor: palette.accent,
              label: label,
              isSafehouse,
              isRespray,
              isClub,
              isBank,
            });

            // Add palm trees along sidewalk perimeter
            if (sx === 0 && sy === 0) {
              this.props.push({ type: 'palm', x: bX - 14, y: bY + subH / 2 });
              this.props.push({ type: 'palm', x: bX + subW / 2, y: bY - 14 });
            }
          }
        }
      }
    }

    // Special landmarks list
    this.landmarks = [
      { name: 'Vance Safehouse', x: 2360, y: 2360, type: 'safehouse', icon: 'S' },
      { name: 'Speedy Respray Garage', x: 1540, y: 1960, type: 'respray', icon: 'W' },
      { name: 'Neon Flamingo Club', x: 2840, y: 1960, type: 'mission', icon: 'M' },
      { name: 'Corona Ocean Port', x: 800, y: 3800, type: 'docks', icon: 'D' },
    ];
  }

  isPointInBuilding(x, y) {
    for (const b of this.buildings) {
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
        return b;
      }
    }
    return null;
  }

  checkCollision(x, y, radius = 16) {
    // Boundary collision
    if (x - radius < 0 || x + radius > this.width || y - radius < 0 || y + radius > this.height) {
      return { collided: true, type: 'boundary' };
    }

    // Building collision
    for (const b of this.buildings) {
      if (
        x + radius >= b.x &&
        x - radius <= b.x + b.width &&
        y + radius >= b.y &&
        y - radius <= b.y + b.height
      ) {
        // Find nearest push-out edge
        const overlapL = (x + radius) - b.x;
        const overlapR = (b.x + b.width) - (x - radius);
        const overlapT = (y + radius) - b.y;
        const overlapB = (b.y + b.height) - (y - radius);
        const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);

        let pushX = 0;
        let pushY = 0;
        if (minOverlap === overlapL) pushX = -overlapL;
        else if (minOverlap === overlapR) pushX = overlapR;
        else if (minOverlap === overlapT) pushY = -overlapT;
        else pushY = overlapB;

        return { collided: true, building: b, pushX, pushY };
      }
    }

    return { collided: false };
  }
}
