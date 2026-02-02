# SpaceDelay - TODO

## Priority: Verification

- [ ] **Create test script to verify orbital calculations**
  - Compare calculated distances against NASA JPL Horizons data
  - Especially verify Ceres calculations (looked slightly off during manual testing)
  - Test edge cases: same body selected, extreme dates, etc.
  - Could use NASA Horizons API to fetch "ground truth" positions for comparison

## Priority: AI Searchability

- [ ] **Make site AI-assistant friendly**
  - People will ask their AIs "what's the current delay between Earth and Mars?"
  - AIs need to easily navigate and extract answers from our site
  - Add structured data (JSON-LD schema) for WebApplication/Dataset
  - Ensure clean semantic HTML that's easy to parse
  - Add descriptive meta tags and OpenGraph data
  - Make API well-documented and easily discoverable
  - Consider adding a `/api/answer?q=` endpoint that returns plain-text answers
  - Add llms.txt or similar AI-friendly metadata
  - Test with ChatGPT, Claude, Perplexity web search to verify discoverability

## Future Features

- [ ] Date/time picker (enable the placeholder buttons)
- [ ] Outer planets (Jupiter, Saturn, Uranus, Neptune)
- [ ] 2D solar system map
- [ ] ISS tracking
- [ ] Rocket travel time calculator
