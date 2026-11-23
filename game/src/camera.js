// Sol Corona: Vice Coast - Smooth Tracking Camera with Dynamic Zoom & Shake

export class Camera {
  constructor(viewportWidth, viewportHeight) {
    this.x = 2400;
    this.y = 2400;
    this.targetX = 2400;
    this.targetY = 2400;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.shakeAmount = 0;
    this.shakeDecay = 0.9;
  }

  resize(w, h) {
    this.viewportWidth = w;
    this.viewportHeight = h;
  }

  shake(amount) {
    this.shakeAmount = Math.min(30, this.shakeAmount + amount);
  }

  update(target, inVehicle = false, speed = 0) {
    if (!target) return;

    // Lead camera slightly in direction of movement or aim
    let leadX = 0;
    let leadY = 0;
    if (inVehicle) {
      leadX = Math.cos(target.angle) * speed * 18;
      leadY = Math.sin(target.angle) * speed * 18;
      this.targetZoom = Math.max(0.72, 1.0 - (speed / 12) * 0.28);
    } else {
      leadX = Math.cos(target.angle) * 35;
      leadY = Math.sin(target.angle) * 35;
      this.targetZoom = 1.05;
    }

    this.targetX = target.x + leadX;
    this.targetY = target.y + leadY;

    // Smooth lerp follow
    const lerpSpeed = inVehicle ? 0.08 : 0.12;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
    this.zoom += (this.targetZoom - this.zoom) * 0.05;

    // Apply screen shake
    if (this.shakeAmount > 0.1) {
      this.shakeAmount *= this.shakeDecay;
    } else {
      this.shakeAmount = 0;
    }
  }

  getOffset() {
    const shakeX = (Math.random() * 2 - 1) * this.shakeAmount;
    const shakeY = (Math.random() * 2 - 1) * this.shakeAmount;
    return {
      x: this.x + shakeX,
      y: this.y + shakeY,
      zoom: this.zoom,
    };
  }

  isVisible(boxX, boxY, boxW, boxH, margin = 100) {
    const halfW = (this.viewportWidth / 2) / this.zoom + margin;
    const halfH = (this.viewportHeight / 2) / this.zoom + margin;
    return (
      boxX + boxW >= this.x - halfW &&
      boxX <= this.x + halfW &&
      boxY + boxH >= this.y - halfH &&
      boxY <= this.y + halfH
    );
  }
}
