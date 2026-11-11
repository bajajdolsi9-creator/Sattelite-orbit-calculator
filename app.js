/**
 * Satellite Orbit Speed and Period Calculator
 * Focused, high-performance controller for:
 *   1. Calculator Inputs (Altitude h, Radius r, Time Period T)
 *   2. Results Section (Speed in km/s, Time Period in min/hrs, Radius in km)
 *   3. 2D Orbit Simulator (Earth + Satellite circular motion)
 *   4. Keplerian Graphs (r vs. v & r vs. T)
 */

import { 
  CELESTIAL_BODIES, 
  calculateOrbit, 
  calculateOrbitFromPeriod, 
  formatOrbitalPeriod 
} from './orbital-physics.js';
import { OrbitVisualizer } from './orbit-visualizer.js';
import { ChartsManager } from './charts-manager.js';

class OrbitCalculatorApp {
  constructor() {
    // Standard Earth constant body
    this.currentBody = { ...CELESTIAL_BODIES.earth };
    this.altitudeKm = 420; // Default: ISS altitude
    this.targetPeriodUnit = 'min'; // 'min' or 'hrs'

    // Min and Max altitude supported
    this.minAltKm = 50;
    this.maxAltKm = 400000;

    // Component instances
    this.visualizer = null;
    this.charts = null;

    // Initialize application
    this.cacheDOM();
    this.initVisualizer();
    this.initCharts();
    this.bindEvents();
    this.updateAll();
  }

  cacheDOM() {
    // 1. Altitude Inputs
    this.altitudeInput = document.getElementById('altitude-input');
    this.altitudeSlider = document.getElementById('altitude-slider');
    this.btnSub100 = document.getElementById('step-sub-100');
    this.btnAdd100 = document.getElementById('step-add-100');
    this.btnSub1000 = document.getElementById('step-sub-1000');
    this.btnAdd1000 = document.getElementById('step-add-1000');

    // 2. Orbital Radius Inputs
    this.radiusInput = document.getElementById('radius-input');
    this.radiusSlider = document.getElementById('radius-slider');
    this.btnRadiusSub1000 = document.getElementById('radius-sub-1000');
    this.btnRadiusSub100 = document.getElementById('radius-sub-100');
    this.btnRadiusAdd100 = document.getElementById('radius-add-100');
    this.btnRadiusAdd1000 = document.getElementById('radius-add-1000');

    // 3. Time Period Calculator Inputs
    this.periodInput = document.getElementById('period-input');
    this.periodUnitMin = document.getElementById('period-unit-min');
    this.periodUnitHrs = document.getElementById('period-unit-hrs');
    this.periodInputAddon = document.getElementById('period-input-addon');
    this.btnPeriodSub30 = document.getElementById('period-sub-30');
    this.btnPeriodSub10 = document.getElementById('period-sub-10');
    this.btnPeriodAdd10 = document.getElementById('period-add-10');
    this.btnPeriodAdd30 = document.getElementById('period-add-30');

    // Action button & feedback
    this.btnCalculate = document.getElementById('btn-calculate');
    this.calcTimestamp = document.getElementById('calc-timestamp');
    this.atmoWarningBadge = document.getElementById('atmo-warning-badge');

    // Results Display Cards
    this.valSpeedKms = document.getElementById('res-speed-kms');
    this.valSpeedSecondary = document.getElementById('res-speed-secondary');
    this.valPeriodPrimary = document.getElementById('res-period-primary');
    this.valPeriodSecondary = document.getElementById('res-period-secondary');
    this.valOrbitalRadius = document.getElementById('res-orbital-radius');
    this.valRadiusBreakdown = document.getElementById('res-radius-breakdown');

    // Visual Orbit Simulator
    this.simCanvas = document.getElementById('orbit-sim-canvas');
    this.btnSimPlayPause = document.getElementById('sim-play-pause');
    this.btnSimFit = document.getElementById('sim-fit-btn');
    this.btnSimResetPan = document.getElementById('sim-reset-pan');
    this.simSpeedSelect = document.getElementById('sim-speed-select');

    // Graphs
    this.chartRangeGroup = document.getElementById('chart-range-group');
  }

  initVisualizer() {
    if (this.simCanvas) {
      this.visualizer = new OrbitVisualizer(this.simCanvas, {
        body: this.currentBody
      });
      this.visualizer.updateState(this.altitudeKm, this.currentBody);
    }
  }

  initCharts() {
    this.charts = new ChartsManager('chart-speed-canvas', 'chart-period-canvas');
  }

  // Smooth Logarithmic Slider Transformation (50 km to 400,000 km)
  altToSlider(alt) {
    const minL = Math.log10(this.minAltKm);
    const maxL = Math.log10(this.maxAltKm);
    const clamped = Math.max(this.minAltKm, Math.min(this.maxAltKm, alt));
    return Math.round(((Math.log10(clamped) - minL) / (maxL - minL)) * 1000);
  }

  sliderToAlt(sliderVal) {
    const minL = Math.log10(this.minAltKm);
    const maxL = Math.log10(this.maxAltKm);
    const alt = Math.pow(10, minL + (sliderVal / 1000) * (maxL - minL));
    if (alt < 1000) return Math.round(alt * 10) / 10;
    if (alt < 10000) return Math.round(alt);
    return Math.round(alt / 10) * 10;
  }

  setAltitude(newAltKm, source = 'manual') {
    const clamped = Math.max(0.1, Math.min(1000000, Number(newAltKm) || 0.1));
    this.altitudeKm = clamped;
    const bodyR = this.currentBody.radius;
    const totalRadiusKm = bodyR + clamped;

    // 1. Sync Altitude input & slider
    if (source !== 'altitude-input' && this.altitudeInput) {
      this.altitudeInput.value = clamped.toFixed(1);
    }
    if (source !== 'altitude-slider' && this.altitudeSlider) {
      this.altitudeSlider.value = this.altToSlider(clamped);
    }

    // 2. Sync Orbital Radius input & slider
    if (source !== 'radius-input' && this.radiusInput) {
      this.radiusInput.value = totalRadiusKm.toFixed(1);
    }
    if (source !== 'radius-slider' && this.radiusSlider) {
      this.radiusSlider.value = this.altToSlider(clamped);
    }

    // 3. Sync Time Period input (when user is editing altitude or radius)
    if (source !== 'period-input' && this.periodInput && document.activeElement !== this.periodInput) {
      const orbit = calculateOrbit(clamped, this.currentBody);
      this.periodInput.value = this.targetPeriodUnit === 'hrs' 
        ? orbit.periodHours.toFixed(2) 
        : orbit.periodMin.toFixed(2);
    }

    this.updateAll();
  }

  setRadius(newRadiusKm, source = 'manual') {
    const bodyR = this.currentBody.radius;
    const clampedRadius = Math.max(bodyR + 0.1, Number(newRadiusKm) || (bodyR + 0.1));
    this.setAltitude(clampedRadius - bodyR, source);
  }

  setPeriod(periodVal, source = 'manual') {
    const val = Number(periodVal) || 1;
    const totalSec = this.targetPeriodUnit === 'hrs' ? val * 3600 : val * 60;
    const calculatedOrbit = calculateOrbitFromPeriod(totalSec, this.currentBody);
    this.setAltitude(calculatedOrbit.altitudeKm, source);
  }

  updateAll() {
    const orbit = calculateOrbit(this.altitudeKm, this.currentBody);
    this.renderResults(orbit);

    if (this.visualizer) {
      this.visualizer.updateState(this.altitudeKm, this.currentBody);
    }

    if (this.charts) {
      this.charts.update(this.currentBody, this.altitudeKm);
    }
  }

  renderResults(orbit) {
    // 1. Orbital Speed (km/s)
    if (this.valSpeedKms) {
      this.valSpeedKms.textContent = `${orbit.speedKms.toFixed(3)} km/s`;
    }
    if (this.valSpeedSecondary) {
      this.valSpeedSecondary.textContent = `${orbit.speedKmh.toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h • Mach ${orbit.mach.toFixed(1)}`;
    }

    // 2. Time Period (minutes / hours)
    if (this.valPeriodPrimary) {
      this.valPeriodPrimary.textContent = `${orbit.periodMin.toFixed(2)} min (${orbit.periodHours.toFixed(2)} hrs)`;
    }
    if (this.valPeriodSecondary) {
      this.valPeriodSecondary.textContent = `${orbit.periodFormatted} • ${orbit.periodSec.toLocaleString(undefined, { maximumFractionDigits: 0 })} seconds`;
    }

    // 3. Orbital Radius (km)
    if (this.valOrbitalRadius) {
      this.valOrbitalRadius.textContent = `${orbit.totalRadiusKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
    }
    if (this.valRadiusBreakdown) {
      this.valRadiusBreakdown.textContent = `R = 6,371 + h = ${orbit.altitudeKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
    }

    // Atmospheric Drag Warning (< 100 km)
    if (this.atmoWarningBadge) {
      if (orbit.isAtmosphericDrag) {
        this.atmoWarningBadge.classList.remove('hidden');
        this.atmoWarningBadge.innerHTML = `
          <div class="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono animate-pulse">
            ⚠️ Below Kármán Line (&lt; 100 km): Severe Atmospheric Drag Region
          </div>
        `;
      } else {
        this.atmoWarningBadge.classList.add('hidden');
      }
    }
  }

  bindEvents() {
    // Altitude Input & Slider
    if (this.altitudeInput) {
      this.altitudeInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        this.setAltitude(val, 'altitude-input');
      });
    }

    if (this.altitudeSlider) {
      this.altitudeSlider.addEventListener('input', (e) => {
        const altKm = this.sliderToAlt(Number(e.target.value));
        this.setAltitude(altKm, 'altitude-slider');
      });
    }

    // Altitude Steppers
    if (this.btnSub100) this.btnSub100.addEventListener('click', () => this.setAltitude(this.altitudeKm - 100, 'step'));
    if (this.btnAdd100) this.btnAdd100.addEventListener('click', () => this.setAltitude(this.altitudeKm + 100, 'step'));
    if (this.btnSub1000) this.btnSub1000.addEventListener('click', () => this.setAltitude(this.altitudeKm - 1000, 'step'));
    if (this.btnAdd1000) this.btnAdd1000.addEventListener('click', () => this.setAltitude(this.altitudeKm + 1000, 'step'));

    // Orbital Radius Input & Slider
    if (this.radiusInput) {
      this.radiusInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) return;
        this.setRadius(val, 'radius-input');
      });
    }

    if (this.radiusSlider) {
      this.radiusSlider.addEventListener('input', (e) => {
        const altKm = this.sliderToAlt(Number(e.target.value));
        this.setRadius(this.currentBody.radius + altKm, 'radius-slider');
      });
    }

    // Radius Steppers
    if (this.btnRadiusSub1000) this.btnRadiusSub1000.addEventListener('click', () => this.setRadius(this.currentBody.radius + this.altitudeKm - 1000, 'step'));
    if (this.btnRadiusSub100) this.btnRadiusSub100.addEventListener('click', () => this.setRadius(this.currentBody.radius + this.altitudeKm - 100, 'step'));
    if (this.btnRadiusAdd100) this.btnRadiusAdd100.addEventListener('click', () => this.setRadius(this.currentBody.radius + this.altitudeKm + 100, 'step'));
    if (this.btnRadiusAdd1000) this.btnRadiusAdd1000.addEventListener('click', () => this.setRadius(this.currentBody.radius + this.altitudeKm + 1000, 'step'));

    // Time Period Calculator Input
    if (this.periodInput) {
      this.periodInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val) || val <= 0) return;
        this.setPeriod(val, 'period-input');
      });
    }

    // Period Unit Toggle (min / hrs)
    if (this.periodUnitMin && this.periodUnitHrs) {
      this.periodUnitMin.addEventListener('click', () => {
        if (this.targetPeriodUnit === 'min') return;
        this.targetPeriodUnit = 'min';
        this.periodUnitMin.classList.add('bg-amber-500', 'text-slate-950', 'font-bold');
        this.periodUnitMin.classList.remove('text-slate-400');
        this.periodUnitHrs.classList.remove('bg-amber-500', 'text-slate-950', 'font-bold');
        this.periodUnitHrs.classList.add('text-slate-400');
        if (this.periodInputAddon) this.periodInputAddon.textContent = 'minutes';
        
        const orbit = calculateOrbit(this.altitudeKm, this.currentBody);
        this.periodInput.value = orbit.periodMin.toFixed(2);
      });

      this.periodUnitHrs.addEventListener('click', () => {
        if (this.targetPeriodUnit === 'hrs') return;
        this.targetPeriodUnit = 'hrs';
        this.periodUnitHrs.classList.add('bg-amber-500', 'text-slate-950', 'font-bold');
        this.periodUnitHrs.classList.remove('text-slate-400');
        this.periodUnitMin.classList.remove('bg-amber-500', 'text-slate-950', 'font-bold');
        this.periodUnitMin.classList.add('text-slate-400');
        if (this.periodInputAddon) this.periodInputAddon.textContent = 'hours';
        
        const orbit = calculateOrbit(this.altitudeKm, this.currentBody);
        this.periodInput.value = orbit.periodHours.toFixed(2);
      });
    }

    // Period Steppers
    if (this.btnPeriodSub30) {
      this.btnPeriodSub30.addEventListener('click', () => {
        const orbit = calculateOrbit(this.altitudeKm, this.currentBody);
        const step = this.targetPeriodUnit === 'hrs' ? 0.5 : 30;
        const currentVal = this.targetPeriodUnit === 'hrs' ? orbit.periodHours : orbit.periodMin;
        this.setPeriod(Math.max(0.1, currentVal - step), 'step');
      });
    }
    if (this.btnPeriodSub10) {
      this.btnPeriodSub10.addEventListener('click', () => {
        const orbit = calculateOrbit(this.altitudeKm, this.currentBody);
        const step = this.targetPeriodUnit === 'hrs' ? 0.1667 : 10;
        const currentVal = this.targetPeriodUnit === 'hrs' ? orbit.periodHours : orbit.periodMin;
        this.setPeriod(Math.max(0.1, currentVal - step), 'step');
      });
    }
    if (this.btnPeriodAdd10) {
      this.btnPeriodAdd10.addEventListener('click', () => {
        const orbit = calculateOrbit(this.altitudeKm, this.currentBody);
        const step = this.targetPeriodUnit === 'hrs' ? 0.1667 : 10;
        const currentVal = this.targetPeriodUnit === 'hrs' ? orbit.periodHours : orbit.periodMin;
        this.setPeriod(currentVal + step, 'step');
      });
    }
    if (this.btnPeriodAdd30) {
      this.btnPeriodAdd30.addEventListener('click', () => {
        const orbit = calculateOrbit(this.altitudeKm, this.currentBody);
        const step = this.targetPeriodUnit === 'hrs' ? 0.5 : 30;
        const currentVal = this.targetPeriodUnit === 'hrs' ? orbit.periodHours : orbit.periodMin;
        this.setPeriod(currentVal + step, 'step');
      });
    }

    // Calculate Button (Primary CTA)
    if (this.btnCalculate) {
      this.btnCalculate.addEventListener('click', () => {
        if (this.calcTimestamp) {
          this.calcTimestamp.textContent = `Calculated at ${new Date().toLocaleTimeString()}`;
        }
        this.updateAll();
        if (this.visualizer) this.visualizer.autoFit();
      });
    }

    // 2D Simulator Controls
    if (this.btnSimPlayPause) {
      this.btnSimPlayPause.addEventListener('click', () => {
        if (!this.visualizer) return;
        const paused = this.visualizer.togglePause();
        this.btnSimPlayPause.innerHTML = paused 
          ? '<i data-lucide="play" class="w-3.5 h-3.5 mr-1 text-cyan-400"></i> Resume' 
          : '<i data-lucide="pause" class="w-3.5 h-3.5 mr-1 text-cyan-400"></i> Pause';
        if (window.lucide) lucide.createIcons();
      });
    }

    if (this.btnSimFit) {
      this.btnSimFit.addEventListener('click', () => {
        if (this.visualizer) this.visualizer.autoFit();
      });
    }

    if (this.btnSimResetPan) {
      this.btnSimResetPan.addEventListener('click', () => {
        if (this.visualizer) this.visualizer.resetPan();
      });
    }

    if (this.simSpeedSelect) {
      this.simSpeedSelect.addEventListener('change', (e) => {
        if (this.visualizer) this.visualizer.setSimSpeed(Number(e.target.value));
      });
    }

    // Chart Range Selector
    if (this.chartRangeGroup) {
      const rangeButtons = this.chartRangeGroup.querySelectorAll('button');
      rangeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          rangeButtons.forEach(b => {
            b.classList.remove('bg-cyan-500', 'text-slate-950', 'font-bold');
            b.classList.add('text-slate-400');
          });
          btn.classList.add('bg-cyan-500', 'text-slate-950', 'font-bold');
          btn.classList.remove('text-slate-400');
          if (this.charts) this.charts.setRange(btn.dataset.range);
        });
      });
    }

    // Keyboard Space to pause
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.key === ' ') {
        e.preventDefault();
        if (this.btnSimPlayPause) this.btnSimPlayPause.click();
      }
    });
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.app = new OrbitCalculatorApp();
  if (window.lucide) {
    lucide.createIcons();
  }
});
