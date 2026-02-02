# SpaceDelay

Real-time light-speed delay calculator between celestial bodies.

**How long does light take to travel from Earth to Mars right now?**

**Live at [spacedelay.com](https://spacedelay.com)**

## Features

- Live UTC clock with real-time updates
- Select any two bodies in the inner solar system
- See distance in kilometers and AU
- Watch the light-speed delay change as planets orbit
- Clean, dark theme inspired by NASA mission control
- All calculations run in your browser - no server required

## Supported Bodies

- Sun
- Mercury
- Venus
- Earth
- Moon
- Mars
- Ceres

## How It Works

The app uses Keplerian orbital elements to calculate planet positions in real-time, entirely in your browser.

1. Orbital elements define each body's path around the Sun
2. JavaScript calculates current positions using basic orbital mechanics
3. Distance = 3D Euclidean distance between two positions
4. Light delay = Distance / Speed of light (299,792.458 km/s)

## API

A free public API is coming soon for developers and AI assistants.

## Development

```bash
# Clone the repo
git clone https://github.com/kalman17/spacedelay.git
cd spacedelay

# Run locally
python3 -m http.server 8080 --directory public
# or with Node.js
npx wrangler pages dev public/

# Open http://localhost:8080
```

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
