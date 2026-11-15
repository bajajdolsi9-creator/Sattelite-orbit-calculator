/**
 * Spreadsheet Manager Module
 * Provides an interactive tabular spreadsheet for orbital radii, speed, and period calculations.
 * Features:
 *   - Real-time calculations with Earth parameters
 *   - Preset orbital radii (LEO, MEO, GEO, Cislunar)
 *   - Custom user rows
 *   - "Show ALL Calculations" mode toggle (14 comprehensive orbital telemetry parameters)
 *   - Step-by-step mathematical proof / calculation inspector modal
 *   - 1-click sync with 2D Simulator, Calculator, and Graphs
 *   - Multi-format export: Excel (.xlsx), CSV (.csv), and Clipboard TSV for Google Sheets
 */

import { calculateOrbit, CELESTIAL_BODIES, G_CONSTANT } from './orbital-physics.js';

export class SpreadsheetManager {
  constructor(app) {
    this.app = app;
    this.currentRegime = 'all';
    this.showAllCalculations = true; // Default to showing all calculations as requested!

    // Base initial orbital datasets
    this.defaultRows = [
      { id: 'iss', name: 'ISS (International Space Station)', regime: 'LEO', altitudeKm: 420, isCustom: false },
      { id: 'starlink', name: 'Starlink Constellation', regime: 'LEO', altitudeKm: 550, isCustom: false },
      { id: 'hubble', name: 'Hubble Space Telescope', regime: 'LEO', altitudeKm: 570, isCustom: false },
      { id: 'sso', name: 'Sun-Synchronous Earth Obs', regime: 'SSO', altitudeKm: 800, isCustom: false },
      { id: 'leo-max', name: 'Upper LEO Boundary', regime: 'LEO', altitudeKm: 2000, isCustom: false },
      { id: 'gps', name: 'GPS Navigation Constellation', regime: 'MEO', altitudeKm: 20200, isCustom: false },
      { id: 'galileo', name: 'Galileo European Navigation', regime: 'MEO', altitudeKm: 23222, isCustom: false },
      { id: 'geo', name: 'Geostationary Belt (GEO Clarke)', regime: 'GEO', altitudeKm: 35786, isCustom: false },
      { id: 'molniya', name: 'Molniya Orbit (Apogee Altitude)', regime: 'HEO', altitudeKm: 39800, isCustom: false },
      { id: 'cislunar', name: 'Lunar Distance (Cislunar Orbit)', regime: 'Cislunar', altitudeKm: 378029, isCustom: false }
    ];

    // Load custom rows from localStorage if available
    this.customRows = [];
    try {
      const saved = localStorage.getItem('orbit_custom_spreadsheet_rows');
      if (saved) {
        this.customRows = JSON.parse(saved);
      }
    } catch (e) {
      this.customRows = [];
    }

    this.cacheDOM();
    this.bindEvents();
    this.render();
  }

  cacheDOM() {
    this.tbody = document.getElementById('spreadsheet-tbody');
    this.thead = document.getElementById('spreadsheet-thead');
    this.filterButtons = document.querySelectorAll('.sheet-filter-btn');
    this.btnExportExcel = document.getElementById('sheet-export-excel');
    this.btnExportCsv = document.getElementById('sheet-export-csv');
    this.btnCopySheets = document.getElementById('sheet-copy-sheets');
    this.btnToggleFormulas = document.getElementById('sheet-toggle-formulas');
    this.btnToggleAllCalcs = document.getElementById('sheet-toggle-all-calcs');
    this.formulaGuide = document.getElementById('sheet-formula-guide');
    this.btnAddRow = document.getElementById('sheet-btn-add-row');
    this.inputCustomName = document.getElementById('sheet-input-name');
    this.inputCustomAlt = document.getElementById('sheet-input-alt');
    this.copyNotification = document.getElementById('sheet-copy-notification');
    this.rowCountBadge = document.getElementById('sheet-row-count');

    // Step-by-Step Calculation Inspector Modal
    this.calcModal = document.getElementById('calc-inspector-modal');
    this.modalTitle = document.getElementById('modal-orbit-subtitle');
    this.modalSteps = document.getElementById('modal-calc-steps');
    this.modalBtnClose = document.getElementById('modal-btn-close');
    this.modalBtnDone = document.getElementById('modal-btn-done');
    this.modalBtnCopy = document.getElementById('modal-btn-copy');
    this.btnShowMathBreakdown = document.getElementById('btn-show-math-breakdown');
  }

  getAllRows() {
    return [...this.defaultRows, ...this.customRows];
  }

  getFilteredRows() {
    const all = this.getAllRows();
    if (this.currentRegime === 'all') return all;
    if (this.currentRegime === 'leo') return all.filter(r => r.altitudeKm <= 2000);
    if (this.currentRegime === 'meo') return all.filter(r => r.altitudeKm > 2000 && r.altitudeKm < 35786);
    if (this.currentRegime === 'geo') return all.filter(r => r.altitudeKm >= 35786);
    if (this.currentRegime === 'custom') return all.filter(r => r.isCustom);
    return all;
  }

  bindEvents() {
    // Regime filtering
    if (this.filterButtons) {
      this.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          this.filterButtons.forEach(b => {
            b.classList.remove('bg-cyan-500', 'text-slate-950', 'font-bold');
            b.classList.add('text-slate-400');
          });
          btn.classList.add('bg-cyan-500', 'text-slate-950', 'font-bold');
          btn.classList.remove('text-slate-400');
          this.currentRegime = btn.dataset.regime || 'all';
          this.render();
        });
      });
    }

    // Toggle All Calculations Mode
    if (this.btnToggleAllCalcs) {
      this.btnToggleAllCalcs.addEventListener('click', () => {
        this.showAllCalculations = !this.showAllCalculations;
        this.updateToggleAllCalcsButton();
        this.render();
      });
    }

    // Toggle Formula Guide
    if (this.btnToggleFormulas && this.formulaGuide) {
      this.btnToggleFormulas.addEventListener('click', () => {
        this.formulaGuide.classList.toggle('hidden');
        if (window.lucide) lucide.createIcons();
      });
    }

    // Export Excel
    if (this.btnExportExcel) {
      this.btnExportExcel.addEventListener('click', () => this.exportToExcel());
    }

    // Export CSV
    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => this.exportToCsv());
    }

    // Copy to Clipboard (TSV)
    if (this.btnCopySheets) {
      this.btnCopySheets.addEventListener('click', () => this.copyToClipboard());
    }

    // Add Custom Row
    if (this.btnAddRow) {
      this.btnAddRow.addEventListener('click', () => this.handleAddCustomRow());
    }

    // Calculation Inspector Modal Handlers
    if (this.modalBtnClose) {
      this.modalBtnClose.addEventListener('click', () => this.closeCalcModal());
    }
    if (this.modalBtnDone) {
      this.modalBtnDone.addEventListener('click', () => this.closeCalcModal());
    }
    if (this.modalBtnCopy) {
      this.modalBtnCopy.addEventListener('click', () => this.copyModalProof());
    }
    if (this.btnShowMathBreakdown) {
      this.btnShowMathBreakdown.addEventListener('click', () => {
        const alt = this.app ? this.app.altitudeKm : 420;
        this.openCalcModal(alt, 'Active Calculator State');
      });
    }

    // Close modal on backdrop click
    if (this.calcModal) {
      this.calcModal.addEventListener('click', (e) => {
        if (e.target === this.calcModal) this.closeCalcModal();
      });
    }
  }

  updateToggleAllCalcsButton() {
    if (!this.btnToggleAllCalcs) return;
    if (this.showAllCalculations) {
      this.btnToggleAllCalcs.classList.remove('bg-slate-800', 'text-slate-300');
      this.btnToggleAllCalcs.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
      this.btnToggleAllCalcs.innerHTML = `
        <i data-lucide="check-square" class="w-3.5 h-3.5 text-cyan-400"></i>
        <span>All Calculations Active</span>
      `;
    } else {
      this.btnToggleAllCalcs.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/40');
      this.btnToggleAllCalcs.classList.add('bg-slate-800', 'text-slate-300');
      this.btnToggleAllCalcs.innerHTML = `
        <i data-lucide="square" class="w-3.5 h-3.5 text-slate-400"></i>
        <span>Show All Calculations</span>
      `;
    }
    if (window.lucide) lucide.createIcons();
  }

  handleAddCustomRow() {
    const name = this.inputCustomName ? this.inputCustomName.value.trim() : '';
    const alt = this.inputCustomAlt ? parseFloat(this.inputCustomAlt.value) : NaN;

    if (!name || isNaN(alt) || alt <= 0) {
      alert('Please enter a valid orbit name and a positive altitude in km.');
      return;
    }

    let regime = 'Custom';
    if (alt <= 2000) regime = 'LEO';
    else if (alt < 35786) regime = 'MEO';
    else if (Math.abs(alt - 35786) < 500) regime = 'GEO';
    else if (alt >= 300000) regime = 'Cislunar';
    else regime = 'HEO';

    const newRow = {
      id: 'custom-' + Date.now(),
      name: name,
      regime: regime,
      altitudeKm: alt,
      isCustom: true
    };

    this.customRows.push(newRow);
    try {
      localStorage.setItem('orbit_custom_spreadsheet_rows', JSON.stringify(this.customRows));
    } catch (e) {}

    if (this.inputCustomName) this.inputCustomName.value = '';
    if (this.inputCustomAlt) this.inputCustomAlt.value = '';

    this.render();
  }

  deleteCustomRow(id) {
    this.customRows = this.customRows.filter(r => r.id !== id);
    try {
      localStorage.setItem('orbit_custom_spreadsheet_rows', JSON.stringify(this.customRows));
    } catch (e) {}
    this.render();
  }

  renderHeader() {
    if (!this.thead) return;

    if (this.showAllCalculations) {
      // 14 Columns with ALL orbital calculation parameters
      this.thead.innerHTML = `
        <tr>
          <th class="px-3.5 py-3 font-semibold text-slate-300 sticky left-0 bg-space-900 z-20">Satellite / Mission</th>
          <th class="px-3 py-3 font-semibold text-center text-slate-300">Regime</th>
          <th class="px-3 py-3 font-semibold text-right text-slate-300">Altitude h (km)</th>
          <th class="px-3 py-3 font-semibold text-right text-purple-300">Radius r (km)</th>
          <th class="px-3 py-3 font-semibold text-right text-emerald-400">Speed v (km/s)</th>
          <th class="px-3 py-3 font-semibold text-right text-slate-400">Speed (km/h)</th>
          <th class="px-3 py-3 font-semibold text-right text-slate-400">Mach No.</th>
          <th class="px-3 py-3 font-semibold text-right text-amber-300">Period T (s)</th>
          <th class="px-3 py-3 font-semibold text-right text-amber-300">Period (min)</th>
          <th class="px-3 py-3 font-semibold text-right text-amber-400">Period (hrs)</th>
          <th class="px-3 py-3 font-semibold text-right text-sky-400">Daily Orbits</th>
          <th class="px-3 py-3 font-semibold text-right text-rose-300">Energy (MJ/kg)</th>
          <th class="px-3 py-3 font-semibold text-right text-indigo-300">Escape v (km/s)</th>
          <th class="px-3 py-3 font-semibold text-right text-teal-300">Gravity g (m/s²)</th>
          <th class="px-3.5 py-3 font-semibold text-center text-cyan-400 sticky right-0 bg-space-900 z-20">Actions</th>
        </tr>
      `;
    } else {
      // Standard Compact View (9 Columns)
      this.thead.innerHTML = `
        <tr>
          <th class="px-3.5 py-3 font-semibold text-slate-300 sticky left-0 bg-space-900 z-20">Satellite / Mission</th>
          <th class="px-3.5 py-3 font-semibold text-center text-slate-300">Regime</th>
          <th class="px-3.5 py-3 font-semibold text-right text-slate-300">Altitude h (km)</th>
          <th class="px-3.5 py-3 font-semibold text-right text-purple-300">Radius r (km)</th>
          <th class="px-3.5 py-3 font-semibold text-right text-emerald-400">Speed v (km/s)</th>
          <th class="px-3.5 py-3 font-semibold text-right text-slate-400">Speed (km/h)</th>
          <th class="px-3.5 py-3 font-semibold text-right text-amber-300">Period (min)</th>
          <th class="px-3.5 py-3 font-semibold text-right text-amber-400">Period (hrs)</th>
          <th class="px-3.5 py-3 font-semibold text-right text-slate-300">Daily Orbits</th>
          <th class="px-3.5 py-3 font-semibold text-center text-cyan-400 sticky right-0 bg-space-900 z-20">Actions</th>
        </tr>
      `;
    }
  }

  render() {
    if (!this.tbody) return;

    this.renderHeader();
    this.updateToggleAllCalcsButton();

    const rows = this.getFilteredRows();
    const activeAlt = this.app ? this.app.altitudeKm : 420;
    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;

    if (this.rowCountBadge) {
      this.rowCountBadge.textContent = `${rows.length} Orbits Listed • ${this.showAllCalculations ? 'All Calculations Shown' : 'Standard View'}`;
    }

    this.tbody.innerHTML = '';

    if (rows.length === 0) {
      const colSpan = this.showAllCalculations ? 15 : 10;
      this.tbody.innerHTML = `
        <tr>
          <td colspan="${colSpan}" class="px-4 py-8 text-center text-slate-400 font-mono text-sm">
            No orbits found in this regime category.
          </td>
        </tr>
      `;
      return;
    }

    rows.forEach(item => {
      const orbit = calculateOrbit(item.altitudeKm, body);
      const isActive = Math.abs(item.altitudeKm - activeAlt) < 0.5;

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-800/80 transition-all font-mono text-xs ${
        isActive 
          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200' 
          : 'hover:bg-slate-900/60 text-slate-300'
      }`;

      // Badge style based on regime
      let regimeBadgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
      if (item.regime === 'LEO') regimeBadgeColor = 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      else if (item.regime === 'SSO') regimeBadgeColor = 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      else if (item.regime === 'MEO') regimeBadgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      else if (item.regime === 'GEO') regimeBadgeColor = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      else if (item.regime === 'Cislunar') regimeBadgeColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';

      if (this.showAllCalculations) {
        // ALL 14 Calculations Rendered
        tr.innerHTML = `
          <td class="px-3.5 py-3 whitespace-nowrap sticky left-0 ${isActive ? 'bg-space-950/95' : 'bg-space-950/90'} z-10">
            <div class="flex items-center space-x-2">
              ${isActive ? '<span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>' : ''}
              <span class="font-semibold ${isActive ? 'text-cyan-300 font-bold' : 'text-slate-200'}">${item.name}</span>
            </div>
          </td>
          <td class="px-3 py-3 whitespace-nowrap text-center">
            <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${regimeBadgeColor}">
              ${item.regime}
            </span>
          </td>
          <td class="px-3 py-3 text-right text-slate-300 whitespace-nowrap">
            ${item.altitudeKm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </td>
          <td class="px-3 py-3 text-right text-purple-300 font-semibold whitespace-nowrap">
            ${orbit.totalRadiusKm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </td>
          <td class="px-3 py-3 text-right text-emerald-400 font-bold whitespace-nowrap">
            ${orbit.speedKms.toFixed(3)}
          </td>
          <td class="px-3 py-3 text-right text-slate-400 whitespace-nowrap">
            ${orbit.speedKmh.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </td>
          <td class="px-3 py-3 text-right text-slate-400 whitespace-nowrap">
            Mach ${orbit.mach.toFixed(1)}
          </td>
          <td class="px-3 py-3 text-right text-amber-300 font-semibold whitespace-nowrap">
            ${orbit.periodSec.toLocaleString(undefined, { maximumFractionDigits: 0 })}s
          </td>
          <td class="px-3 py-3 text-right text-amber-300 font-semibold whitespace-nowrap">
            ${orbit.periodMin.toFixed(2)}m
          </td>
          <td class="px-3 py-3 text-right text-amber-400 whitespace-nowrap">
            ${orbit.periodHours.toFixed(2)}h
          </td>
          <td class="px-3 py-3 text-right text-sky-400 font-semibold whitespace-nowrap">
            ${orbit.orbitsPerDay.toFixed(2)}
          </td>
          <td class="px-3 py-3 text-right text-rose-300 whitespace-nowrap">
            ${orbit.specificEnergyMJkg.toFixed(2)}
          </td>
          <td class="px-3 py-3 text-right text-indigo-300 whitespace-nowrap">
            ${orbit.escapeVelocityKms.toFixed(3)}
          </td>
          <td class="px-3 py-3 text-right text-teal-300 whitespace-nowrap">
            ${orbit.localGravity.toFixed(2)}
          </td>
          <td class="px-3.5 py-3 text-center whitespace-nowrap sticky right-0 ${isActive ? 'bg-space-950/95' : 'bg-space-950/90'} z-10">
            <div class="flex items-center justify-center space-x-1.5">
              <button 
                type="button" 
                data-alt="${item.altitudeKm}" 
                class="sheet-load-btn px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:text-white border border-cyan-500/40 text-[11px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm"
                title="Sync with simulator and graphs"
              >
                <i data-lucide="play" class="w-3 h-3"></i>
                <span>Sync</span>
              </button>
              <button 
                type="button" 
                data-inspect-alt="${item.altitudeKm}" 
                data-inspect-name="${item.name}"
                class="sheet-inspect-btn px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 hover:text-white border border-purple-500/40 text-[11px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm"
                title="Show step-by-step mathematical calculations for this orbit"
              >
                <i data-lucide="calculator" class="w-3 h-3"></i>
                <span>Proof</span>
              </button>
              ${item.isCustom ? `
                <button 
                  type="button" 
                  data-del="${item.id}" 
                  class="sheet-del-btn p-1 rounded bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] transition-all"
                  title="Delete custom orbit"
                >
                  <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
              ` : ''}
            </div>
          </td>
        `;
      } else {
        // Standard Compact Mode
        tr.innerHTML = `
          <td class="px-3.5 py-3 whitespace-nowrap sticky left-0 ${isActive ? 'bg-space-950/95' : 'bg-space-950/90'} z-10">
            <div class="flex items-center space-x-2">
              ${isActive ? '<span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>' : ''}
              <span class="font-semibold ${isActive ? 'text-cyan-300 font-bold' : 'text-slate-200'}">${item.name}</span>
            </div>
          </td>
          <td class="px-3 py-3 whitespace-nowrap text-center">
            <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${regimeBadgeColor}">
              ${item.regime}
            </span>
          </td>
          <td class="px-3 py-3 text-right text-slate-300 whitespace-nowrap">
            ${item.altitudeKm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </td>
          <td class="px-3 py-3 text-right text-purple-300 font-semibold whitespace-nowrap">
            ${orbit.totalRadiusKm.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </td>
          <td class="px-3 py-3 text-right text-emerald-400 font-bold whitespace-nowrap">
            ${orbit.speedKms.toFixed(3)}
          </td>
          <td class="px-3 py-3 text-right text-slate-400 whitespace-nowrap">
            ${orbit.speedKmh.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </td>
          <td class="px-3 py-3 text-right text-amber-300 font-semibold whitespace-nowrap">
            ${orbit.periodMin.toFixed(2)}
          </td>
          <td class="px-3 py-3 text-right text-amber-400 whitespace-nowrap">
            ${orbit.periodHours.toFixed(2)}
          </td>
          <td class="px-3 py-3 text-right text-slate-300 whitespace-nowrap">
            ${orbit.orbitsPerDay.toFixed(2)}
          </td>
          <td class="px-3.5 py-3 text-center whitespace-nowrap sticky right-0 ${isActive ? 'bg-space-950/95' : 'bg-space-950/90'} z-10">
            <div class="flex items-center justify-center space-x-1.5">
              <button 
                type="button" 
                data-alt="${item.altitudeKm}" 
                class="sheet-load-btn px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:text-white border border-cyan-500/40 text-[11px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm"
                title="Sync with simulator and graphs"
              >
                <i data-lucide="play" class="w-3 h-3"></i>
                <span>Sync</span>
              </button>
              <button 
                type="button" 
                data-inspect-alt="${item.altitudeKm}" 
                data-inspect-name="${item.name}"
                class="sheet-inspect-btn px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 hover:text-white border border-purple-500/40 text-[11px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm"
                title="Show step-by-step mathematical calculations for this orbit"
              >
                <i data-lucide="calculator" class="w-3 h-3"></i>
                <span>Proof</span>
              </button>
              ${item.isCustom ? `
                <button 
                  type="button" 
                  data-del="${item.id}" 
                  class="sheet-del-btn p-1 rounded bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] transition-all"
                  title="Delete custom orbit"
                >
                  <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
              ` : ''}
            </div>
          </td>
        `;
      }

      this.tbody.appendChild(tr);
    });

    // Bind sync buttons
    this.tbody.querySelectorAll('.sheet-load-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const alt = parseFloat(btn.dataset.alt);
        if (this.app) {
          this.app.setAltitude(alt, 'spreadsheet-sync');
          if (this.app.visualizer) this.app.visualizer.autoFit();
          this.render(); // Update active highlights
        }
      });
    });

    // Bind inspect/proof buttons
    this.tbody.querySelectorAll('.sheet-inspect-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const alt = parseFloat(btn.dataset.inspectAlt);
        const name = btn.dataset.inspectName;
        this.openCalcModal(alt, name);
      });
    });

    // Bind delete buttons
    this.tbody.querySelectorAll('.sheet-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.del;
        this.deleteCustomRow(id);
      });
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  openCalcModal(altKm, orbitName) {
    if (!this.calcModal) return;

    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;
    const orbit = calculateOrbit(altKm, body);

    if (this.modalTitle) {
      this.modalTitle.textContent = `${orbitName} • Altitude h = ${orbit.altitudeKm.toLocaleString()} km (Radius r = ${orbit.totalRadiusKm.toLocaleString()} km)`;
    }

    if (this.modalSteps) {
      this.modalSteps.innerHTML = `
        <!-- Given Parameters Card -->
        <div class="bg-slate-900/90 p-4 rounded-xl border border-cyan-500/20 space-y-2">
          <div class="text-[11px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
            <i data-lucide="globe" class="w-3.5 h-3.5"></i>
            Given Earth &amp; Gravitational Constants
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div><span class="text-slate-400">Mass M:</span> <strong class="text-white">5.972 × 10²⁴ kg</strong></div>
            <div><span class="text-slate-400">Radius R:</span> <strong class="text-white">6,371.0 km</strong></div>
            <div><span class="text-slate-400">Constant G:</span> <strong class="text-white">6.6743 × 10⁻¹¹</strong></div>
            <div><span class="text-slate-400">Param μ = GM:</span> <strong class="text-emerald-400">398,600.44 km³/s²</strong></div>
          </div>
        </div>

        <!-- Step 1: Radius -->
        <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between text-slate-300 font-bold">
            <span class="text-purple-400 flex items-center gap-1.5">
              <span>Step 1:</span> Orbital Radius (r)
            </span>
            <span class="text-slate-400 font-normal">Formula: r = R_Earth + h</span>
          </div>
          <div class="text-slate-400 bg-space-950 p-2.5 rounded-lg border border-slate-800/80">
            <div>r = 6,371.0 km + ${orbit.altitudeKm.toLocaleString()} km</div>
            <div class="text-purple-300 font-bold mt-1">r = ${orbit.totalRadiusKm.toLocaleString()} km = ${orbit.totalRadiusMeters.toLocaleString()} meters</div>
          </div>
        </div>

        <!-- Step 2: Orbital Speed -->
        <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between text-slate-300 font-bold">
            <span class="text-emerald-400 flex items-center gap-1.5">
              <span>Step 2:</span> Circular Orbital Speed (v)
            </span>
            <span class="text-slate-400 font-normal">Formula: v = √(μ / r) = √(G·M / r)</span>
          </div>
          <div class="text-slate-400 bg-space-950 p-2.5 rounded-lg border border-slate-800/80">
            <div>v = √(398,600.44 km³/s² / ${orbit.totalRadiusKm.toFixed(1)} km)</div>
            <div class="text-emerald-300 font-bold mt-1">v = ${orbit.speedKms.toFixed(3)} km/s</div>
            <div class="text-slate-400 text-[10px] mt-0.5">
              Converted: ${orbit.speedKmh.toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h • ${orbit.speedMph.toLocaleString(undefined, { maximumFractionDigits: 0 })} mph • Mach ${orbit.mach.toFixed(1)}
            </div>
          </div>
        </div>

        <!-- Step 3: Orbital Period -->
        <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between text-slate-300 font-bold">
            <span class="text-amber-400 flex items-center gap-1.5">
              <span>Step 3:</span> Orbital Period (T)
            </span>
            <span class="text-slate-400 font-normal">Formula: T = 2π √(r³ / μ) = 2πr / v</span>
          </div>
          <div class="text-slate-400 bg-space-950 p-2.5 rounded-lg border border-slate-800/80">
            <div>T = 2 × π × √(${orbit.totalRadiusKm.toFixed(1)}³ / 398,600.44)</div>
            <div class="text-amber-300 font-bold mt-1">T = ${orbit.periodSec.toFixed(1)} seconds</div>
            <div class="text-amber-400 mt-0.5">
              In Minutes: ${orbit.periodSec.toFixed(1)} / 60 = <strong>${orbit.periodMin.toFixed(2)} minutes</strong>
            </div>
            <div class="text-amber-400 mt-0.5">
              In Hours: ${orbit.periodMin.toFixed(2)} / 60 = <strong>${orbit.periodHours.toFixed(2)} hours</strong> (${orbit.periodFormatted})
            </div>
          </div>
        </div>

        <!-- Step 4: Daily Orbits -->
        <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <div class="flex items-center justify-between text-slate-300 font-bold">
            <span class="text-sky-400 flex items-center gap-1.5">
              <span>Step 4:</span> Daily Orbits / Frequency (f)
            </span>
            <span class="text-slate-400 font-normal">Formula: f = 86,400 s / T_sec</span>
          </div>
          <div class="text-slate-400 bg-space-950 p-2.5 rounded-lg border border-slate-800/80">
            <div>f = 86,400 / ${orbit.periodSec.toFixed(1)}</div>
            <div class="text-sky-300 font-bold mt-1">f = ${orbit.orbitsPerDay.toFixed(2)} revolutions per standard 24-hour day</div>
          </div>
        </div>

        <!-- Step 5: Advanced Telemetry -->
        <div class="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <div class="text-cyan-400 font-bold flex items-center gap-1.5">
            <span>Step 5:</span> Advanced Orbital Mechanics Parameters
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div class="bg-space-950 p-2 rounded border border-slate-800">
              <span class="text-slate-400 block text-[10px]">Specific Orbital Energy (ε = -μ/2r):</span>
              <strong class="text-rose-300">${orbit.specificEnergyMJkg.toFixed(2)} MJ/kg</strong>
            </div>
            <div class="bg-space-950 p-2 rounded border border-slate-800">
              <span class="text-slate-400 block text-[10px]">Escape Velocity (v_esc = √2 · v):</span>
              <strong class="text-indigo-300">${orbit.escapeVelocityKms.toFixed(3)} km/s</strong>
            </div>
            <div class="bg-space-950 p-2 rounded border border-slate-800">
              <span class="text-slate-400 block text-[10px]">Gravity at Altitude (g = μ/r²):</span>
              <strong class="text-teal-300">${orbit.localGravity.toFixed(3)} m/s² (${(orbit.gravityRatio * 100).toFixed(1)}% of 1g)</strong>
            </div>
          </div>
        </div>
      `;
    }

    this.calcModal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeCalcModal() {
    if (this.calcModal) {
      this.calcModal.classList.add('hidden');
    }
  }

  copyModalProof() {
    if (!this.modalSteps) return;
    const text = this.modalSteps.innerText;
    navigator.clipboard.writeText(text).then(() => {
      if (this.modalBtnCopy) {
        const orig = this.modalBtnCopy.innerHTML;
        this.modalBtnCopy.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> Copied!`;
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
          this.modalBtnCopy.innerHTML = orig;
          if (window.lucide) lucide.createIcons();
        }, 2000);
      }
    });
  }

  exportToExcel() {
    const rows = this.getAllRows();
    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;

    if (window.XLSX) {
      const wb = XLSX.utils.book_new();

      const wsData = [
        ["EARTH SATELLITE CIRCULAR ORBIT CALCULATOR SPREADSHEET - ALL CALCULATIONS"],
        ["Calculates circular orbital speed, period, daily frequency, energy, and escape velocity using given Earth parameters"],
        [],
        ["GIVEN EARTH PARAMETERS:"],
        ["Earth Mass (M)", body.mass, "kg"],
        ["Earth Mean Radius (R_Earth)", body.radius, "km"],
        ["Universal Gravitational Constant (G)", 6.67430e-11, "m^3 / (kg * s^2)"],
        ["Standard Gravitational Parameter (mu = GM)", 398600.44, "km^3 / s^2"],
        [],
        [
          "Orbit Mission / Preset",
          "Regime",
          "Altitude h (km)",
          "Orbital Radius r (km)",
          "Orbital Speed v (km/s)",
          "Speed (km/h)",
          "Speed (mph)",
          "Mach No.",
          "Period T (Seconds)",
          "Period T (Minutes)",
          "Period T (Hours)",
          "Period (Days)",
          "Revolutions / Day",
          "Specific Energy (MJ/kg)",
          "Escape Velocity (km/s)",
          "Gravitational Accel g (m/s^2)",
          "Gravity Ratio (% of 1g)"
        ]
      ];

      // Add Data rows with ALL calculations
      rows.forEach(r => {
        const orbit = calculateOrbit(r.altitudeKm, body);
        wsData.push([
          r.name,
          r.regime,
          r.altitudeKm,
          orbit.totalRadiusKm,
          parseFloat(orbit.speedKms.toFixed(3)),
          parseFloat(orbit.speedKmh.toFixed(1)),
          parseFloat(orbit.speedMph.toFixed(1)),
          parseFloat(orbit.mach.toFixed(1)),
          parseFloat(orbit.periodSec.toFixed(1)),
          parseFloat(orbit.periodMin.toFixed(2)),
          parseFloat(orbit.periodHours.toFixed(2)),
          parseFloat(orbit.periodDays.toFixed(4)),
          parseFloat(orbit.orbitsPerDay.toFixed(2)),
          parseFloat(orbit.specificEnergyMJkg.toFixed(2)),
          parseFloat(orbit.escapeVelocityKms.toFixed(3)),
          parseFloat(orbit.localGravity.toFixed(3)),
          parseFloat((orbit.gravityRatio * 100).toFixed(1))
        ]);
      });

      // Add formula notes
      wsData.push([]);
      wsData.push(["FORMULA SPECIFICATION (EXCEL & GOOGLE SHEETS):"]);
      wsData.push(["Orbital Radius r", "= R_Earth + h", "= $B$6 + C10"]);
      wsData.push(["Orbital Speed v (km/s)", "= SQRT(mu / r)", "= SQRT($B$8 / D10)"]);
      wsData.push(["Orbital Speed (km/h)", "= v * 3600", "= E10 * 3600"]);
      wsData.push(["Orbital Period T (s)", "= 2 * PI * SQRT(r^3 / mu)", "= 2*PI()*SQRT((D10^3)/$B$8)"]);
      wsData.push(["Period T (min)", "= T_seconds / 60", "= I10 / 60"]);
      wsData.push(["Period T (hrs)", "= T_minutes / 60", "= J10 / 60"]);
      wsData.push(["Daily Revolutions", "= 86400 / T_seconds", "= 86400 / I10"]);
      wsData.push(["Specific Orbital Energy", "= -mu / (2 * r)", "= -$B$8 / (2 * D10)"]);
      wsData.push(["Escape Velocity", "= SQRT(2 * mu / r)", "= SQRT(2 * $B$8 / D10)"]);
      wsData.push(["Gravitational Accel g", "= (mu / r^2) * 1000", "= ($B$8 / (D10^2)) * 1000"]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Auto-fit column widths
      ws['!cols'] = [
        { wch: 34 }, { wch: 10 }, { wch: 15 }, { wch: 18 },
        { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
        { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
        { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "All_Orbital_Calculations");
      XLSX.writeFile(wb, "satellite_orbit_all_calculations_spreadsheet.xlsx");
    } else {
      this.exportToCsv();
    }
  }

  exportToCsv() {
    const rows = this.getAllRows();
    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;

    let csv = "SATELLITE ORBIT CIRCULAR SPEED & PERIOD SPREADSHEET - ALL CALCULATIONS\n";
    csv += `"Earth Parameters: Mass M = ${body.mass} kg | Radius R = ${body.radius} km | G = 6.67430e-11 m^3/(kg*s^2) | mu = 398600.44 km^3/s^2"\n\n`;
    csv += `"Orbit Mission","Regime","Altitude h (km)","Orbital Radius r (km)","Orbital Speed v (km/s)","Speed (km/h)","Speed (mph)","Mach","Period T (s)","Period T (min)","Period T (hrs)","Daily Orbits","Energy (MJ/kg)","Escape v (km/s)","Gravity g (m/s^2)"\n`;

    rows.forEach(r => {
      const orbit = calculateOrbit(r.altitudeKm, body);
      csv += `"${r.name}","${r.regime}",${r.altitudeKm},${orbit.totalRadiusKm.toFixed(1)},${orbit.speedKms.toFixed(3)},${orbit.speedKmh.toFixed(1)},${orbit.speedMph.toFixed(1)},${orbit.mach.toFixed(1)},${orbit.periodSec.toFixed(1)},${orbit.periodMin.toFixed(2)},${orbit.periodHours.toFixed(2)},${orbit.orbitsPerDay.toFixed(2)},${orbit.specificEnergyMJkg.toFixed(2)},${orbit.escapeVelocityKms.toFixed(3)},${orbit.localGravity.toFixed(3)}\n`;
    });

    csv += `\n"FORMULA REFERENCE:"\n`;
    csv += `"Orbital Radius r = R_Earth + h"\n`;
    csv += `"Orbital Speed v = SQRT(mu / r)"\n`;
    csv += `"Orbital Period T = 2 * PI * SQRT(r^3 / mu)"\n`;
    csv += `"Period T (min) = T_sec / 60"\n`;
    csv += `"Period T (hrs) = T_min / 60"\n`;
    csv += `"Daily Revolutions = 86400 / T_sec"\n`;
    csv += `"Specific Energy = -mu / (2 * r)"\n`;
    csv += `"Escape Velocity = SQRT(2 * mu / r)"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'satellite_orbit_all_calculations_spreadsheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  copyToClipboard() {
    const rows = this.getAllRows();
    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;

    let tsv = `Orbit Mission\tRegime\tAltitude h (km)\tOrbital Radius r (km)\tOrbital Speed v (km/s)\tSpeed (km/h)\tMach\tPeriod T (s)\tPeriod T (min)\tPeriod T (hrs)\tDaily Orbits\tEnergy (MJ/kg)\tEscape v (km/s)\tGravity g (m/s^2)\n`;

    rows.forEach(r => {
      const orbit = calculateOrbit(r.altitudeKm, body);
      tsv += `${r.name}\t${r.regime}\t${r.altitudeKm}\t${orbit.totalRadiusKm.toFixed(1)}\t${orbit.speedKms.toFixed(3)}\t${orbit.speedKmh.toFixed(1)}\t${orbit.mach.toFixed(1)}\t${orbit.periodSec.toFixed(1)}\t${orbit.periodMin.toFixed(2)}\t${orbit.periodHours.toFixed(2)}\t${orbit.orbitsPerDay.toFixed(2)}\t${orbit.specificEnergyMJkg.toFixed(2)}\t${orbit.escapeVelocityKms.toFixed(3)}\t${orbit.localGravity.toFixed(3)}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      if (this.copyNotification) {
        this.copyNotification.classList.remove('hidden');
        setTimeout(() => {
          this.copyNotification.classList.add('hidden');
        }, 3000);
      } else {
        alert('All orbital calculations copied to clipboard! Paste directly into Excel or Google Sheets (Ctrl+V).');
      }
    }).catch(err => {
      console.error('Failed to copy to clipboard', err);
    });
  }
}
