# SpaceDelay - Vision & Roadmap

Real-time light-speed delay calculator between celestial bodies.

## Project Overview

**Name:** SpaceDelay
**Domain:** spacedelay.com ($10/year via Cloudflare)
**Tagline:** "How long does light take to travel between planets?"

### Core Feature (MVP)
- **Live UTC clock** at top of page (always updating)
- **Placeholder date/time buttons** next to clock (disabled, for future functionality)
- Select two celestial bodies from dropdown lists
- Display **real-time updating** distance (km) and light-delay (seconds/minutes)
- Distance and delay visibly change as planets orbit

### Initial Scope (MVP Bodies Only)
**Inner solar system + Ceres only:**
- Sun, Mercury, Venus, Earth, Moon, Mars, Ceres
- NO outer planets initially (Jupiter, Saturn, etc.)
- NO solar system map initially

### Tech Stack
- **Frontend:** Vanilla JS + CSS (no framework)
- **Hosting:** Cloudflare Pages (free)
- **API:** Cloudflare Workers (free tier, 100k req/day)
- **Data:** Keplerian orbital elements (client-side calculations)
- **License:** MIT (open source)
- **Repo:** GitHub (public)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    spacedelay.com                       │
│                  (Cloudflare Pages)                     │
├─────────────────────────────────────────────────────────┤
│  Static Assets          │  API Worker                  │
│  - index.html           │  /api/distance               │
│  - style.css            │  - Fetches from NASA JPL     │
│  - app.js               │  - Falls back to Keplerian   │
│  - orbital-data.json    │  - Returns JSON              │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
1. User selects two bodies (dropdowns)
2. Browser calculates distance using local orbital data (fast, no API)
3. Optional: API call for precise NASA data (cached 1 hour)
4. Display: distance, light-time, arrival time (updates every second)

---

## File Structure

```
spacedelay/
├── README.md
├── LICENSE                    # MIT
├── .gitignore
├── wrangler.toml              # Cloudflare Workers config
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── orbital-data.json      # Pre-calculated Keplerian elements
│   └── favicon.svg
├── functions/
│   └── api/
│       └── distance.js        # Cloudflare Worker function
└── docs/
    └── API.md                 # API documentation
```

---

## UI Design

### Visual Style
- **Theme:** Dark (space aesthetic)
- **Colors:**
  - Background: `#0a0a0f` (near black)
  - Accent: `#00d4ff` (cyan, mission control style)
  - Text: `#e0e0e0` (light gray)
  - Highlight: `#ff6b35` (warm accent for Mars, etc.)
- **Typography:** Monospace for numbers (JetBrains Mono or similar)
- **Aesthetic:** NASA mission control meets modern minimalism

### Layout (Mobile-First)

```
┌─────────────────────────────────────────────────────────┐
│  SPACEDELAY                              [GitHub] [API] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [📅] [⏰]   2026-02-02  14:32:07 UTC   ● LIVE        │
│   (disabled placeholder buttons for future date/time)  │
│                                                         │
│   ─────────────────────────────────────────────────    │
│                                                         │
│   [▼ Earth 🌍]              [▼ Mars 🔴]                │
│                                                         │
│            401,284,562 km                               │
│              0.00004 ly                                 │
│                                                         │
│   ╔═══════════════════════════════════════════════╗    │
│   ║                                               ║    │
│   ║      2 2 : 1 9   LIGHT-MINUTES               ║    │
│   ║                                               ║    │
│   ╚═══════════════════════════════════════════════╝    │
│                                                         │
│   ─────────────────────────────────────────────────    │
│   Distance updates in real-time as planets orbit.      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### UI Components
1. **Live UTC clock:** Current date/time, always updating (every second)
2. **Placeholder buttons:** Calendar and clock icons (grayed out, not clickable yet)
3. **"LIVE" indicator:** Shows data is real-time (will change to "CUSTOM" when date picker enabled)
4. **Body selectors:** Two dropdowns (inner planets + Ceres only)
5. **Distance display:** Large km + small light-years below it
6. **Light-time display:** Seconds if <60s, otherwise minutes:seconds format
7. **Footer:** Minimal - GitHub link, API docs, NASA data attribution

---

## Celestial Bodies (MVP - Inner Solar System Only)

| Body | Emoji | Notes |
|------|-------|-------|
| Sun | ☀️ | Center of solar system |
| Mercury | ☿️ | Inner planet |
| Venus | ♀️ | Inner planet |
| Earth | 🌍 | Default "from" |
| Moon | 🌙 | Earth's satellite |
| Mars | 🔴 | Default "to" |
| Ceres | ⚫ | Dwarf planet in asteroid belt |

**Future expansion:** Jupiter, Saturn, Uranus, Neptune, ISS, Voyager probes

---

## Implementation Phases

### Phase 1: Project Setup
1. Create `spacedelay/` directory
2. Initialize git repo
3. Create file structure
4. Write README.md with project vision
5. Add MIT LICENSE
6. Create .gitignore

### Phase 2: Core Functionality
1. Create `orbital-data.json` with Keplerian orbital elements (inner planets + Ceres)
2. Implement `app.js`:
   - Load orbital data
   - Calculate current positions from Keplerian elements
   - Calculate distance between two selected bodies
   - Calculate light-time (distance / speed of light)
   - Live UTC clock updating every second
   - Distance/delay updating every second
3. Create dropdown selectors for bodies (Earth default "from", Mars default "to")
4. Placeholder buttons for date/time picker (disabled, grayed out)

### Phase 3: UI Implementation
1. Build `index.html` with semantic structure
2. Style with `style.css`:
   - Dark theme (space aesthetic)
   - Live UTC clock at top with "LIVE" indicator
   - Placeholder date/time buttons (grayed out, cursor: not-allowed)
   - Responsive design (mobile-first)
   - Mission control style number display
   - Distance in km (large) + light-years (small, below)
3. Add planet emoji/icons in dropdowns
4. Create favicon (simple space/delay themed)

### Phase 4: API (Cloudflare Worker)
1. Set up `wrangler.toml`
2. Create `/api/distance` endpoint:
   - Input: `?from=earth&to=mars`
   - Output: `{ distance_km, light_seconds, bodies, timestamp }`
3. Implement rate limiting (100 req/day per IP)
4. Add CORS headers
5. Write API documentation

### Phase 5: Polish & Deploy
1. SEO optimization:
   - Meta tags
   - Open Graph
   - Schema markup
2. Performance optimization
3. Test on multiple devices
4. Deploy to Cloudflare Pages
5. Configure custom domain

---

## API Design

### Endpoint: `GET /api/distance`

**Request:**
```
GET /api/distance?from=earth&to=mars
```

**Response:**
```json
{
  "from": {
    "id": "earth",
    "name": "Earth"
  },
  "to": {
    "id": "mars",
    "name": "Mars"
  },
  "distance": {
    "km": 401284562.5,
    "miles": 249366042.8,
    "au": 2.682
  },
  "light_delay": {
    "seconds": 1338.5,
    "formatted": "22m 18s"
  },
  "timestamp": "2026-02-02T12:00:00Z",
  "data_source": "keplerian"
}
```

**Rate Limits:**
- Free: 100 requests/day per IP
- Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Data Source Strategy

### Primary: Keplerian Orbital Elements (Client-Side)
- Pre-calculated orbital elements in JSON
- Runs entirely in browser
- Updates planet positions in real-time
- Accuracy: ~1% (good enough for casual use)
- No external API calls needed

### Secondary: NASA JPL Horizons (API Enhancement)
- More precise ephemeris data
- Called by Cloudflare Worker
- Cached for 1 hour
- Fallback to Keplerian if API fails

### Keplerian Elements Needed (per body):
- Semi-major axis (a)
- Eccentricity (e)
- Inclination (i)
- Longitude of ascending node (Ω)
- Argument of perihelion (ω)
- Mean anomaly at epoch (M₀)
- Epoch (reference time)

---

## Real-Time Update Strategy

**Goal:** Distance and light-delay update visibly in real-time without overwhelming the browser.

### Efficiency Approach
1. **Update once per second** - Human eyes can't perceive faster changes in numbers
2. **Pure math, no API calls** - All calculations from Keplerian elements (instant)
3. **requestAnimationFrame throttled** - Sync with browser refresh, not faster
4. **Minimal DOM updates** - Only update the specific text nodes that changed

### How it works:
```javascript
// Pseudocode
setInterval(() => {
  const now = Date.now();
  const pos1 = calculatePosition(body1, now);  // ~0.1ms
  const pos2 = calculatePosition(body2, now);  // ~0.1ms
  const distance = calculateDistance(pos1, pos2);  // ~0.01ms
  const lightTime = distance / SPEED_OF_LIGHT;
  updateDisplay(distance, lightTime);  // Only touch changed elements
}, 1000);  // Once per second
```

### Why this is efficient:
- Keplerian calculation is ~10 lines of math (sin, cos, basic arithmetic)
- No network requests
- No heavy libraries
- Total CPU time: <1ms per second
- Works on any device, including old phones

---

## SEO Strategy

1. **Title:** "SpaceDelay - Real-Time Light Speed Delay Between Planets"
2. **Description:** "How long does it take light to travel from Earth to Mars? Find out the current light-speed delay between any two planets in our solar system."
3. **Keywords in content:**
   - "light speed delay"
   - "light travel time"
   - "earth to mars delay"
   - "communication delay space"
4. **Schema.org markup:** WebApplication, SoftwareApplication
5. **Fast loading:** Target < 1s initial load

---

## Future Roadmap (Not MVP)

### Phase 2 (Near-term)
1. **Date/time picker:** Enable the placeholder buttons to select any past/future date
2. **Outer planets:** Add Jupiter, Saturn, Uranus, Neptune
3. **ISS tracker:** Real-time delay to ISS

### Phase 3 (Medium-term)
4. **2D solar system map:** Visual representation, click two bodies to link them
5. **Rocket travel time:** Based on current propulsion tech
6. **Voyager tracker:** How far are the Voyager probes?

### Phase 4 (Long-term "Colonization Planner")
7. **Historical events:** "Apollo 11 had X delay"
8. **Starlink visualization:** Communication network delays
9. **Educational content:** Life on other planets, communication challenges
10. **Widget/embed:** For space blogs
11. **Mobile app:** PWA

---

## Verification

After implementation, verify:

1. **Functionality:**
   - [ ] Dropdowns list all 7 bodies (Sun, Mercury, Venus, Earth, Moon, Mars, Ceres)
   - [ ] Default selection: Earth → Mars
   - [ ] UTC clock updates every second
   - [ ] Distance (km + ly) updates every second
   - [ ] Light-delay updates every second
   - [ ] Light-time calculation correct: `distance_km / 299792.458 = seconds`
   - [ ] Placeholder date/time buttons visible but not clickable

2. **Real-time behavior:**
   - [ ] Watch for 60+ seconds - distance should visibly change (especially Earth-Mars)
   - [ ] No performance issues (check browser dev tools, should be <1% CPU)
   - [ ] No network requests after initial page load

3. **API:**
   - [ ] `/api/distance?from=earth&to=mars` returns valid JSON
   - [ ] Rate limiting works (test 101 requests)
   - [ ] CORS allows browser access

4. **UI/UX:**
   - [ ] Responsive on mobile (test 375px width)
   - [ ] Dark theme displays correctly
   - [ ] "LIVE" indicator visible
   - [ ] Page loads in < 2 seconds

5. **Deployment:**
   - [ ] `git push` triggers Cloudflare deploy
   - [ ] Site accessible at spacedelay.com (after domain configured)
   - [ ] HTTPS works
   - [ ] API endpoint accessible

---

## Commands Summary

```bash
# Create project
mkdir -p spacedelay && cd spacedelay

# Initialize git
git init

# Install nothing (vanilla JS!)

# Local development
npx wrangler pages dev public/

# Deploy
git add . && git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/spacedelay.git
git push -u origin main
# Then connect repo to Cloudflare Pages
```

---

## Cost Summary

| Item | Cost |
|------|------|
| Domain (spacedelay.com) | $10/year |
| Cloudflare Pages | Free |
| Cloudflare Workers | Free (100k req/day) |
| GitHub repo | Free |
| **Total** | **$10/year** |
