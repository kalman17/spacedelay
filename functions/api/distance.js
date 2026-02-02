/**
 * SpaceDelay API - Distance endpoint
 * Cloudflare Pages Function
 */

// Constants
const SPEED_OF_LIGHT_KM_S = 299792.458;
const AU_TO_KM = 149597870.7;
const KM_TO_LY = 1 / 9.461e12;
const KM_TO_MILES = 0.621371;
const DEG_TO_RAD = Math.PI / 180;
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0);

// Orbital data (embedded for serverless function)
const BODIES = {
  sun: {
    id: 'sun',
    name: 'Sun',
    orbital_elements: null
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    orbital_elements: {
      a: 0.38709927, e: 0.20563593, i: 7.00497902,
      L: 252.25032350, w_bar: 77.45779628, omega: 48.33076593,
      rates: { a: 0.00000037, e: 0.00001906, i: -0.00594749, L: 149472.67411175, w_bar: 0.16047689, omega: -0.12534081 }
    }
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    orbital_elements: {
      a: 0.72333566, e: 0.00677672, i: 3.39467605,
      L: 181.97909950, w_bar: 131.60246718, omega: 76.67984255,
      rates: { a: 0.00000390, e: -0.00004107, i: -0.00078890, L: 58517.81538729, w_bar: 0.00268329, omega: -0.27769418 }
    }
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    orbital_elements: {
      a: 1.00000261, e: 0.01671123, i: -0.00001531,
      L: 100.46457166, w_bar: 102.93768193, omega: 0.0,
      rates: { a: 0.00000562, e: -0.00004392, i: -0.01294668, L: 35999.37244981, w_bar: 0.32327364, omega: 0.0 }
    }
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    orbital_elements: { a_km: 384400, e: 0.0549, i: 5.145, L: 218.32, period_days: 27.321661 }
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    orbital_elements: {
      a: 1.52371034, e: 0.09339410, i: 1.84969142,
      L: -4.55343205, w_bar: -23.94362959, omega: 49.55953891,
      rates: { a: 0.00001847, e: 0.00007882, i: -0.00813131, L: 19140.30268499, w_bar: 0.44441088, omega: -0.29257343 }
    }
  },
  ceres: {
    id: 'ceres',
    name: 'Ceres',
    orbital_elements: {
      a: 2.7675, e: 0.0758, i: 10.59, L: 153.94, w_bar: 73.59, omega: 80.39,
      rates: { a: 0, e: 0, i: 0, L: 78.19, w_bar: 0, omega: 0 }
    }
  }
};

/**
 * Main handler
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60'
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // Get parameters
  const fromId = url.searchParams.get('from')?.toLowerCase();
  const toId = url.searchParams.get('to')?.toLowerCase();

  // Validate
  if (!fromId || !toId) {
    return new Response(JSON.stringify({
      error: 'Missing parameters',
      message: 'Both "from" and "to" parameters are required'
    }), { status: 400, headers });
  }

  if (!BODIES[fromId]) {
    return new Response(JSON.stringify({
      error: 'Invalid body ID',
      message: `Body '${fromId}' is not supported. Valid IDs: ${Object.keys(BODIES).join(', ')}`
    }), { status: 400, headers });
  }

  if (!BODIES[toId]) {
    return new Response(JSON.stringify({
      error: 'Invalid body ID',
      message: `Body '${toId}' is not supported. Valid IDs: ${Object.keys(BODIES).join(', ')}`
    }), { status: 400, headers });
  }

  // Calculate
  const now = new Date();
  const pos1 = calculatePosition(fromId, now);
  const pos2 = calculatePosition(toId, now);
  const distanceKm = calculateDistance(pos1, pos2);
  const lightDelaySeconds = distanceKm / SPEED_OF_LIGHT_KM_S;

  // Format response
  const response = {
    from: { id: fromId, name: BODIES[fromId].name },
    to: { id: toId, name: BODIES[toId].name },
    distance: {
      km: Math.round(distanceKm * 10) / 10,
      miles: Math.round(distanceKm * KM_TO_MILES * 10) / 10,
      au: Math.round((distanceKm / AU_TO_KM) * 10000) / 10000,
      light_years: distanceKm * KM_TO_LY
    },
    light_delay: {
      seconds: Math.round(lightDelaySeconds * 100) / 100,
      formatted: formatLightDelay(lightDelaySeconds)
    },
    timestamp: now.toISOString(),
    data_source: 'keplerian'
  };

  return new Response(JSON.stringify(response, null, 2), { headers });
}

/**
 * Calculate heliocentric position
 */
function calculatePosition(bodyId, date) {
  if (bodyId === 'sun') {
    return { x: 0, y: 0, z: 0 };
  }

  if (bodyId === 'moon') {
    const earthPos = calculatePosition('earth', date);
    const moonData = BODIES.moon.orbital_elements;
    const T = (date.getTime() - J2000_EPOCH) / (moonData.period_days * 24 * 60 * 60 * 1000);
    const L = (moonData.L + 360 * T) * DEG_TO_RAD;
    const r = moonData.a_km;
    return {
      x: earthPos.x + r * Math.cos(L),
      y: earthPos.y + r * Math.sin(L),
      z: earthPos.z + r * Math.sin(L) * Math.sin(moonData.i * DEG_TO_RAD)
    };
  }

  const elements = BODIES[bodyId].orbital_elements;
  const T = (date.getTime() - J2000_EPOCH) / (36525 * 24 * 60 * 60 * 1000);

  const a = elements.a + (elements.rates?.a || 0) * T;
  const e = elements.e + (elements.rates?.e || 0) * T;
  const i = (elements.i + (elements.rates?.i || 0) * T) * DEG_TO_RAD;
  const L = (elements.L + (elements.rates?.L || 0) * T) * DEG_TO_RAD;
  const w_bar = (elements.w_bar + (elements.rates?.w_bar || 0) * T) * DEG_TO_RAD;
  const omega = (elements.omega + (elements.rates?.omega || 0) * T) * DEG_TO_RAD;

  const w = w_bar - omega;
  const M = L - w_bar;

  let E = M;
  for (let j = 0; j < 10; j++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }

  const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E));

  const x_orb = r * Math.cos(v);
  const y_orb = r * Math.sin(v);

  const cos_w = Math.cos(w), sin_w = Math.sin(w);
  const cos_omega = Math.cos(omega), sin_omega = Math.sin(omega);
  const cos_i = Math.cos(i), sin_i = Math.sin(i);

  return {
    x: ((cos_w * cos_omega - sin_w * sin_omega * cos_i) * x_orb + (-sin_w * cos_omega - cos_w * sin_omega * cos_i) * y_orb) * AU_TO_KM,
    y: ((cos_w * sin_omega + sin_w * cos_omega * cos_i) * x_orb + (-sin_w * sin_omega + cos_w * cos_omega * cos_i) * y_orb) * AU_TO_KM,
    z: ((sin_w * sin_i) * x_orb + (cos_w * sin_i) * y_orb) * AU_TO_KM
  };
}

/**
 * Calculate Euclidean distance
 */
function calculateDistance(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Format light delay as human-readable string
 */
function formatLightDelay(seconds) {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  } else if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}
