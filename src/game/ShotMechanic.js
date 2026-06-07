// ============================================================
// ShotMechanic.js — Power bar + ball arc shot system
// Zones: Green (82-100%) = 3pt, Yellow (60-81%) = 2pt,
//        Orange (35-59%) = 1pt, Red (0-34%) = miss
// ============================================================

export class ShotMechanic {
  constructor() {
    this.power = 0;            // 0–100
    this.direction = 1;        // oscillation direction
    this.speed = 60;           // power units per second
    this.isActive = false;
    this._interval = null;
    this.onPowerChange = null; // callback(power, zone)
  }

  // Zones definition
  static ZONES = {
    green:  { min: 82, max: 100, label: 'PERFECT!',  points: 3, color: '#22C55E', probability: 1.00 },
    yellow: { min: 60, max: 81,  label: 'GOOD!',     points: 2, color: '#EAB308', probability: 0.80 },
    orange: { min: 35, max: 59,  label: 'OK',        points: 1, color: '#F97316', probability: 0.40 },
    red:    { min: 0,  max: 34,  label: 'AIR BALL',  points: 0, color: '#EF4444', probability: 0.00 }
  };

  getZone(power) {
    for (const [name, zone] of Object.entries(ShotMechanic.ZONES)) {
      if (power >= zone.min && power <= zone.max) return { name, ...zone };
    }
    return { name: 'red', ...ShotMechanic.ZONES.red };
  }

  start(onPowerChange) {
    this.power = 0;
    this.direction = 1;
    this.isActive = true;
    this.onPowerChange = onPowerChange;

    // Update every 16ms (~60fps)
    const tickMs = 16;
    const powerPerTick = (this.speed / 1000) * tickMs;

    this._interval = setInterval(() => {
      this.power += this.direction * powerPerTick;

      if (this.power >= 100) {
        this.power = 100;
        this.direction = -1;
      } else if (this.power <= 0) {
        this.power = 0;
        this.direction = 1;
      }

      const zone = this.getZone(this.power);
      if (this.onPowerChange) this.onPowerChange(Math.round(this.power), zone);
    }, tickMs);
  }

  // Release at current power — returns shot result
  release() {
    if (!this.isActive) return null;
    this.stop();

    const power = Math.round(this.power);
    const zone = this.getZone(power);

    // Random roll against zone probability
    const scored = Math.random() <= zone.probability;
    const pointsEarned = scored ? zone.points : 0;

    return {
      power,
      zone: zone.name,
      label: zone.label,
      scored,
      points: pointsEarned,
      color: zone.color
    };
  }

  // Auto-timeout: if player doesn't release, treat as 0-power miss
  timeout() {
    this.stop();
    return {
      power: 0,
      zone: 'red',
      label: 'TOO SLOW!',
      scored: false,
      points: 0,
      color: '#EF4444',
      timedOut: true
    };
  }

  stop() {
    this.isActive = false;
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  // Ball arc trajectory for Phaser tween
  // Returns array of {x,y} waypoints for the ball's path
  getArcPath(startX, startY, hoopX, hoopY) {
    const midX = (startX + hoopX) / 2;
    const arcHeight = Math.abs(hoopY - startY) * 0.7 + 80;
    const midY = Math.min(startY, hoopY) - arcHeight;

    // Bezier control points
    return {
      startX, startY,
      ctrl1X: startX + (midX - startX) * 0.3,
      ctrl1Y: midY,
      ctrl2X: midX,
      ctrl2Y: midY,
      endX: hoopX,
      endY: hoopY
    };
  }

  // Generate Phaser tween keyframes for ball arc
  getBallTweenConfig(scene, ballObj, startX, startY, hoopX, hoopY, duration, onComplete) {
    const arcPath = this.getArcPath(startX, startY, hoopX, hoopY);

    // Use Phaser's path following for smooth arc
    const path = new Phaser.Curves.Path(startX, startY);
    path.cubicBezierTo(
      arcPath.ctrl1X, arcPath.ctrl1Y,
      arcPath.ctrl2X, arcPath.ctrl2Y,
      arcPath.endX, arcPath.endY
    );

    return {
      targets: ballObj,
      duration: duration,
      ease: 'Cubic.easeIn',
      props: {
        x: { value: hoopX },
        y: { value: hoopY }
      },
      onUpdate: (tween) => {
        // Follow the bezier arc manually using progress
        const t = tween.progress;
        const pos = path.getPoint(t);
        if (pos) {
          ballObj.x = pos.x;
          ballObj.y = pos.y;
          // Spin the ball
          ballObj.angle += 8;
        }
      },
      onComplete: onComplete
    };
  }
}
