/**
 * Real-time 2D Orbital Mechanics Visualizer
 * Renders celestial body, dynamic satellite orbit, velocity vectors, telemetry lines,
 * and particles on an HTML5 high-DPI Canvas.
 */

export class OrbitVisualizer {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    // State
    this.altitudeKm = 420;
    this.body = options.body || {
      id: 'earth',
      name: 'Earth',
      mass: 5.97219e24,
      radius: 6371.0,
      color: '#00f0ff',
      glowColor: 'rgba(0, 240, 255, 0.4)',
      atmosphereHeight: 100
    };
    
    // Orbit angle in radians
    this.orbitAngle = 0;
    this.planetRotation = 0;
    this.lastTimestamp = performance.now();
    
    // Simulation controls
    this.simSpeedMultiplier = 100; // default accelerated
    this.isPaused = false;
    this.showVectors = true;
    this.showDimensions = true;
    this.showAtmosphere = true;
    
    // Camera view & Pan/Zoom
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    
    // Beacon animation
    this.beaconRadius = 0;
    
    // Stars background
    this.stars = this.generateStars(140);
    
    // Bindings
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);
    
    this.setupInteractivity();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    
    // Start animation loop
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        radius: Math.random() * 1.4 + 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.005
      });
    }
    return stars;
  }

  setupInteractivity() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.panX;
      this.dragStartY = e.clientY - this.panY;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.dragStartX;
      this.panY = e.clientY - this.dragStartY;
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
      }
    });

    // Touch support for mobile/tablet
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX - this.panX;
        this.dragStartY = e.touches[0].clientY - this.panY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      this.panX = e.touches[0].clientX - this.dragStartX;
      this.panY = e.touches[0].clientY - this.dragStartY;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Zoom on wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      this.targetZoom = Math.min(Math.max(this.targetZoom * zoomFactor, 0.02), 50.0);
    }, { passive: false });
  }

  handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = Math.max(340, rect.height || 420);
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.ctx.scale(dpr, dpr);
    this.autoFit();
  }

  updateState(altitudeKm, body) {
    const prevBody = this.body;
    this.altitudeKm = altitudeKm;
    this.body = body;
    
    // If body changed or altitude changed drastically, adapt zoom
    if (prevBody.id !== body.id) {
      this.autoFit();
    }
  }

  autoFit() {
    this.panX = 0;
    this.panY = 0;
    const totalR = this.body.radius + this.altitudeKm;
    const minDimension = Math.min(this.width, this.height);
    // Fit orbit with comfortable margin (padding ~ 18%)
    const desiredPixelRadius = (minDimension / 2) * 0.72;
    this.targetZoom = desiredPixelRadius / totalR;
    this.zoom = this.targetZoom;
  }

  resetPan() {
    this.panX = 0;
    this.panY = 0;
  }

  setZoom(factor) {
    this.targetZoom = Math.min(Math.max(this.targetZoom * factor, 0.02), 50.0);
  }

  setSimSpeed(multiplier) {
    this.simSpeedMultiplier = multiplier;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  animate(now) {
    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = now;

    // Smooth zoom interpolation
    this.zoom += (this.targetZoom - this.zoom) * 0.12;

    // Orbital physics angular velocity
    // Period T = 2 * pi * sqrt(r^3 / mu)
    // omega = 2 * pi / T
    if (!this.isPaused) {
      const r_meters = (this.body.radius + this.altitudeKm) * 1000;
      const mu = 6.67430e-11 * this.body.mass;
      const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(r_meters, 3) / mu);
      
      const realOmega = (2 * Math.PI) / Math.max(orbitalPeriod, 1);
      // Advance angle based on simulation multiplier
      this.orbitAngle = (this.orbitAngle + realOmega * dt * this.simSpeedMultiplier) % (2 * Math.PI);
      
      // Central body rotation (prograde rotation)
      this.planetRotation = (this.planetRotation + 0.00007292 * dt * this.simSpeedMultiplier) % (2 * Math.PI);
      
      // Radar beacon animation
      this.beaconRadius = (this.beaconRadius + dt * 25) % 35;
    }

    this.render();
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const centerX = w / 2 + this.panX;
    const centerY = h / 2 + this.panY;

    // Clear background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Draw deep space starfield
    this.renderStarfield(ctx, w, h);

    // Draw aerospace coordinate grid / reticle
    this.renderGrid(ctx, centerX, centerY, w, h);

    // Calculate pixel radii based on current zoom
    const bodyPixelRadius = Math.max(this.body.radius * this.zoom, 4);
    const orbitPixelRadius = (this.body.radius + this.altitudeKm) * this.zoom;

    // 1. Draw atmospheric glow & Kármán line (if applicable)
    if (this.showAtmosphere && this.body.atmosphereHeight > 0) {
      const atmoPixelRadius = (this.body.radius + this.body.atmosphereHeight) * this.zoom;
      
      // Outer glow
      const atmoGrad = ctx.createRadialGradient(
        centerX, centerY, bodyPixelRadius * 0.9,
        centerX, centerY, atmoPixelRadius * 1.5
      );
      atmoGrad.addColorStop(0, this.body.glowColor || 'rgba(0, 240, 255, 0.4)');
      atmoGrad.addColorStop(0.6, 'rgba(0, 240, 255, 0.12)');
      atmoGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, atmoPixelRadius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = atmoGrad;
      ctx.fill();

      // Atmospheric boundary line
      if (atmoPixelRadius - bodyPixelRadius > 2) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, atmoPixelRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 2. Draw Orbit Track
    this.renderOrbitTrack(ctx, centerX, centerY, orbitPixelRadius);

    // 3. Draw Dimension Lines (Radius R, Altitude h)
    if (this.showDimensions) {
      this.renderDimensionLines(ctx, centerX, centerY, bodyPixelRadius, orbitPixelRadius);
    }

    // 4. Draw Central Celestial Body
    this.renderCentralBody(ctx, centerX, centerY, bodyPixelRadius);

    // 5. Draw Satellite, Velocity & Acceleration Vectors
    this.renderSatellite(ctx, centerX, centerY, orbitPixelRadius);

    // 6. Draw HUD Telemetry Overlay on Canvas
    this.renderHUDOverlay(ctx, w, h);
  }

  renderStarfield(ctx, w, h) {
    ctx.save();
    for (const star of this.stars) {
      const sx = star.x * w;
      const sy = star.y * h;
      star.alpha += Math.sin(performance.now() * star.twinkleSpeed) * 0.005;
      const clampedAlpha = Math.max(0.15, Math.min(0.9, star.alpha));
      
      ctx.beginPath();
      ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 232, 240, ${clampedAlpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  renderGrid(ctx, cx, cy, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 1;

    // Crosshairs through center
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Radar distance rings
    const ringSpacing = 100;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    for (let r = ringSpacing; r < Math.max(w, h); r += ringSpacing) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderOrbitTrack(ctx, cx, cy, orbitRadius) {
    ctx.save();
    
    // Outer subtle glow
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Main orbital trajectory
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Direction indicators (subtle dots along orbit)
    ctx.beginPath();
    ctx.arc(cx, cy, orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 18]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  renderDimensionLines(ctx, cx, cy, bodyR, orbitR) {
    ctx.save();
    // Dimension line along 45 degree angle
    const angle = -Math.PI / 4;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Planet Radius line (0 to R)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + bodyR * cosA, cy + bodyR * sinA);
    ctx.stroke();

    // Altitude Line (R to r)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx + bodyR * cosA, cy + bodyR * sinA);
    ctx.lineTo(cx + orbitR * cosA, cy + orbitR * sinA);
    ctx.stroke();

    // End ticks
    const tickLen = 4;
    const perpX = -sinA * tickLen;
    const perpY = cosA * tickLen;

    ctx.beginPath();
    ctx.moveTo(cx + bodyR * cosA - perpX, cy + bodyR * sinA - perpY);
    ctx.lineTo(cx + bodyR * cosA + perpX, cy + bodyR * sinA + perpY);
    ctx.moveTo(cx + orbitR * cosA - perpX, cy + orbitR * sinA - perpY);
    ctx.lineTo(cx + orbitR * cosA + perpX, cy + orbitR * sinA + perpY);
    ctx.stroke();

    // Altitude label
    if (orbitR - bodyR > 18) {
      const midX = cx + ((bodyR + orbitR) / 2) * cosA;
      const midY = cy + ((bodyR + orbitR) / 2) * sinA;
      
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(midX + 8, midY - 10, 84, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(midX + 8, midY - 10, 84, 18);

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`h = ${Math.round(this.altitudeKm).toLocaleString()} km`, midX + 12, midY + 3);
    }

    ctx.restore();
  }

  renderCentralBody(ctx, cx, cy, radius) {
    ctx.save();

    // Body shadow / 3D shading gradient
    const lightAngle = -Math.PI / 3;
    const lightX = cx + Math.cos(lightAngle) * radius * 0.45;
    const lightY = cy + Math.sin(lightAngle) * radius * 0.45;

    const bodyGrad = ctx.createRadialGradient(
      lightX, lightY, radius * 0.05,
      cx, cy, radius
    );

    if (this.body.id === 'earth') {
      bodyGrad.addColorStop(0, '#38bdf8');
      bodyGrad.addColorStop(0.3, '#0284c7');
      bodyGrad.addColorStop(0.7, '#0f172a');
      bodyGrad.addColorStop(1, '#020617');
    } else if (this.body.id === 'mars') {
      bodyGrad.addColorStop(0, '#fdba74');
      bodyGrad.addColorStop(0.4, '#ea580c');
      bodyGrad.addColorStop(0.8, '#7c2d12');
      bodyGrad.addColorStop(1, '#180703');
    } else if (this.body.id === 'moon') {
      bodyGrad.addColorStop(0, '#f1f5f9');
      bodyGrad.addColorStop(0.5, '#94a3b8');
      bodyGrad.addColorStop(0.85, '#334155');
      bodyGrad.addColorStop(1, '#0f172a');
    } else if (this.body.id === 'jupiter') {
      bodyGrad.addColorStop(0, '#fef08a');
      bodyGrad.addColorStop(0.35, '#d97706');
      bodyGrad.addColorStop(0.7, '#92400e');
      bodyGrad.addColorStop(1, '#451a03');
    } else if (this.body.id === 'sun') {
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.2, '#fef08a');
      bodyGrad.addColorStop(0.6, '#f59e0b');
      bodyGrad.addColorStop(1, '#b45309');
    } else {
      bodyGrad.addColorStop(0, '#c084fc');
      bodyGrad.addColorStop(0.5, '#7e22ce');
      bodyGrad.addColorStop(1, '#1e1b4b');
    }

    // Draw main body sphere
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Procedural surface details (continents/craters/bands) if radius is large enough
    if (radius > 16) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Rotate surface according to planet rotation
      ctx.translate(cx, cy);
      ctx.rotate(this.planetRotation);

      if (this.body.id === 'earth') {
        // Draw stylized continents
        ctx.fillStyle = 'rgba(34, 197, 94, 0.45)';
        ctx.beginPath();
        ctx.arc(-radius * 0.3, -radius * 0.2, radius * 0.38, 0, Math.PI * 2);
        ctx.arc(radius * 0.35, radius * 0.25, radius * 0.45, 0, Math.PI * 2);
        ctx.arc(radius * 0.1, -radius * 0.4, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // White polar caps
        ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
        ctx.beginPath();
        ctx.arc(0, -radius * 0.88, radius * 0.32, 0, Math.PI * 2);
        ctx.arc(0, radius * 0.88, radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.body.id === 'jupiter') {
        // Jovian cloud bands
        ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
        for (let b = -radius * 0.8; b < radius * 0.8; b += radius * 0.3) {
          ctx.fillRect(-radius, b, radius * 2, radius * 0.12);
        }
        // Great Red Spot
        ctx.fillStyle = 'rgba(185, 28, 28, 0.7)';
        ctx.beginPath();
        ctx.ellipse(radius * 0.3, radius * 0.2, radius * 0.22, radius * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.body.id === 'moon') {
        // Lunar impact craters
        ctx.fillStyle = 'rgba(51, 65, 85, 0.5)';
        ctx.beginPath();
        ctx.arc(-radius * 0.4, -radius * 0.2, radius * 0.18, 0, Math.PI * 2);
        ctx.arc(radius * 0.3, radius * 0.3, radius * 0.22, 0, Math.PI * 2);
        ctx.arc(radius * 0.1, -radius * 0.45, radius * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Equatorial guideline & axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();

    // Central body label
    ctx.font = '600 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(this.body.name.toUpperCase(), cx, cy + 4);

    ctx.restore();
  }

  renderSatellite(ctx, cx, cy, orbitRadius) {
    ctx.save();
    const satX = cx + Math.cos(this.orbitAngle) * orbitRadius;
    const satY = cy + Math.sin(this.orbitAngle) * orbitRadius;

    // 1. Radar telemetry ping wave
    ctx.beginPath();
    ctx.arc(satX, satY, this.beaconRadius, 0, Math.PI * 2);
    const waveAlpha = Math.max(0, 1 - this.beaconRadius / 35);
    ctx.strokeStyle = `rgba(0, 240, 255, ${waveAlpha * 0.6})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 2. Velocity vector arrow (tangent to orbit)
    if (this.showVectors) {
      // Tangent direction is (-sin(theta), cos(theta))
      const tanX = -Math.sin(this.orbitAngle);
      const tanY = Math.cos(this.orbitAngle);
      const vecLength = 55;
      const arrowTipX = satX + tanX * vecLength;
      const arrowTipY = satY + tanY * vecLength;

      ctx.strokeStyle = '#10b981'; // Green for velocity
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(arrowTipX, arrowTipY);
      ctx.stroke();

      // Arrow head
      const arrowAngle = Math.atan2(tanY, tanX);
      const headLen = 8;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo(arrowTipX, arrowTipY);
      ctx.lineTo(
        arrowTipX - headLen * Math.cos(arrowAngle - Math.PI / 6),
        arrowTipY - headLen * Math.sin(arrowAngle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowTipX - headLen * Math.cos(arrowAngle + Math.PI / 6),
        arrowTipY - headLen * Math.sin(arrowAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Velocity label badge
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('v⃗ (velocity)', arrowTipX + 8, arrowTipY + 4);

      // 3. Gravitational acceleration vector (inward towards center)
      const radX = (cx - satX) / orbitRadius;
      const radY = (cy - satY) / orbitRadius;
      const gVecLen = 35;
      const gTipX = satX + radX * gVecLen;
      const gTipY = satY + radY * gVecLen;

      ctx.strokeStyle = '#f43f5e'; // Rose/Red for gravity
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(gTipX, gTipY);
      ctx.stroke();

      const gAngle = Math.atan2(radY, radX);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(gTipX, gTipY);
      ctx.lineTo(
        gTipX - 6 * Math.cos(gAngle - Math.PI / 6),
        gTipY - 6 * Math.sin(gAngle - Math.PI / 6)
      );
      ctx.lineTo(
        gTipX - 6 * Math.cos(gAngle + Math.PI / 6),
        gTipY - 6 * Math.sin(gAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f43f5e';
      ctx.fillText('g⃗ (gravity)', gTipX - 12, gTipY - 6);
    }

    // 4. Stylized Satellite Body
    ctx.translate(satX, satY);
    ctx.rotate(this.orbitAngle + Math.PI / 2); // Orient along travel direction

    // Solar panels (left & right wings)
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    
    // Left solar array
    ctx.fillRect(-18, -4, 11, 8);
    ctx.strokeRect(-18, -4, 11, 8);
    
    // Right solar array
    ctx.fillRect(7, -4, 11, 8);
    ctx.strokeRect(7, -4, 11, 8);

    // Central satellite bus / chassis
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-5, -6, 10, 12);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -6, 10, 12);

    // Antenna dish
    ctx.beginPath();
    ctx.arc(0, -9, 3, Math.PI, 0);
    ctx.strokeStyle = '#f8fafc';
    ctx.stroke();

    ctx.restore();
  }

  renderHUDOverlay(ctx, w, h) {
    ctx.save();
    
    // Status Indicator
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(14, 14, 170, 32);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, 170, 32);

    // Pulsing green LED dot
    const isLive = !this.isPaused;
    ctx.beginPath();
    ctx.arc(28, 30, 4, 0, Math.PI * 2);
    ctx.fillStyle = isLive ? '#22c55e' : '#f59e0b';
    ctx.fill();

    ctx.font = '600 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(isLive ? 'ORBIT SIMULATION LIVE' : 'SIMULATION PAUSED', 40, 34);

    // Scale & Zoom readout (Bottom-left)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(14, h - 38, 220, 24);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.strokeRect(14, h - 38, 220, 24);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Scale: 1px = ${(1 / this.zoom).toFixed(1)} km | Zoom: ${this.zoom.toFixed(2)}x`, 22, h - 22);

    ctx.restore();
  }

  destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
  }
}
