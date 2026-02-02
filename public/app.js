/**
 * SpaceDelay - Real-time light-speed delay calculator
 * https://spacedelay.com
 */

// Constants
const SPEED_OF_LIGHT_KM_S = 299792.458;
const AU_TO_KM = 149597870.7;
const KM_TO_LY = 1 / 9.461e12; // 1 light-year in km
const DEG_TO_RAD = Math.PI / 180;
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0); // Jan 1, 2000, 12:00 UTC

// State
let orbitalData = null;
let selectedFrom = 'earth';
let selectedTo = 'mars';
let updateInterval = null;

/**
 * Initialize the application
 */
async function init() {
  try {
    // Load orbital data
    const response = await fetch('/orbital-data.json');
    orbitalData = await response.json();

    // Populate dropdowns
    populateSelectors();

    // Set up event listeners
    document.getElementById('body-from').addEventListener('change', onSelectionChange);
    document.getElementById('body-to').addEventListener('change', onSelectionChange);

    // Start the update loop
    update();
    updateInterval = setInterval(update, 1000);

  } catch (error) {
    console.error('Failed to initialize:', error);
    document.getElementById('distance-value').textContent = 'Error';
  }
}

/**
 * Populate the body selector dropdowns
 */
function populateSelectors() {
  const fromSelect = document.getElementById('body-from');
  const toSelect = document.getElementById('body-to');

  const bodies = Object.values(orbitalData.bodies);

  bodies.forEach(body => {
    const optionFrom = document.createElement('option');
    optionFrom.value = body.id;
    optionFrom.textContent = `${body.emoji} ${body.name}`;
    optionFrom.selected = body.id === selectedFrom;
    fromSelect.appendChild(optionFrom);

    const optionTo = document.createElement('option');
    optionTo.value = body.id;
    optionTo.textContent = `${body.emoji} ${body.name}`;
    optionTo.selected = body.id === selectedTo;
    toSelect.appendChild(optionTo);
  });
}

/**
 * Handle selection change
 */
function onSelectionChange() {
  selectedFrom = document.getElementById('body-from').value;
  selectedTo = document.getElementById('body-to').value;
  update();
}

/**
 * Main update function - called every second
 */
function update() {
  const now = new Date();

  // Update clock
  updateClock(now);

  // Calculate positions
  const pos1 = calculatePosition(selectedFrom, now);
  const pos2 = calculatePosition(selectedTo, now);

  // Calculate distance
  const distanceKm = calculateDistance(pos1, pos2);
  const distanceLy = distanceKm * KM_TO_LY;

  // Calculate light delay
  const lightDelaySeconds = distanceKm / SPEED_OF_LIGHT_KM_S;

  // Update display
  updateDistanceDisplay(distanceKm, distanceLy);
  updateDelayDisplay(lightDelaySeconds);
}

/**
 * Update the UTC clock display
 */
function updateClock(date) {
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toISOString().split('T')[1].split('.')[0];

  document.getElementById('current-date').textContent = dateStr;
  document.getElementById('current-time').textContent = timeStr;
}

/**
 * Calculate the heliocentric position of a body at a given time
 * Returns {x, y, z} in kilometers
 */
function calculatePosition(bodyId, date) {
  const body = orbitalData.bodies[bodyId];

  // Sun is at the center
  if (bodyId === 'sun') {
    return { x: 0, y: 0, z: 0 };
  }

  // Moon is special - orbits Earth
  if (bodyId === 'moon') {
    return calculateMoonPosition(date);
  }

  const elements = body.orbital_elements;
  if (!elements) {
    return { x: 0, y: 0, z: 0 };
  }

  // Calculate centuries since J2000
  const T = (date.getTime() - J2000_EPOCH) / (36525 * 24 * 60 * 60 * 1000);

  // Calculate current orbital elements (with secular variations)
  const a = elements.a + (elements.rates?.a || 0) * T;
  const e = elements.e + (elements.rates?.e || 0) * T;
  const i = (elements.i + (elements.rates?.i || 0) * T) * DEG_TO_RAD;
  const L = (elements.L + (elements.rates?.L || 0) * T) * DEG_TO_RAD;
  const w_bar = (elements.w_bar + (elements.rates?.w_bar || 0) * T) * DEG_TO_RAD;
  const omega = (elements.omega + (elements.rates?.omega || 0) * T) * DEG_TO_RAD;

  // Argument of perihelion
  const w = w_bar - omega;

  // Mean anomaly
  const M = L - w_bar;

  // Solve Kepler's equation for eccentric anomaly (Newton-Raphson)
  let E = M;
  for (let j = 0; j < 10; j++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  // True anomaly
  const v = 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );

  // Distance from Sun (in AU)
  const r = a * (1 - e * Math.cos(E));

  // Position in orbital plane
  const x_orb = r * Math.cos(v);
  const y_orb = r * Math.sin(v);

  // Rotate to heliocentric ecliptic coordinates
  const cos_w = Math.cos(w);
  const sin_w = Math.sin(w);
  const cos_omega = Math.cos(omega);
  const sin_omega = Math.sin(omega);
  const cos_i = Math.cos(i);
  const sin_i = Math.sin(i);

  const x_ecl = (cos_w * cos_omega - sin_w * sin_omega * cos_i) * x_orb +
                (-sin_w * cos_omega - cos_w * sin_omega * cos_i) * y_orb;
  const y_ecl = (cos_w * sin_omega + sin_w * cos_omega * cos_i) * x_orb +
                (-sin_w * sin_omega + cos_w * cos_omega * cos_i) * y_orb;
  const z_ecl = (sin_w * sin_i) * x_orb + (cos_w * sin_i) * y_orb;

  // Convert AU to km
  return {
    x: x_ecl * AU_TO_KM,
    y: y_ecl * AU_TO_KM,
    z: z_ecl * AU_TO_KM
  };
}

/**
 * Calculate Moon's position (relative to Sun, via Earth)
 */
function calculateMoonPosition(date) {
  // Get Earth's position
  const earthPos = calculatePosition('earth', date);

  // Simplified lunar position calculation
  const moonData = orbitalData.bodies.moon.orbital_elements;
  const T = (date.getTime() - J2000_EPOCH) / (moonData.period_days * 24 * 60 * 60 * 1000);

  // Mean longitude (simplified)
  const L = (moonData.L + 360 * T) * DEG_TO_RAD;

  // Approximate position in Earth-centered frame
  const r = moonData.a_km;
  const x_moon = r * Math.cos(L);
  const y_moon = r * Math.sin(L);
  const z_moon = r * Math.sin(L) * Math.sin(moonData.i * DEG_TO_RAD);

  // Add to Earth's position
  return {
    x: earthPos.x + x_moon,
    y: earthPos.y + y_moon,
    z: earthPos.z + z_moon
  };
}

/**
 * Calculate Euclidean distance between two 3D points
 */
function calculateDistance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Update the distance display
 */
function updateDistanceDisplay(distanceKm, distanceLy) {
  // Format distance in km with commas
  const kmFormatted = Math.round(distanceKm).toLocaleString('en-US');
  document.getElementById('distance-value').textContent = kmFormatted;

  // Format light-years (scientific notation for small values)
  let lyFormatted;
  if (distanceLy < 0.0001) {
    lyFormatted = distanceLy.toExponential(4);
  } else {
    lyFormatted = distanceLy.toFixed(6);
  }
  document.getElementById('distance-ly-value').textContent = lyFormatted;
}

/**
 * Update the light delay display
 */
function updateDelayDisplay(seconds) {
  const delayDisplay = document.getElementById('delay-display');

  let number, unit;

  if (seconds < 1) {
    // Milliseconds
    number = Math.round(seconds * 1000);
    unit = 'MILLISECONDS';
  } else if (seconds < 60) {
    // Seconds
    number = seconds.toFixed(2);
    unit = 'SECONDS';
  } else if (seconds < 3600) {
    // Minutes and seconds
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    number = `${mins}:${secs.toString().padStart(2, '0')}`;
    unit = 'LIGHT-MINUTES';
  } else {
    // Hours, minutes
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    number = `${hours}:${mins.toString().padStart(2, '0')}`;
    unit = 'LIGHT-HOURS';
  }

  delayDisplay.innerHTML = `
    <span class="delay-number">${number}</span>
    <span class="delay-unit">${unit}</span>
  `;
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
