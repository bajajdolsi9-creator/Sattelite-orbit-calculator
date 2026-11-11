# Satellite Orbit Speed & Period Calculator

A responsive, high-performance aerospace dashboard and simulator designed for calculating, visualizing, and analyzing circular orbital mechanics around Earth and customizable celestial bodies.

---

## 🚀 Features & Capabilities

### 1. Two-Body Circular Orbital Mechanics Engine
- **Orbital Radius**: $r = R_{\text{body}} + h$
- **Orbital Speed**: $v = \sqrt{\frac{G \cdot M}{r}}$ (in km/s, km/h, mph, and Mach number)
- **Orbital Period**: $T = 2\pi \sqrt{\frac{r^3}{G \cdot M}}$ (intelligent formatting into seconds, minutes, hours, and days)
- **Orbital Frequency**: $f = \frac{86,400}{T}$ (revolutions per Earth 24-hour day)
- **Specific Orbital Energy**: $\varepsilon = -\frac{G \cdot M}{2r}$ (in MJ/kg)
- **Escape Velocity**: $v_{\text{esc}} = \sqrt{\frac{2 G M}{r}} = \sqrt{2} \cdot v_{\text{orbit}}$
- **Local Gravitational Acceleration**: $g(h) = \frac{G \cdot M}{r^2}$ and fraction of surface $1g$
- **Atmospheric Drag Warning**: Automatically triggers when orbital altitude is below the central body's Kármán line / sensible atmosphere.

### 2. Multi-Body Gravitational Support
- **Earth**: $M = 5.9722 \times 10^{24}$ kg, $R = 6,371.0$ km
- **Moon**: $M = 7.342 \times 10^{22}$ kg, $R = 1,737.4$ km
- **Mars**: $M = 6.4171 \times 10^{23}$ kg, $R = 3,389.5$ km
- **Jupiter**: $M = 1.8982 \times 10^{27}$ kg, $R = 69,911.0$ km
- **Sun**: $M = 1.9885 \times 10^{30}$ kg, $R = 696,340.0$ km
- **Custom Body**: Full customization of planetary mass ($M$) and radius ($R$).

### 3. Quick One-Click Presets
- **LEO (ISS)**: 420 km altitude, $v \approx 7.66$ km/s, $T \approx 92.8$ min
- **LEO (Starlink / Hubble)**: 550 km altitude, $v \approx 7.59$ km/s, $T \approx 95.6$ min
- **SSO (Sun-Synchronous)**: 800 km altitude, $v \approx 7.45$ km/s, $T \approx 100.8$ min
- **MEO (GPS / Galileo)**: 20,200 km altitude, $v \approx 3.87$ km/s, $T \approx 11.96$ hrs
- **GEO (Geostationary Belt)**: 35,786 km altitude, $v \approx 3.07$ km/s, $T \approx 23$h 56m 04s
- **HEO (Molniya Apogee)**: 39,800 km altitude
- **Cislunar (Moon Distance)**: 384,400 km altitude, $v \approx 1.02$ km/s, $T \approx 27.32$ days

### 4. Real-time 2D Orbital Canvas Simulator
- Photorealistic celestial body rendering with atmospheric radial glow, rotating continents/surface, and axial tilt.
- Circular orbit track with dynamic telemetry markings and dimension lines ($R$, $h$, $r$).
- Spacecraft rendering with solar panels, velocity vector $\vec{v}$ (tangent), gravitational acceleration vector $\vec{g}$ (radial inward), and radar telemetry ping.
- Pan & zoom interactivity, auto-fit button, and variable time acceleration ($1\times$ to $10,000\times$).

### 3. Dedicated Orbital Inputs & Controls
- **Orbital Radius Selector ($r$)**: High-precision input and slider for total distance from planetary center of mass ($r = R_{\text{body}} + h$).
- **Satellite Altitude Input ($h$)**: Input and slider for altitude above surface, linked bidirectionally to orbital radius ($h = r - R_{\text{body}}$).
- **Calculate Button**: High-impact calculation trigger that recalculates orbital state, pulses telemetry cards, synchronizes the 2D visualizer, and updates active cursors on both curves.
- **Unit Support**: Instant toggle between Metric (km, km/s, km/h) and Imperial (miles, mi/s, mph).

### 4. Interactive Keplerian Mechanics Curves (Chart.js)
- **Orbital Radius vs. Orbital Speed ($r$ vs. $v$)**: Displays $v = \sqrt{\frac{G \cdot M}{r}}$, showing the inverse square root decay of orbital speed as radius expands.
- **Orbital Radius vs. Time Period ($r$ vs. $T$)**: Displays Kepler's 3rd Law harmonic relation $T = 2\pi\sqrt{\frac{r^3}{G \cdot M}}$, demonstrating why period increases exponentially with orbital radius.
- **Active Real-Time Telemetry Cursor**: A glowing dynamic marker highlighting the user's active $(r, v)$ and $(r, T)$ coordinate on both charts.
- **Controls**: Linear vs. Logarithmic scaling and LEO / MEO / Cislunar range filters.

### 6. Export & Audio
- **Copy Telemetry Report**: Markdown format for aerospace briefings.
- **Export JSON & CSV**: Instant download for external analysis.
- **Synthesized UI Audio**: Web Audio API sound effects with mute toggle.

---

## 🛠️ Tech Stack
- **HTML5 Canvas & ES6 Modules**: High-DPI canvas rendering and physics engine.
- **Tailwind CSS & Custom Glassmorphic CSS**: "Deep Space Aerospace" dark HUD aesthetic.
- **Chart.js**: Responsive scientific data visualizations.
- **KaTeX**: LaTeX mathematical typesetting for formulas.
- **Lucide Icons**: Crisp vector UI icons.
