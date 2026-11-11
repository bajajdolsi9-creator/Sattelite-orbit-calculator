/**
 * Orbital Mechanics Physics Engine
 * Implements two-body circular orbital mechanics around Earth and customizable celestial bodies.
 * 
 * Formulas:
 *   - Orbital Radius: r = R + h
 *   - Orbital Speed: v = sqrt(G * M / r)
 *   - Orbital Period: T = 2 * pi * sqrt(r^3 / (G * M))
 *   - Orbital Frequency: f = 86400 / T (orbits per 24-hour day)
 *   - Specific Orbital Energy: epsilon = - (G * M) / (2 * r)
 *   - Escape Velocity: v_esc = sqrt(2 * G * M / r)
 *   - Gravitational Acceleration: g(h) = G * M / r^2
 */

export const G_CONSTANT = 6.67430e-11; // m^3 / (kg * s^2)

export const CELESTIAL_BODIES = {
  earth: {
    id: 'earth',
    name: 'Earth',
    mass: 5.97219e24, // kg
    radius: 6371.0,   // km
    color: '#00f0ff',
    glowColor: 'rgba(0, 240, 255, 0.4)',
    surfaceGravity: 9.807, // m/s^2
    atmosphereHeight: 100, // km (Karman Line)
    textureType: 'earth',
    description: 'Third planet from the Sun; primary hub for human satellite infrastructure.'
  },
  moon: {
    id: 'moon',
    name: 'Moon (Earth)',
    mass: 7.342e22, // kg
    radius: 1737.4,  // km
    color: '#cbd5e1',
    glowColor: 'rgba(203, 213, 225, 0.3)',
    surfaceGravity: 1.62, // m/s^2
    atmosphereHeight: 0,
    textureType: 'moon',
    description: 'Earth’s only natural satellite. Target for the Artemis program and Lunar Gateway.'
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    mass: 6.4171e23, // kg
    radius: 3389.5,  // km
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.35)',
    surfaceGravity: 3.72, // m/s^2
    atmosphereHeight: 80,
    textureType: 'mars',
    description: 'The Red Planet. Primary target for future interplanetary colonization.'
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    mass: 1.8982e27, // kg
    radius: 69911.0, // km
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.35)',
    surfaceGravity: 24.79, // m/s^2
    atmosphereHeight: 1000,
    textureType: 'jupiter',
    description: 'The solar system’s largest gas giant with extreme gravitational field.'
  },
  sun: {
    id: 'sun',
    name: 'Sun',
    mass: 1.9885e30, // kg
    radius: 696340.0, // km
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    surfaceGravity: 274.0, // m/s^2
    atmosphereHeight: 10000,
    textureType: 'sun',
    description: 'Yellow dwarf star at the center of the solar system.'
  },
  custom: {
    id: 'custom',
    name: 'Custom Body',
    mass: 5.97219e24,
    radius: 6371.0,
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
    surfaceGravity: 9.807,
    atmosphereHeight: 100,
    textureType: 'custom',
    description: 'Custom astronomical object defined by user parameters.'
  }
};

export const STANDARD_PRESETS = [
  {
    id: 'leo-iss',
    name: 'ISS (Low Earth Orbit)',
    bodyId: 'earth',
    altitude: 420,
    classTag: 'LEO',
    tagColor: 'cyan',
    description: 'International Space Station orbit; microgravity orbital laboratory.'
  },
  {
    id: 'leo-starlink',
    name: 'Starlink / Hubble Constellation',
    bodyId: 'earth',
    altitude: 550,
    classTag: 'LEO',
    tagColor: 'cyan',
    description: 'Low-latency mega-constellation & high-resolution orbital telescopes.'
  },
  {
    id: 'sso-earth',
    name: 'Sun-Synchronous Orbit (SSO)',
    bodyId: 'earth',
    altitude: 800,
    classTag: 'SSO',
    tagColor: 'emerald',
    description: 'Crosses equator at the same local solar time; ideal for weather & imaging.'
  },
  {
    id: 'meo-gps',
    name: 'GPS / Galileo Navigation',
    bodyId: 'earth',
    altitude: 20200,
    classTag: 'MEO',
    tagColor: 'violet',
    description: 'Semi-synchronous orbit completing 2 orbits per sidereal day.'
  },
  {
    id: 'geo-clarke',
    name: 'Geostationary Belt (GEO)',
    bodyId: 'earth',
    altitude: 35786,
    classTag: 'GEO',
    tagColor: 'amber',
    description: 'Synchronized with Earth rotation; stationary relative to surface.'
  },
  {
    id: 'heo-molniya',
    name: 'Molniya Orbit (Apogee)',
    bodyId: 'earth',
    altitude: 39800,
    classTag: 'HEO',
    tagColor: 'rose',
    description: 'High-apogee orbit providing extended coverage over high northern latitudes.'
  },
  {
    id: 'lunar-orbit',
    name: 'Moon Distance (Earth Orbit)',
    bodyId: 'earth',
    altitude: 384400,
    classTag: 'CISLUNAR',
    tagColor: 'indigo',
    description: 'Average distance of the Moon orbiting the Earth-Moon barycenter.'
  }
];

/**
 * Calculates complete orbital state for given altitude and central body
 * @param {number} altitudeKm - Altitude above surface in kilometers
 * @param {object} body - Celestial body object with mass (kg) and radius (km)
 * @returns {object} Orbital telemetry results
 */
export function calculateOrbit(altitudeKm, body = CELESTIAL_BODIES.earth) {
  const h_km = Math.max(0.1, Number(altitudeKm) || 0.1);
  const R_km = Number(body.radius) || 6371.0;
  const M_kg = Number(body.mass) || 5.97219e24;
  
  // Total orbital radius
  const r_km = R_km + h_km;
  const r_m = r_km * 1000;
  const R_m = R_km * 1000;
  
  // Standard Gravitational Parameter: mu = G * M (m^3 / s^2)
  const mu = G_CONSTANT * M_kg;
  
  // Orbital Speed: v = sqrt(G * M / r) [m/s]
  const v_ms = Math.sqrt(mu / r_m);
  const v_kms = v_ms / 1000;
  const v_kmh = v_kms * 3600;
  const v_mph = v_kmh * 0.621371;
  const mach = v_ms / 343.0; // Standard sea-level sound speed reference
  
  // Orbital Period: T = 2 * pi * sqrt(r^3 / (G * M)) [seconds]
  const T_sec = 2 * Math.PI * Math.sqrt(Math.pow(r_m, 3) / mu);
  const T_min = T_sec / 60;
  const T_hr = T_sec / 3600;
  const T_days = T_sec / 86400;
  
  // Orbital Frequency: f = 86400 / T (orbits per 24 hours)
  const orbitsPerDay = 86400 / T_sec;
  
  // Specific Orbital Energy: epsilon = - mu / (2 * r) [J/kg]
  const specificEnergy_Jkg = -mu / (2 * r_m);
  const specificEnergy_MJkg = specificEnergy_Jkg / 1e6;
  
  // Escape Velocity at altitude: v_esc = sqrt(2 * G * M / r) [m/s]
  const v_esc_ms = Math.sqrt((2 * mu) / r_m);
  const v_esc_kms = v_esc_ms / 1000;
  
  // Local Gravitational Acceleration at altitude: g(h) = G * M / r^2 [m/s^2]
  const g_local = mu / Math.pow(r_m, 2);
  const surfaceGravity = mu / Math.pow(R_m, 2);
  const g_ratio = g_local / (surfaceGravity || 9.807);
  
  // Drag warning flag
  const isAtmosphericDrag = body.atmosphereHeight > 0 && h_km < body.atmosphereHeight;
  
  return {
    altitudeKm: h_km,
    bodyRadiusKm: R_km,
    totalRadiusKm: r_km,
    totalRadiusMeters: r_m,
    bodyMassKg: M_kg,
    mu: mu,
    
    // Velocity
    speedKms: v_kms,
    speedKmh: v_kmh,
    speedMph: v_mph,
    speedMs: v_ms,
    mach: mach,
    
    // Period
    periodSec: T_sec,
    periodMin: T_min,
    periodHours: T_hr,
    periodDays: T_days,
    periodFormatted: formatOrbitalPeriod(T_sec),
    periodCompact: formatPeriodCompact(T_sec),
    
    // Frequency
    orbitsPerDay: orbitsPerDay,
    
    // Advanced Telemetry
    specificEnergyMJkg: specificEnergy_MJkg,
    escapeVelocityKms: v_esc_kms,
    localGravity: g_local,
    surfaceGravity: surfaceGravity,
    gravityRatio: g_ratio,
    
    // Atmospheric flags
    isAtmosphericDrag: isAtmosphericDrag,
    atmosphereHeight: body.atmosphereHeight || 0
  };
}

/**
 * Calculates complete orbital state from a target orbital period (seconds)
 * Kepler's Third Law Inverse: r = ( (G * M * T^2) / (4 * pi^2) )^(1/3)
 * @param {number} periodSeconds 
 * @param {object} body 
 * @returns {object} Orbital telemetry results
 */
export function calculateOrbitFromPeriod(periodSeconds, body = CELESTIAL_BODIES.earth) {
  const M_kg = Number(body.mass) || 5.97219e24;
  const R_km = Number(body.radius) || 6371.0;
  const mu = G_CONSTANT * M_kg;
  
  const T = Math.max(1, Number(periodSeconds) || 1);
  const r_m = Math.cbrt((mu * Math.pow(T, 2)) / (4 * Math.pow(Math.PI, 2)));
  const r_km = r_m / 1000;
  const h_km = Math.max(0.1, r_km - R_km);
  
  return calculateOrbit(h_km, body);
}

/**
 * Intelligently formats seconds into human-readable orbital period string
 * e.g. "1h 32m 48s" or "27d 7h 43m"
 * @param {number} totalSeconds 
 * @returns {string} Formatted period string
 */
export function formatOrbitalPeriod(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0 s';
  
  const sec = Math.floor(totalSeconds % 60);
  const totalMin = Math.floor(totalSeconds / 60);
  const min = totalMin % 60;
  const totalHours = Math.floor(totalSeconds / 3600);
  const hours = totalHours % 24;
  const days = Math.floor(totalSeconds / 86400);
  
  if (days > 0) {
    return `${days}d ${hours}h ${min}m ${sec}s`;
  }
  if (totalHours > 0) {
    return `${totalHours}h ${min}m ${sec}s`;
  }
  if (totalMin > 0) {
    return `${totalMin}m ${sec}s`;
  }
  return `${totalSeconds.toFixed(1)}s`;
}

/**
 * Compact format for badges or chart labels
 */
export function formatPeriodCompact(totalSeconds) {
  if (totalSeconds < 3600) {
    return `${(totalSeconds / 60).toFixed(1)} min`;
  } else if (totalSeconds < 86400) {
    return `${(totalSeconds / 3600).toFixed(2)} hrs`;
  } else {
    return `${(totalSeconds / 86400).toFixed(2)} days`;
  }
}

/**
 * Generates an array of points for velocity and period curves over an orbital radius range
 * @param {object} body 
 * @param {number} minRadius - Min orbital radius in km (r = R + h_min)
 * @param {number} maxRadius - Max orbital radius in km (r = R + h_max)
 * @param {number} steps - Number of sample points
 * @param {boolean} logarithmic - Whether to sample logarithmically
 * @returns {Array<{radius: number, altitude: number, speed: number, periodHours: number, periodMin: number}>}
 */
export function generateOrbitalCurves(body, minRadius = 6471, maxRadius = 50000, steps = 120, logarithmic = false) {
  const points = [];
  const R_km = Number(body.radius) || 6371.0;
  const clampedMin = Math.max(R_km + 10, minRadius);
  const clampedMax = Math.max(clampedMin + 100, maxRadius);
  
  if (logarithmic) {
    const logMin = Math.log10(clampedMin);
    const logMax = Math.log10(clampedMax);
    const stepSize = (logMax - logMin) / (steps - 1);
    
    for (let i = 0; i < steps; i++) {
      const r = Math.pow(10, logMin + i * stepSize);
      const alt = Math.max(0.1, r - R_km);
      const orbit = calculateOrbit(alt, body);
      points.push({
        radius: r,
        altitude: alt,
        speed: orbit.speedKms,
        periodHours: orbit.periodHours,
        periodMin: orbit.periodMin
      });
    }
  } else {
    const stepSize = (clampedMax - clampedMin) / (steps - 1);
    for (let i = 0; i < steps; i++) {
      const r = clampedMin + i * stepSize;
      const alt = Math.max(0.1, r - R_km);
      const orbit = calculateOrbit(alt, body);
      points.push({
        radius: r,
        altitude: alt,
        speed: orbit.speedKms,
        periodHours: orbit.periodHours,
        periodMin: orbit.periodMin
      });
    }
  }
  
  return points;
}
