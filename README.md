# SpaceDelay

Real-time light-speed delay calculator between celestial bodies.

**How long does light take to travel from Earth to Mars right now?**

## Features

- Live UTC clock with real-time updates
- Select any two bodies in the inner solar system
- See distance in kilometers and light-years
- Watch the light-speed delay change as planets orbit
- Clean, dark theme inspired by NASA mission control

## Supported Bodies (MVP)

- Sun
- Mercury
- Venus
- Earth
- Moon
- Mars
- Ceres

## Tech Stack

- **Frontend:** Vanilla JS + CSS (no framework, zero dependencies)
- **Hosting:** Cloudflare Pages (free)
- **API:** Cloudflare Workers (free tier)
- **Data:** Keplerian orbital elements (client-side calculations)

## Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/spacedelay.git
cd spacedelay

# Run locally (requires Node.js)
npx wrangler pages dev public/

# Open http://localhost:8788
```

## How It Works

The app uses Keplerian orbital elements to calculate planet positions in real-time, entirely in your browser. No external API calls needed for the core functionality.

1. Orbital elements define each body's path around the Sun
2. JavaScript calculates current positions using basic orbital mechanics
3. Distance = 3D Euclidean distance between two positions
4. Light delay = Distance / Speed of light (299,792.458 km/s)

## API

A free API is available for developers:

```
GET /api/distance?from=earth&to=mars
```

See [API Documentation](docs/API.md) for details.

## Cost

- Domain: $10/year
- Everything else: Free

## Future Plans

- Date/time picker for historical or future delays
- Outer planets (Jupiter, Saturn, Uranus, Neptune)
- 2D solar system map
- Rocket travel time calculator
- ISS and Voyager tracking

## License

MIT License - See [LICENSE](LICENSE)

## Credits

- Orbital data based on NASA JPL ephemeris
- Built with Cloudflare Pages
