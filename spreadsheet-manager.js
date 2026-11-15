/**
 * Spreadsheet Manager Module (Clean User Calculations Only)
 * Allows users to add only the orbital radii and calculations they specify.
 * No predefined GEO/LEO/MEO presets or extra regime clutter.
 */

import { calculateOrbit, CELESTIAL_BODIES } from './orbital-physics.js';

export class SpreadsheetManager {
  constructor(app) {
    this.app = app;

    // Load user calculations from localStorage, or start with simple clean examples
    this.rows = [];
    try {
      const saved = localStorage.getItem('user_custom_orbital_calculations');
      if (saved) {
        this.rows = JSON.parse(saved);
      }
    } catch (e) {
      this.rows = [];
    }

    // Clean spreadsheet: starts empty so user adds only calculations they specify
    // Any legacy preset items from older sessions are removed
    this.rows = (this.rows || []).filter(item => item && !item.classTag && !String(item.id).startsWith('leo-') && !String(item.id).startsWith('meo-') && !String(item.id).startsWith('geo-') && !String(item.id).startsWith('heo-') && !String(item.id).startsWith('lunar-') && !String(item.id).startsWith('calc-'));

    this.cacheDOM();
    this.bindEvents();
    this.render();
  }

  cacheDOM() {
    this.tbody = document.getElementById('spreadsheet-tbody');
    this.rowCountBadge = document.getElementById('sheet-row-count');
    this.btnExportExcel = document.getElementById('sheet-export-excel');
    this.btnExportCsv = document.getElementById('sheet-export-csv');
    this.btnCopySheets = document.getElementById('sheet-copy-sheets');
    this.btnClearAll = document.getElementById('sheet-btn-clear');
    this.btnAddRow = document.getElementById('sheet-btn-add-row');
    this.inputLabel = document.getElementById('sheet-input-name');
    this.inputRadius = document.getElementById('sheet-input-radius');
    this.inputAlt = document.getElementById('sheet-input-alt');
    this.copyNotification = document.getElementById('sheet-copy-notification');
    this.btnAddFromCalc = document.getElementById('btn-add-to-sheet');
  }

  bindEvents() {
    // 1. Add row from Spreadsheet input bar
    if (this.btnAddRow) {
      this.btnAddRow.addEventListener('click', () => this.handleAddRow());
    }

    // 2. Add current active calculator orbit
    if (this.btnAddFromCalc) {
      this.btnAddFromCalc.addEventListener('click', () => {
        const alt = this.app ? this.app.altitudeKm : 420;
        const bodyR = this.app && this.app.currentBody ? this.app.currentBody.radius : 6371.0;
        const totalR = bodyR + alt;
        const count = this.rows.length + 1;
        this.addCalculation(`Calculation ${count}`, totalR, alt);
      });
    }

    // 3. Clear All calculations
    if (this.btnClearAll) {
      this.btnClearAll.addEventListener('click', () => {
        if (confirm('Clear all calculations from your spreadsheet?')) {
          this.rows = [];
          this.saveRows();
          this.render();
        }
      });
    }

    // 4. Export buttons
    if (this.btnExportExcel) {
      this.btnExportExcel.addEventListener('click', () => this.exportToExcel());
    }
    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => this.exportToCsv());
    }
    if (this.btnCopySheets) {
      this.btnCopySheets.addEventListener('click', () => this.copyToClipboard());
    }

    // 5. Keep radius and altitude inputs synchronized in the add bar
    if (this.inputRadius && this.inputAlt) {
      this.inputRadius.addEventListener('input', (e) => {
        const r = parseFloat(e.target.value);
        if (!isNaN(r)) {
          this.inputAlt.value = Math.max(0.1, r - 6371.0).toFixed(1);
        }
      });
      this.inputAlt.addEventListener('input', (e) => {
        const h = parseFloat(e.target.value);
        if (!isNaN(h)) {
          this.inputRadius.value = (6371.0 + h).toFixed(1);
        }
      });
    }
  }

  saveRows() {
    try {
      localStorage.setItem('user_custom_orbital_calculations', JSON.stringify(this.rows));
    } catch (e) {}
  }

  handleAddRow() {
    const label = (this.inputLabel && this.inputLabel.value.trim()) 
      ? this.inputLabel.value.trim() 
      : `Calculation ${this.rows.length + 1}`;

    let radiusKm = this.inputRadius ? parseFloat(this.inputRadius.value) : NaN;
    let altKm = this.inputAlt ? parseFloat(this.inputAlt.value) : NaN;

    if (isNaN(radiusKm) && !isNaN(altKm)) {
      radiusKm = 6371.0 + altKm;
    } else if (!isNaN(radiusKm) && isNaN(altKm)) {
      altKm = Math.max(0.1, radiusKm - 6371.0);
    } else if (isNaN(radiusKm) && isNaN(altKm)) {
      alert('Please enter an Orbital Radius (r) or Altitude (h).');
      return;
    }

    if (radiusKm <= 6371.0) {
      alert('Orbital Radius must be greater than Earth surface radius (6,371 km).');
      return;
    }

    this.addCalculation(label, radiusKm, altKm);

    if (this.inputLabel) this.inputLabel.value = '';
    if (this.inputRadius) this.inputRadius.value = '';
    if (this.inputAlt) this.inputAlt.value = '';
  }

  addCalculation(label, radiusKm, altKm) {
    const newRow = {
      id: 'calc-' + Date.now(),
      label: label,
      radiusKm: radiusKm,
      altitudeKm: altKm
    };

    this.rows.push(newRow);
    this.saveRows();
    this.render();

    // Flash notification feedback if button clicked from calculator
    if (this.btnAddFromCalc) {
      const origText = this.btnAddFromCalc.innerHTML;
      this.btnAddFromCalc.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Added to Spreadsheet!`;
      if (window.lucide) lucide.createIcons();
      setTimeout(() => {
        this.btnAddFromCalc.innerHTML = origText;
        if (window.lucide) lucide.createIcons();
      }, 1800);
    }
  }

  deleteRow(id) {
    this.rows = this.rows.filter(r => r.id !== id);
    this.saveRows();
    this.render();
  }

  render() {
    if (!this.tbody) return;

    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;
    const activeAlt = this.app ? this.app.altitudeKm : 420;

    if (this.rowCountBadge) {
      this.rowCountBadge.textContent = `${this.rows.length} Calculation${this.rows.length === 1 ? '' : 's'} Added`;
    }

    this.tbody.innerHTML = '';

    if (this.rows.length === 0) {
      this.tbody.innerHTML = `
        <tr>
          <td colspan="7" class="px-4 py-8 text-center text-slate-400 font-mono text-xs">
            No calculations in your spreadsheet yet.<br>
            <span class="text-cyan-400">Enter an orbital radius below or click "Add Active Calculation to Spreadsheet".</span>
          </td>
        </tr>
      `;
      return;
    }

    this.rows.forEach(item => {
      const orbit = calculateOrbit(item.altitudeKm, body);
      const isActive = Math.abs(item.altitudeKm - activeAlt) < 0.5;

      const tr = document.createElement('tr');
      tr.className = `border-b border-slate-800/80 transition-all font-mono text-xs ${
        isActive 
          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200' 
          : 'hover:bg-slate-900/60 text-slate-300'
      }`;

      tr.innerHTML = `
        <td class="px-4 py-3 whitespace-nowrap">
          <div class="flex items-center space-x-2">
            ${isActive ? '<span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>' : ''}
            <span class="font-semibold ${isActive ? 'text-cyan-300 font-bold' : 'text-slate-200'}">${item.label}</span>
          </div>
        </td>
        <td class="px-4 py-3 text-right text-purple-300 font-bold whitespace-nowrap">
          ${orbit.totalRadiusKm.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km
        </td>
        <td class="px-4 py-3 text-right text-slate-300 whitespace-nowrap">
          ${orbit.altitudeKm.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km
        </td>
        <td class="px-4 py-3 text-right text-emerald-400 font-bold whitespace-nowrap">
          ${orbit.speedKms.toFixed(3)} km/s
          <span class="text-[10px] text-slate-400 font-normal block">${orbit.speedKmh.toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h</span>
        </td>
        <td class="px-4 py-3 text-right text-amber-300 font-bold whitespace-nowrap">
          ${orbit.periodMin.toFixed(2)} min
        </td>
        <td class="px-4 py-3 text-right text-amber-400 font-semibold whitespace-nowrap">
          ${orbit.periodHours.toFixed(2)} hrs
          <span class="text-[10px] text-slate-400 font-normal block">${orbit.periodSec.toLocaleString(undefined, { maximumFractionDigits: 0 })} sec</span>
        </td>
        <td class="px-4 py-3 text-center whitespace-nowrap">
          <div class="flex items-center justify-center space-x-2">
            <button 
              type="button" 
              data-alt="${item.altitudeKm}" 
              class="sheet-load-btn px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 hover:text-white border border-cyan-500/40 text-[11px] font-sans font-semibold transition-all flex items-center gap-1 shadow-sm"
              title="Load this orbit into the calculator and 2D simulator"
            >
              <i data-lucide="play" class="w-3 h-3"></i>
              <span>Load</span>
            </button>
            <button 
              type="button" 
              data-del="${item.id}" 
              class="sheet-del-btn p-1 rounded bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-[11px] transition-all"
              title="Remove calculation"
            >
              <i data-lucide="trash-2" class="w-3 h-3"></i>
            </button>
          </div>
        </td>
      `;

      this.tbody.appendChild(tr);
    });

    // Bind Load buttons
    this.tbody.querySelectorAll('.sheet-load-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const alt = parseFloat(btn.dataset.alt);
        if (this.app) {
          this.app.setAltitude(alt, 'spreadsheet-sync');
          if (this.app.visualizer) this.app.visualizer.autoFit();
          this.render();
        }
      });
    });

    // Bind Delete buttons
    this.tbody.querySelectorAll('.sheet-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.del;
        this.deleteRow(id);
      });
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  exportToExcel() {
    if (!this.rows || this.rows.length === 0) { alert("Please add at least one calculation to the spreadsheet before exporting."); return; }
    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;

    if (window.XLSX) {
      const wb = XLSX.utils.book_new();

      const wsData = [
        ["CIRCULAR ORBITAL SPEED & PERIOD SPREADSHEET"],
        ["Calculates circular orbital speed (v) and period (T) for selected orbital radii using given Earth parameters"],
        [],
        ["GIVEN EARTH PARAMETERS:"],
        ["Earth Mass (M)", body.mass, "kg"],
        ["Earth Mean Radius (R_Earth)", body.radius, "km"],
        ["Universal Gravitational Constant (G)", 6.67430e-11, "m^3 / (kg * s^2)"],
        ["Standard Gravitational Parameter (mu = GM)", 398600.44, "km^3 / s^2"],
        [],
        [
          "Calculation Label",
          "Orbital Radius r (km)",
          "Altitude h (km)",
          "Orbital Speed v (km/s)",
          "Speed (km/h)",
          "Period T (Minutes)",
          "Period T (Hours)",
          "Period T (Seconds)"
        ]
      ];

      this.rows.forEach(r => {
        const orbit = calculateOrbit(r.altitudeKm, body);
        wsData.push([
          r.label,
          orbit.totalRadiusKm,
          orbit.altitudeKm,
          parseFloat(orbit.speedKms.toFixed(3)),
          parseFloat(orbit.speedKmh.toFixed(1)),
          parseFloat(orbit.periodMin.toFixed(2)),
          parseFloat(orbit.periodHours.toFixed(2)),
          parseFloat(orbit.periodSec.toFixed(1))
        ]);
      });

      // Add formula notes
      wsData.push([]);
      wsData.push(["EXCEL FORMULA SPECIFICATION:"]);
      wsData.push(["Orbital Speed v (km/s)", "= SQRT(mu / r)", "= SQRT($B$8 / B10)"]);
      wsData.push(["Orbital Speed (km/h)", "= v * 3600", "= D10 * 3600"]);
      wsData.push(["Orbital Period T (s)", "= 2 * PI * SQRT(r^3 / mu)", "= 2*PI()*SQRT((B10^3)/$B$8)"]);
      wsData.push(["Period T (min)", "= T_seconds / 60", "= H10 / 60"]);
      wsData.push(["Period T (hrs)", "= T_minutes / 60", "= F10 / 60"]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 25 }, { wch: 22 }, { wch: 18 }, { wch: 22 },
        { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Orbital_Calculations");
      XLSX.writeFile(wb, "satellite_orbit_speed_period_spreadsheet.xlsx");
    } else {
      this.exportToCsv();
    }
  }

  exportToCsv() {
    if (!this.rows || this.rows.length === 0) { alert("Please add at least one calculation to the spreadsheet before exporting."); return; }
    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;

    let csv = "CIRCULAR ORBITAL SPEED & PERIOD SPREADSHEET\n";
    csv += `"Earth Parameters: Mass M = ${body.mass} kg | Radius R = ${body.radius} km | G = 6.67430e-11 m^3/(kg*s^2) | mu = 398600.44 km^3/s^2"\n\n`;
    csv += `"Calculation Label","Orbital Radius r (km)","Altitude h (km)","Orbital Speed v (km/s)","Speed (km/h)","Period T (min)","Period T (hrs)","Period T (s)"\n`;

    this.rows.forEach(r => {
      const orbit = calculateOrbit(r.altitudeKm, body);
      csv += `"${r.label}",${orbit.totalRadiusKm.toFixed(1)},${orbit.altitudeKm.toFixed(1)},${orbit.speedKms.toFixed(3)},${orbit.speedKmh.toFixed(1)},${orbit.periodMin.toFixed(2)},${orbit.periodHours.toFixed(2)},${orbit.periodSec.toFixed(1)}\n`;
    });

    csv += `\n"FORMULAS:"\n`;
    csv += `"Orbital Speed v = SQRT(mu / r)"\n`;
    csv += `"Orbital Period T = 2 * PI * SQRT(r^3 / mu)"\n`;
    csv += `"Period (min) = T / 60"\n`;
    csv += `"Period (hrs) = T / 3600"\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'satellite_orbit_speed_period_spreadsheet.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  copyToClipboard() {
    if (!this.rows || this.rows.length === 0) { alert("Please add at least one calculation to the spreadsheet before exporting."); return; }
    const body = this.app ? this.app.currentBody : CELESTIAL_BODIES.earth;

    let tsv = `Calculation Label\tOrbital Radius r (km)\tAltitude h (km)\tOrbital Speed v (km/s)\tSpeed (km/h)\tPeriod T (min)\tPeriod T (hrs)\tPeriod T (s)\n`;

    this.rows.forEach(r => {
      const orbit = calculateOrbit(r.altitudeKm, body);
      tsv += `${r.label}\t${orbit.totalRadiusKm.toFixed(1)}\t${orbit.altitudeKm.toFixed(1)}\t${orbit.speedKms.toFixed(3)}\t${orbit.speedKmh.toFixed(1)}\t${orbit.periodMin.toFixed(2)}\t${orbit.periodHours.toFixed(2)}\t${orbit.periodSec.toFixed(1)}\n`;
    });

    navigator.clipboard.writeText(tsv).then(() => {
      if (this.copyNotification) {
        this.copyNotification.classList.remove('hidden');
        setTimeout(() => {
          this.copyNotification.classList.add('hidden');
        }, 3000);
      } else {
        alert('Spreadsheet data copied to clipboard! Paste directly into Excel or Google Sheets (Ctrl+V).');
      }
    }).catch(err => {
      console.error('Failed to copy to clipboard', err);
    });
  }
}
