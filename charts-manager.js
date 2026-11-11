/**
 * Interactive Aerospace Charts Manager
 * Handles Chart.js instances for:
 *   1. Orbital Radius vs. Orbital Speed (r vs v)
 *   2. Orbital Radius vs. Time Period (r vs T)
 * Includes dynamic markers for active user orbital radius, range switching, and scale toggling.
 * Includes automatic retry and pure Canvas 2D fallback rendering to guarantee visual display under any conditions.
 */

import { generateOrbitalCurves, calculateOrbit } from './orbital-physics.js';

export class ChartsManager {
  constructor(speedCanvasId, periodCanvasId) {
    this.speedCanvas = document.getElementById(speedCanvasId);
    this.periodCanvas = document.getElementById(periodCanvasId);
    
    this.speedChart = null;
    this.periodChart = null;
    this.retryCount = 0;
    
    // View state
    this.currentBody = null;
    this.currentAltitude = 420;
    this.currentRange = 'meo'; // 'leo', 'meo', 'lunar'
    this.scaleType = 'linear';  // 'linear' or 'logarithmic'
    this.periodUnit = 'hours';  // 'hours' or 'minutes'
    
    this.initCharts();
  }

  getRangeBounds(body) {
    const R = (body && body.radius) ? Number(body.radius) : 6371.0;
    switch (this.currentRange) {
      case 'leo':
        return { min: R + 100, max: R + 2500, steps: 80 };
      case 'lunar':
        return { min: R + 100, max: Math.max(420000, R + 400000), steps: 120 };
      case 'meo':
      default:
        return { min: R + 100, max: Math.max(50000, R + 45000), steps: 100 };
    }
  }

  initCharts() {
    if (!this.speedCanvas || !this.periodCanvas) {
      this.speedCanvas = document.getElementById('chart-speed-canvas');
      this.periodCanvas = document.getElementById('chart-period-canvas');
    }

    if (!window.Chart) {
      if (this.retryCount < 40) {
        this.retryCount++;
        setTimeout(() => this.initCharts(), 100);
      }
      return;
    }

    try {
      // Default global Chart.js dark aerospace theme styling
      Chart.defaults.color = '#94a3b8';
      Chart.defaults.font.family = '"JetBrains Mono", monospace';
      Chart.defaults.borderColor = 'rgba(51, 65, 85, 0.4)';

      if (!this.speedChart && this.speedCanvas) {
        this.speedChart = this.createSpeedChart();
      }
      if (!this.periodChart && this.periodCanvas) {
        this.periodChart = this.createPeriodChart();
      }

      if (this.currentBody) {
        this.update(this.currentBody, this.currentAltitude);
      }
    } catch (e) {
      console.warn('Chart.js init failed, falling back to Canvas 2D:', e);
      if (this.currentBody) {
        this.renderCanvasFallback(this.currentBody, this.currentAltitude);
      }
    }
  }

  createSpeedChart() {
    const ctx = this.speedCanvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.01)');

    return new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Orbital Speed (km/s)',
            data: [],
            borderColor: '#00f0ff',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#00f0ff',
            pointHoverBorderColor: '#ffffff',
            tension: 0.25
          },
          {
            label: 'Active Radius',
            data: [],
            borderColor: '#ffffff',
            backgroundColor: '#00f0ff',
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9,
            pointBorderColor: '#ffffff',
            pointBackgroundColor: '#00f0ff',
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: {
          intersect: false,
          mode: 'nearest'
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              boxWidth: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#38bdf8',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const r = Number(context.parsed.x).toLocaleString();
                const spd = Number(context.parsed.y).toFixed(3);
                return `Radius (r): ${r} km | Speed (v): ${spd} km/s (${(context.parsed.y * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h)`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Orbital Radius: r = R + h (km)',
              color: '#94a3b8',
              font: { size: 11 }
            },
            grid: { color: 'rgba(30, 41, 59, 0.5)' },
            ticks: {
              callback: (val) => Number(val).toLocaleString() + ' km'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Orbital Velocity: v (km/s)',
              color: '#00f0ff',
              font: { size: 11 }
            },
            grid: { color: 'rgba(30, 41, 59, 0.5)' },
            ticks: {
              callback: (val) => Number(val).toFixed(1) + ' km/s'
            }
          }
        }
      }
    });
  }

  createPeriodChart() {
    const ctx = this.periodCanvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.01)');

    return new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Orbital Period (hours)',
            data: [],
            borderColor: '#a855f7',
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#a855f7',
            pointHoverBorderColor: '#ffffff',
            tension: 0.25
          },
          {
            label: 'Active Radius',
            data: [],
            borderColor: '#ffffff',
            backgroundColor: '#a855f7',
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9,
            pointBorderColor: '#ffffff',
            pointBackgroundColor: '#a855f7',
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: {
          intersect: false,
          mode: 'nearest'
        },
        plugins: {
          legend: {
            display: true,
            labels: {
              boxWidth: 12,
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#c084fc',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(168, 85, 247, 0.4)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (context) => {
                const r = Number(context.parsed.x).toLocaleString();
                const hrs = context.parsed.y;
                const formatted = hrs >= 24 
                  ? `${(hrs / 24).toFixed(2)} days (${hrs.toFixed(1)} hrs)` 
                  : `${hrs.toFixed(2)} hrs (${(hrs * 60).toFixed(0)} min)`;
                return `Radius (r): ${r} km | Period (T): ${formatted}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Orbital Radius: r = R + h (km)',
              color: '#94a3b8',
              font: { size: 11 }
            },
            grid: { color: 'rgba(30, 41, 59, 0.5)' },
            ticks: {
              callback: (val) => Number(val).toLocaleString() + ' km'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Time Period: T (hours)',
              color: '#a855f7',
              font: { size: 11 }
            },
            grid: { color: 'rgba(30, 41, 59, 0.5)' },
            ticks: {
              callback: (val) => Number(val).toFixed(1) + ' h'
            }
          }
        }
      }
    });
  }

  update(body, altitudeKm) {
    this.currentBody = body;
    this.currentAltitude = altitudeKm;

    if (!this.speedChart || !this.periodChart) {
      this.initCharts();
      if (!this.speedChart || !this.periodChart) {
        this.renderCanvasFallback(body, altitudeKm);
        return;
      }
    }

    try {
      const bounds = this.getRangeBounds(body);
      const isLog = this.scaleType === 'logarithmic';
      
      // Generate fresh curve points parameterized by Orbital Radius
      const curvePoints = generateOrbitalCurves(body, bounds.min, bounds.max, bounds.steps, isLog);
      
      const speedCurveData = curvePoints.map(p => ({ x: p.radius, y: p.speed }));
      const periodCurveData = curvePoints.map(p => ({ 
        x: p.radius, 
        y: this.periodUnit === 'minutes' ? p.periodMin : p.periodHours 
      }));

      // Current active point calculation based on Orbital Radius
      const currentOrbit = calculateOrbit(altitudeKm, body);
      const activeSpeedPoint = [{ x: currentOrbit.totalRadiusKm, y: currentOrbit.speedKms }];
      const activePeriodPoint = [{ 
        x: currentOrbit.totalRadiusKm, 
        y: this.periodUnit === 'minutes' ? currentOrbit.periodMin : currentOrbit.periodHours 
      }];

      // Update Speed Chart (Radius vs. Speed)
      this.speedChart.data.datasets[0].data = speedCurveData;
      this.speedChart.data.datasets[1].data = activeSpeedPoint;
      this.speedChart.options.scales.x.type = this.scaleType;
      this.speedChart.update('none');

      // Update Period Chart (Radius vs. Time Period)
      this.periodChart.data.datasets[0].data = periodCurveData;
      this.periodChart.data.datasets[1].data = activePeriodPoint;
      this.periodChart.data.datasets[0].label = `Orbital Period (${this.periodUnit})`;
      this.periodChart.options.scales.y.title.text = `Time Period: T (${this.periodUnit})`;
      this.periodChart.options.scales.x.type = this.scaleType;
      this.periodChart.update('none');
    } catch (err) {
      console.warn('Chart.js update failed, falling back to 2D Canvas:', err);
      this.renderCanvasFallback(body, altitudeKm);
    }
  }

  renderCanvasFallback(body, altitudeKm) {
    if (this.speedCanvas) {
      this.drawDirectCurve(this.speedCanvas, body, altitudeKm, 'speed');
    }
    if (this.periodCanvas) {
      this.drawDirectCurve(this.periodCanvas, body, altitudeKm, 'period');
    }
  }

  drawDirectCurve(canvas, body, altitudeKm, type) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth || 360;
    const h = 260;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 55;
    const padRight = 20;
    const padTop = 30;
    const padBottom = 40;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const bounds = this.getRangeBounds(body);
    const orbit = calculateOrbit(altitudeKm, body);

    // Compute curve points
    const points = generateOrbitalCurves(body, bounds.min, bounds.max, 80, false);
    let maxY = 0;
    for (const p of points) {
      const val = type === 'speed' ? p.speed : (this.periodUnit === 'minutes' ? p.periodMin : p.periodHours);
      if (val > maxY) maxY = val;
    }
    maxY = maxY * 1.1;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      const yVal = (maxY * (1 - i / 4)).toFixed(1);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(yVal, padLeft - 6, y + 3);
    }

    // Draw curve
    ctx.beginPath();
    points.forEach((p, idx) => {
      const x = padLeft + ((p.radius - bounds.min) / (bounds.max - bounds.min)) * plotW;
      const val = type === 'speed' ? p.speed : (this.periodUnit === 'minutes' ? p.periodMin : p.periodHours);
      const y = padTop + plotH - (val / maxY) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = type === 'speed' ? '#00f0ff' : '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Active marker
    const activeVal = type === 'speed' ? orbit.speedKms : (this.periodUnit === 'minutes' ? orbit.periodMin : orbit.periodHours);
    const curX = padLeft + ((orbit.totalRadiusKm - bounds.min) / (bounds.max - bounds.min)) * plotW;
    const curY = padTop + plotH - (activeVal / maxY) * plotH;

    if (curX >= padLeft && curX <= padLeft + plotW) {
      ctx.beginPath();
      ctx.arc(curX, curY, 6, 0, Math.PI * 2);
      ctx.fillStyle = type === 'speed' ? '#00f0ff' : '#a855f7';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Axis labels
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('Orbital Radius: r (km)', padLeft + plotW / 2, h - 10);
  }

  setRange(rangeKey) {
    this.currentRange = rangeKey;
    if (this.currentBody) {
      this.update(this.currentBody, this.currentAltitude);
    }
  }

  setScaleType(scaleType) {
    this.scaleType = scaleType;
    if (this.currentBody) {
      this.update(this.currentBody, this.currentAltitude);
    }
  }

  setPeriodUnit(unit) {
    this.periodUnit = unit;
    if (this.currentBody) {
      this.update(this.currentBody, this.currentAltitude);
    }
  }

  resize() {
    if (this.speedChart) this.speedChart.resize();
    if (this.periodChart) this.periodChart.resize();
  }
}
