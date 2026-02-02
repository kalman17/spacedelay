# SpaceDelay API

Free API for calculating light-speed delay between celestial bodies.

## Base URL

```
https://spacedelay.com/api
```

## Endpoint

### GET /distance

Calculate the current distance and light delay between two celestial bodies.

**Parameters:**

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| from      | string | Yes      | Source body ID |
| to        | string | Yes      | Target body ID |

**Valid Body IDs:**

- `sun` - The Sun
- `mercury` - Mercury
- `venus` - Venus
- `earth` - Earth
- `moon` - Earth's Moon
- `mars` - Mars
- `ceres` - Ceres (dwarf planet)

**Example Request:**

```bash
curl "https://spacedelay.com/api/distance?from=earth&to=mars"
```

**Example Response:**

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
    "au": 2.682,
    "light_years": 0.0000424
  },
  "light_delay": {
    "seconds": 1338.5,
    "formatted": "22m 18s"
  },
  "timestamp": "2026-02-02T12:00:00.000Z",
  "data_source": "keplerian"
}
```

## Rate Limits

| Tier | Limit |
|------|-------|
| Free | 100 requests/day per IP |

**Rate Limit Headers:**

- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Unix timestamp when limit resets

## Error Responses

**400 Bad Request** - Invalid parameters

```json
{
  "error": "Invalid body ID",
  "message": "Body 'pluto' is not supported. Valid IDs: sun, mercury, venus, earth, moon, mars, ceres"
}
```

**429 Too Many Requests** - Rate limit exceeded

```json
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded 100 requests today. Try again tomorrow.",
  "reset": 1706918400
}
```

## CORS

The API supports CORS and can be called from any origin.

## Data Accuracy

Positions are calculated using Keplerian orbital elements, which provide approximately 1% accuracy - suitable for educational and casual use. For scientific applications requiring higher precision, use NASA JPL Horizons directly.

## Usage Examples

### JavaScript

```javascript
const response = await fetch('https://spacedelay.com/api/distance?from=earth&to=mars');
const data = await response.json();
console.log(`Light delay to Mars: ${data.light_delay.formatted}`);
```

### Python

```python
import requests

response = requests.get('https://spacedelay.com/api/distance', params={
    'from': 'earth',
    'to': 'mars'
})
data = response.json()
print(f"Light delay to Mars: {data['light_delay']['formatted']}")
```
