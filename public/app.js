/**
 * SpaceDelay - Real-time light-speed delay calculator
 * https://spacedelay.com
 */

// Constants
const SPEED_OF_LIGHT_KM_S = 299792.458;
const AU_TO_KM = 149597870.7;
const KM_TO_AU = 1 / 149597870.7; // 1 AU in km
const DEG_TO_RAD = Math.PI / 180;
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0); // Jan 1, 2000, 12:00 UTC

// State
let orbitalData = null;
let selectedFrom = 'earth';
let selectedTo = 'mars';
let updateInterval = null;

// Map state
let canvas, ctx;
let pulseProgress = 0;  // 0 to 2 (0-1 = from→to, 1-2 = to→from)
let lastFrameTime = 0;
let cachedPositions = {};  // Cache positions to avoid recalculating every frame

// Animation state for date transitions
const animationState = {
  mode: 'idle',           // 'idle' | 'animating'
  displayMode: 'live',    // 'live' | 'fixed'
  startTime: null,        // performance.now() timestamp
  duration: 0,            // ms
  startDate: null,        // Date object
  targetDate: null,       // Date object
  currentSimDate: null,   // Date - current simulation time
};

// Animation constants
const ANIMATION_CONFIG = {
  MIN_DURATION_MS: 1500,
  MAX_DURATION_MS: 10000,
  LOG_FACTOR: 800,        // ms per doubling of time delta
  DAY_MS: 86400000,       // ms per day
  DATE_RANGE_YEARS: 50,   // ±50 years from current date
};

// Map constants
const PULSE_PIXELS_PER_SECOND = 120;  // Constant speed in pixels per second
const BODY_COLORS = {
  sun: '#ffdd00',
  mercury: '#b5b5b5',
  venus: '#e6c87a',
  earth: '#4a90d9',
  moon: '#c0c0c0',
  mars: '#d45f3c',
  ceres: '#8a8a8a'
};
const BODY_SIZES = {
  sun: 14,
  mercury: 4,
  venus: 6,
  earth: 6,
  moon: 3,
  mars: 5,
  ceres: 4
};

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

    // Initialize context sentence body names
    updateContextNames();

    // Set up event listeners
    document.getElementById('body-from').addEventListener('change', onSelectionChange);
    document.getElementById('body-to').addEventListener('change', onSelectionChange);

    // Set up date input handlers
    initDateInput();

    // Start the update loop
    update();
    updateInterval = setInterval(update, 1000);

    // Initialize solar map
    initMap();

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
    optionFrom.textContent = body.name;
    optionFrom.selected = body.id === selectedFrom;
    fromSelect.appendChild(optionFrom);

    const optionTo = document.createElement('option');
    optionTo.value = body.id;
    optionTo.textContent = body.name;
    optionTo.selected = body.id === selectedTo;
    toSelect.appendChild(optionTo);
  });
}

/**
 * Update context sentence body names
 */
function updateContextNames() {
  let fromName = orbitalData.bodies[selectedFrom]?.name || selectedFrom;
  let toName = orbitalData.bodies[selectedTo]?.name || selectedTo;
  if (fromName === 'Sun') fromName = 'the Sun';
  if (toName === 'Sun') toName = 'the Sun';
  document.getElementById('context-from').textContent = fromName;
  document.getElementById('context-to').textContent = toName;
}

/**
 * Handle selection change
 */
function onSelectionChange() {
  selectedFrom = document.getElementById('body-from').value;
  selectedTo = document.getElementById('body-to').value;
  updateContextNames();
  update();
}

/**
 * Main update function - called every second
 * Skips updates during animation (handled by renderMap)
 */
function update() {
  // Skip if animating - renderMap handles updates during animation
  if (animationState.mode === 'animating') {
    return;
  }

  // Get current simulation date (live or fixed)
  const simDate = getCurrentSimulationDate();

  // Update displays
  updateDisplaysForDate(simDate);

  // Update map positions
  if (orbitalData) {
    updateCachedPositionsForDate(simDate);
  }
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

// ============================================
// DATE ANIMATION SYSTEM
// ============================================

/**
 * Cubic ease-in-out function
 * Smooth acceleration from rest, peak speed at midpoint, smooth deceleration
 */
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Calculate animation duration based on time delta
 * Uses logarithmic scaling so small changes are fast, large changes take longer
 */
function calculateAnimationDuration(timeDeltaMs) {
  const { MIN_DURATION_MS, MAX_DURATION_MS, LOG_FACTOR, DAY_MS } = ANIMATION_CONFIG;
  const absDelta = Math.abs(timeDeltaMs);
  const deltaDays = Math.max(1, absDelta / DAY_MS);
  const duration = MIN_DURATION_MS + LOG_FACTOR * Math.log2(deltaDays);
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, duration));
}

/**
 * Validate a date is within allowed range (±50 years from now)
 */
function isDateInRange(date) {
  const now = new Date();
  const minDate = new Date(now.getFullYear() - ANIMATION_CONFIG.DATE_RANGE_YEARS, now.getMonth(), now.getDate());
  const maxDate = new Date(now.getFullYear() + ANIMATION_CONFIG.DATE_RANGE_YEARS, now.getMonth(), now.getDate());
  return date >= minDate && date <= maxDate;
}

/**
 * Start animation to a new date (callable anytime, handles interruption)
 */
function animateToDate(targetDate) {
  // Determine starting point
  let startDate;
  if (animationState.mode === 'animating') {
    // Interrupt current animation - start from current position
    startDate = animationState.currentSimDate;
  } else if (animationState.displayMode === 'live') {
    startDate = new Date();
  } else {
    startDate = animationState.currentSimDate || new Date();
  }

  const timeDelta = targetDate.getTime() - startDate.getTime();

  // Don't animate if delta is tiny (less than 1 minute)
  if (Math.abs(timeDelta) < 60000) {
    animationState.currentSimDate = targetDate;
    animationState.displayMode = 'fixed';
    animationState.mode = 'idle';
    updateUIForFixedMode();
    return;
  }

  animationState.mode = 'animating';
  animationState.startTime = performance.now();
  animationState.duration = calculateAnimationDuration(timeDelta);
  animationState.startDate = startDate;
  animationState.targetDate = targetDate;
  animationState.currentSimDate = startDate;
  animationState.displayMode = 'fixed';

  // Update UI to show we're not live
  updateUIForFixedMode();
  blankDisplays();
}

/**
 * Tick the animation state machine (called every frame)
 */
function tickAnimation(frameTimestamp) {
  if (animationState.mode !== 'animating') return;

  const elapsed = frameTimestamp - animationState.startTime;
  const linearProgress = Math.min(1, elapsed / animationState.duration);
  const easedProgress = easeInOutCubic(linearProgress);

  // Interpolate simulation time
  const startMs = animationState.startDate.getTime();
  const targetMs = animationState.targetDate.getTime();
  const simMs = startMs + (targetMs - startMs) * easedProgress;

  animationState.currentSimDate = new Date(simMs);

  // Check for completion
  if (linearProgress >= 1) {
    animationState.mode = 'idle';
    animationState.currentSimDate = animationState.targetDate;
    restoreDisplays();
  }
}

/**
 * Return to live mode (animates from current position to now)
 */
function goLive() {
  if (animationState.displayMode === 'live' && animationState.mode === 'idle') {
    return; // Already live
  }

  // Set display mode to live so after animation completes we stay live
  animationState.displayMode = 'live';

  // Animate from current position to current time
  const startDate = animationState.currentSimDate || new Date();
  const now = new Date();
  const timeDelta = now.getTime() - startDate.getTime();

  // If very close to live, just snap to live
  if (Math.abs(timeDelta) < 60000) {
    animationState.mode = 'idle';
    animationState.currentSimDate = null;
    updateUIForLiveMode();
    return;
  }

  animationState.mode = 'animating';
  animationState.startTime = performance.now();
  animationState.duration = calculateAnimationDuration(timeDelta);
  animationState.startDate = startDate;
  animationState.targetDate = now;
  animationState.currentSimDate = startDate;

  updateUIForLiveMode();
  blankDisplays();
}

/**
 * Get the current simulation date (respects animation and display mode)
 */
function getCurrentSimulationDate() {
  if (animationState.mode === 'animating') {
    return animationState.currentSimDate;
  }
  if (animationState.displayMode === 'live') {
    return new Date();
  }
  return animationState.currentSimDate || new Date();
}

/**
 * Update UI for fixed (non-live) mode
 */
function updateUIForFixedMode() {
  const liveButton = document.getElementById('live-button');
  if (liveButton) {
    liveButton.classList.add('inactive');
  }
}

/**
 * Update UI for live mode
 */
function updateUIForLiveMode() {
  const liveButton = document.getElementById('live-button');
  if (liveButton) {
    liveButton.classList.remove('inactive');
  }
}

/**
 * Blank the distance and delay displays during animation
 */
function blankDisplays() {
  document.getElementById('distance-value').textContent = '---';
  document.getElementById('distance-au-value').textContent = '---';

  // Blank all clock digits
  const digitIds = ['hour-1', 'hour-2', 'min-1', 'min-2', 'sec-1', 'sec-2', 'tenth', 'hundredth'];
  digitIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '8';
      el.classList.add('blank');
    }
  });

  // Blank separators
  ['sep-hm', 'sep-ms'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('blank');
  });
}

/**
 * Restore displays after animation completes
 */
function restoreDisplays() {
  // Displays will be restored by the next update() call or renderMap frame
  // Just trigger a recalculation
  const simDate = getCurrentSimulationDate();
  updateDisplaysForDate(simDate);
}

/**
 * Update all displays for a specific date
 */
function updateDisplaysForDate(date) {
  // Update clock
  updateClock(date);

  // Calculate positions
  const pos1 = calculatePosition(selectedFrom, date);
  const pos2 = calculatePosition(selectedTo, date);

  // Calculate distance
  const distanceKm = calculateDistance(pos1, pos2);
  const distanceAu = distanceKm * KM_TO_AU;

  // Calculate light delay
  const lightDelaySeconds = distanceKm / SPEED_OF_LIGHT_KM_S;

  // Update displays
  updateDistanceDisplay(distanceKm, distanceAu);
  updateDelayDisplay(lightDelaySeconds);
}

// ============================================
// DATE INPUT UI
// ============================================

/**
 * Initialize date input UI handlers
 */
function initDateInput() {
  const dateDisplay = document.getElementById('current-date');
  const dateInputWrapper = document.getElementById('date-input-wrapper');
  const timeDisplayNormal = document.getElementById('time-display-normal');
  const yearInput = document.getElementById('date-year');
  const monthInput = document.getElementById('date-month');
  const dayInput = document.getElementById('date-day');
  const submitBtn = document.getElementById('date-submit-btn');
  const cancelBtn = document.getElementById('date-cancel-btn');
  const dateError = document.getElementById('date-error');
  const liveButton = document.getElementById('live-button');

  // Click on date to show input
  dateDisplay.addEventListener('click', () => {
    showDateInput();
  });

  // Auto-advance between fields
  yearInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length >= 4) {
      monthInput.focus();
      monthInput.select();
    }
  });

  monthInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length >= 2) {
      dayInput.focus();
      dayInput.select();
    }
  });

  dayInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
  });

  // Handle Enter key to submit
  const handleKeydown = (e) => {
    if (e.key === 'Enter') {
      submitDate();
    } else if (e.key === 'Escape') {
      hideDateInput();
    }
  };

  yearInput.addEventListener('keydown', handleKeydown);
  monthInput.addEventListener('keydown', handleKeydown);
  dayInput.addEventListener('keydown', handleKeydown);

  // Submit button
  submitBtn.addEventListener('click', submitDate);

  // Cancel button
  cancelBtn.addEventListener('click', hideDateInput);

  // LIVE button click handler
  liveButton.addEventListener('click', () => {
    if (animationState.displayMode !== 'live' || animationState.mode === 'animating') {
      goLive();
    }
  });
}

/**
 * Show the date input fields
 */
function showDateInput() {
  const dateInputWrapper = document.getElementById('date-input-wrapper');
  const timeDisplayNormal = document.getElementById('time-display-normal');
  const yearInput = document.getElementById('date-year');
  const monthInput = document.getElementById('date-month');
  const dayInput = document.getElementById('date-day');
  const dateError = document.getElementById('date-error');

  // Get current simulation date to pre-fill
  const currentDate = getCurrentSimulationDate();
  yearInput.value = currentDate.getUTCFullYear();
  monthInput.value = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
  dayInput.value = String(currentDate.getUTCDate()).padStart(2, '0');

  // Clear any previous error
  dateError.textContent = '';

  // Show input, hide normal display
  timeDisplayNormal.style.display = 'none';
  dateInputWrapper.style.display = 'flex';

  // Focus year input and select all
  yearInput.focus();
  yearInput.select();
}

/**
 * Hide the date input fields
 */
function hideDateInput() {
  const dateInputWrapper = document.getElementById('date-input-wrapper');
  const timeDisplayNormal = document.getElementById('time-display-normal');
  const dateError = document.getElementById('date-error');

  dateInputWrapper.style.display = 'none';
  timeDisplayNormal.style.display = 'flex';
  dateError.textContent = '';
}

/**
 * Submit the date from input fields
 */
function submitDate() {
  const yearInput = document.getElementById('date-year');
  const monthInput = document.getElementById('date-month');
  const dayInput = document.getElementById('date-day');
  const dateError = document.getElementById('date-error');

  const year = parseInt(yearInput.value, 10);
  const month = parseInt(monthInput.value, 10);
  const day = parseInt(dayInput.value, 10);

  // Basic validation
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    dateError.textContent = 'Please enter a valid date';
    return;
  }

  if (month < 1 || month > 12) {
    dateError.textContent = 'Month must be 1-12';
    return;
  }

  if (day < 1 || day > 31) {
    dateError.textContent = 'Day must be 1-31';
    return;
  }

  // Create date at midnight UTC
  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  // Check if date is valid (handles things like Feb 30)
  if (targetDate.getUTCFullYear() !== year ||
      targetDate.getUTCMonth() !== month - 1 ||
      targetDate.getUTCDate() !== day) {
    dateError.textContent = 'Invalid date';
    return;
  }

  // Check if within allowed range (±50 years)
  if (!isDateInRange(targetDate)) {
    const now = new Date();
    const minYear = now.getFullYear() - ANIMATION_CONFIG.DATE_RANGE_YEARS;
    const maxYear = now.getFullYear() + ANIMATION_CONFIG.DATE_RANGE_YEARS;
    dateError.textContent = `Date must be between ${minYear} and ${maxYear}`;
    return;
  }

  // Hide input and animate to new date
  hideDateInput();
  animateToDate(targetDate);
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
function updateDistanceDisplay(distanceKm, distanceAu) {
  // Format distance in km with commas
  const kmFormatted = Math.round(distanceKm).toLocaleString('en-US');
  document.getElementById('distance-value').textContent = kmFormatted;

  // Format AU
  const auFormatted = distanceAu.toFixed(4);
  document.getElementById('distance-au-value').textContent = auFormatted;
}

/**
 * Update the light delay display (NASA countdown clock style)
 */
function updateDelayDisplay(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const fraction = Math.floor((seconds % 1) * 100);
  const tenths = Math.floor(fraction / 10);
  const hundredths = fraction % 10;

  // Helper to set digit with optional blank class
  function setDigit(id, value, isBlank) {
    const el = document.getElementById(id);
    el.textContent = isBlank ? '8' : value;
    el.classList.toggle('blank', isBlank);
  }

  // Helper to set separator blank state
  function setSeparator(id, isBlank) {
    const el = document.getElementById(id);
    el.classList.toggle('blank', isBlank);
  }

  // Cascading blank logic
  const hoursBlank = hours === 0;
  const minsBlank = hours === 0 && mins === 0;
  const secsLeadingBlank = hours === 0 && mins === 0 && secs < 10;

  // Update digits
  setDigit('hour-1', Math.floor(hours / 10) % 10, hours < 10);
  setDigit('hour-2', hours % 10, hoursBlank);
  setDigit('min-1', Math.floor(mins / 10), minsBlank || (hoursBlank && mins < 10));
  setDigit('min-2', mins % 10, minsBlank);
  setDigit('sec-1', Math.floor(secs / 10), secsLeadingBlank);
  setDigit('sec-2', secs % 10, false);
  setDigit('tenth', tenths, false);
  setDigit('hundredth', hundredths, false);

  // Update separators
  setSeparator('sep-hm', hoursBlank);
  setSeparator('sep-ms', minsBlank);
}

// ============================================
// SOLAR MAP
// ============================================

/**
 * Initialize the solar system map
 */
function initMap() {
  canvas = document.getElementById('solar-map');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  resizeCanvas();

  // Validate dimensions before starting render loop
  // Firefox may return 0 before CSS is fully applied
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    requestAnimationFrame(initMap);
    return;
  }

  window.addEventListener('resize', resizeCanvas);
  updateCachedPositions();
  requestAnimationFrame(renderMap);
}

/**
 * Handle canvas resize
 */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

/**
 * Update cached body positions for a given date
 */
function updateCachedPositionsForDate(date) {
  for (const body of Object.values(orbitalData.bodies)) {
    const pos = calculatePosition(body.id, date);
    cachedPositions[body.id] = {
      x: pos.x / AU_TO_KM,  // Store in AU
      y: pos.y / AU_TO_KM,
      z: pos.z / AU_TO_KM
    };
  }
}

// Backwards compatibility alias
function updateCachedPositions() {
  updateCachedPositionsForDate(getCurrentSimulationDate());
}

/**
 * Get canvas position for a body (with Moon exaggeration)
 */
function getBodyCanvasPos(bodyId, width, height) {
  const posAU = cachedPositions[bodyId];
  if (!posAU) return null;

  if (bodyId === 'moon') {
    const earthPos = cachedPositions['earth'];
    const earthCanvas = toCanvasCoords(earthPos, width, height);
    const moonAngle = Math.atan2(posAU.y - earthPos.y, posAU.x - earthPos.x);
    return {
      x: earthCanvas.x + Math.cos(moonAngle) * 20,
      y: earthCanvas.y - Math.sin(moonAngle) * 20
    };
  }
  return toCanvasCoords(posAU, width, height);
}

/**
 * Main map render loop (60fps)
 */
function renderMap(timestamp) {
  if (!ctx) return;

  const deltaTime = lastFrameTime ? (timestamp - lastFrameTime) / 1000 : 0;
  lastFrameTime = timestamp;

  // Tick animation state machine
  tickAnimation(timestamp);

  // Get current simulation date and update positions
  const simDate = getCurrentSimulationDate();
  if (orbitalData) {
    updateCachedPositionsForDate(simDate);
  }

  // Update clock display during animation
  if (animationState.mode === 'animating') {
    updateClock(simDate);
  }

  // Get canvas dimensions
  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;

  // Calculate pixel distance between selected bodies for constant speed pulse
  // Only animate pulse when NOT animating to new date
  const fromCanvas = getBodyCanvasPos(selectedFrom, width, height);
  const toCanvas = getBodyCanvasPos(selectedTo, width, height);
  if (fromCanvas && toCanvas && animationState.mode !== 'animating') {
    const dx = toCanvas.x - fromCanvas.x;
    const dy = toCanvas.y - fromCanvas.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    // Time for one-way trip
    const oneWayTime = pixelDist / PULSE_PIXELS_PER_SECOND;
    // Progress increment for this frame (0 to 2 is full round trip)
    if (oneWayTime > 0) {
      pulseProgress = (pulseProgress + deltaTime / oneWayTime) % 2;
    }
  }

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw everything
  drawOrbits(width, height);
  drawBodies(width, height);

  // Only draw light pulse when NOT animating
  if (animationState.mode !== 'animating') {
    drawLightPulse(width, height);
  }

  requestAnimationFrame(renderMap);
}

/**
 * Convert AU position to canvas coordinates with linear scaling
 * This preserves true orbital ratios (Mercury at ~53% of Venus, not ~73%)
 */
function toCanvasCoords(posAU, width, height) {
  const centerX = width / 2;
  const centerY = height / 2;

  // Linear scale - divide by max orbit radius (Ceres ~2.8 AU) with padding
  const maxOrbitAU = 3.0;  // Ceres + margin
  const scale = Math.min(width, height) / 2 / maxOrbitAU * 1.0;  // 95% to leave small margin

  return {
    x: centerX + posAU.x * scale,
    y: centerY - posAU.y * scale  // Flip Y for screen coords
  };
}

/**
 * Calculate orbital position for a given true anomaly (for drawing orbits)
 */
function calculateOrbitPoint(bodyId, trueAnomalyDeg) {
  const body = orbitalData.bodies[bodyId];
  const elements = body.orbital_elements;
  if (!elements || !elements.a) return { x: 0, y: 0 };

  const v = trueAnomalyDeg * DEG_TO_RAD;
  const a = elements.a;
  const e = elements.e;

  // Distance from focus at this true anomaly
  const r = a * (1 - e * e) / (1 + e * Math.cos(v));

  // Position in orbital plane
  const x_orb = r * Math.cos(v);
  const y_orb = r * Math.sin(v);

  // Get rotation angles (simplified - just use w_bar for longitude of perihelion)
  const w_bar = (elements.w_bar || 0) * DEG_TO_RAD;
  const omega = (elements.omega || 0) * DEG_TO_RAD;
  const i = (elements.i || 0) * DEG_TO_RAD;
  const w = w_bar - omega;

  // Rotate to ecliptic coordinates
  const cos_w = Math.cos(w);
  const sin_w = Math.sin(w);
  const cos_omega = Math.cos(omega);
  const sin_omega = Math.sin(omega);
  const cos_i = Math.cos(i);

  const x_ecl = (cos_w * cos_omega - sin_w * sin_omega * cos_i) * x_orb +
                (-sin_w * cos_omega - cos_w * sin_omega * cos_i) * y_orb;
  const y_ecl = (cos_w * sin_omega + sin_w * cos_omega * cos_i) * x_orb +
                (-sin_w * sin_omega + cos_w * cos_omega * cos_i) * y_orb;

  return { x: x_ecl, y: y_ecl };
}

/**
 * Draw orbital paths by plotting points (matches body positioning exactly)
 */
function drawOrbits(width, height) {
  ctx.strokeStyle = '#2a2a35';
  ctx.lineWidth = 1;

  for (const body of Object.values(orbitalData.bodies)) {
    if (body.id === 'sun') continue;
    if (body.id === 'moon') continue;

    const elements = body.orbital_elements;
    if (!elements || !elements.a) continue;

    ctx.beginPath();
    for (let angle = 0; angle <= 360; angle += 3) {
      const posAU = calculateOrbitPoint(body.id, angle);
      const canvasPos = toCanvasCoords(posAU, width, height);

      if (angle === 0) {
        ctx.moveTo(canvasPos.x, canvasPos.y);
      } else {
        ctx.lineTo(canvasPos.x, canvasPos.y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }
}

/**
 * Draw celestial bodies at their current positions
 */
function drawBodies(width, height) {
  // Draw in order: outer to inner, so inner planets render on top
  const drawOrder = ['ceres', 'mars', 'earth', 'moon', 'venus', 'mercury', 'sun'];

  for (const bodyId of drawOrder) {
    const body = orbitalData.bodies[bodyId];
    if (!body) continue;

    const canvasPos = getBodyCanvasPos(bodyId, width, height);
    if (!canvasPos) continue;

    const radius = BODY_SIZES[bodyId] || 4;
    const color = BODY_COLORS[bodyId] || '#888';
    const isSelected = bodyId === selectedFrom || bodyId === selectedTo;

    // Draw selection glow
    if (isSelected) {
      const glowGradient = ctx.createRadialGradient(
        canvasPos.x, canvasPos.y, radius,
        canvasPos.x, canvasPos.y, radius + 12
      );
      glowGradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
      glowGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

      ctx.beginPath();
      ctx.arc(canvasPos.x, canvasPos.y, radius + 12, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();
    }

    // Draw body with gradient for 3D effect
    const gradient = ctx.createRadialGradient(
      canvasPos.x - radius * 0.3, canvasPos.y - radius * 0.3, 0,
      canvasPos.x, canvasPos.y, radius
    );
    gradient.addColorStop(0, lightenColor(color, 40));
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, darkenColor(color, 30));

    ctx.beginPath();
    ctx.arc(canvasPos.x, canvasPos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

/**
 * Draw the animated light pulse between selected bodies
 */
function drawLightPulse(width, height) {
  const fromCanvas = getBodyCanvasPos(selectedFrom, width, height);
  const toCanvas = getBodyCanvasPos(selectedTo, width, height);
  if (!fromCanvas || !toCanvas) return;

  const dx = toCanvas.x - fromCanvas.x;
  const dy = toCanvas.y - fromCanvas.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;

  // Calculate pulse position along line (direct connection, no offset)
  // 0-1: traveling from -> to
  // 1-2: traveling to -> from
  const t = pulseProgress < 1 ? pulseProgress : 2 - pulseProgress;
  const startPt = pulseProgress < 1 ? fromCanvas : toCanvas;
  const endPt = pulseProgress < 1 ? toCanvas : fromCanvas;

  const pulseX = startPt.x + (endPt.x - startPt.x) * t;
  const pulseY = startPt.y + (endPt.y - startPt.y) * t;

  // Direction of travel (normalized)
  const dirX = (endPt.x - startPt.x) / dist;
  const dirY = (endPt.y - startPt.y) / dist;

  // Fade out as approaching destination (last 20%)
  let opacity = 1;
  if (t > 0.8) {
    opacity = 1 - (t - 0.8) / 0.2;
  }

  // Draw a light-like streak/glow
  // Outer glow (larger, more transparent, cyan tint)
  const glowRadius = 12;
  const glowGradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, glowRadius);
  glowGradient.addColorStop(0, `rgba(150, 220, 255, ${opacity * 0.4})`);
  glowGradient.addColorStop(0.5, `rgba(100, 180, 255, ${opacity * 0.15})`);
  glowGradient.addColorStop(1, 'rgba(100, 180, 255, 0)');

  ctx.beginPath();
  ctx.arc(pulseX, pulseY, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = glowGradient;
  ctx.fill();

  // Inner bright core (small and sharp)
  const coreGradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 3);
  coreGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
  coreGradient.addColorStop(0.5, `rgba(200, 230, 255, ${opacity * 0.8})`);
  coreGradient.addColorStop(1, `rgba(150, 200, 255, 0)`);

  ctx.beginPath();
  ctx.arc(pulseX, pulseY, 3, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();

  // Tiny bright center point
  ctx.beginPath();
  ctx.arc(pulseX, pulseY, 1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.fill();
}

/**
 * Lighten a hex color
 */
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Darken a hex color
 */
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Start the app when page is fully loaded (including CSS)
window.addEventListener('load', init);
