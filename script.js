const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const locateBtn = document.getElementById('locateBtn');
const statusLine = document.getElementById('statusLine');
const station = document.getElementById('station');
const emptyState = document.getElementById('emptyState');

const placeEl = document.getElementById('place');
const dialNeedle = document.getElementById('dialNeedle');
const dialTemp = document.getElementById('dialTemp');
const dialCondition = document.getElementById('dialCondition');
const statFeels = document.getElementById('statFeels');
const statHumidity = document.getElementById('statHumidity');
const statWind = document.getElementById('statWind');
const statPressure = document.getElementById('statPressure');
const forecastStrip = document.getElementById('forecastStrip');

// WMO weather codes grouped into categories
function weatherCategory(code) {
  if (code === 0) return 'clear';
  if ([1, 2].includes(code)) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloudy';
}

const CATEGORY_LABEL = {
  'clear': 'Clear sky',
  'partly-cloudy': 'Partly cloudy',
  'cloudy': 'Overcast',
  'fog': 'Fog',
  'drizzle': 'Drizzle',
  'rain': 'Rain',
  'snow': 'Snow',
  'storm': 'Thunderstorm'
};

function weatherIconSVG(category, size = 34) {
  const stroke = '#EAE6DA';
  const amber = '#E2A33C';
  const blue = '#5B8FA8';
  const icons = {
    'clear': `<circle cx="17" cy="17" r="7" fill="${amber}"/>
      <g stroke="${amber}" stroke-width="1.6" stroke-linecap="round">
        <line x1="17" y1="2" x2="17" y2="6"/><line x1="17" y1="28" x2="17" y2="32"/>
        <line x1="2" y1="17" x2="6" y2="17"/><line x1="28" y1="17" x2="32" y2="17"/>
        <line x1="6.5" y1="6.5" x2="9.2" y2="9.2"/><line x1="24.8" y1="24.8" x2="27.5" y2="27.5"/>
        <line x1="6.5" y1="27.5" x2="9.2" y2="24.8"/><line x1="24.8" y1="9.2" x2="27.5" y2="6.5"/>
      </g>`,
    'partly-cloudy': `<circle cx="13" cy="13" r="6" fill="${amber}"/>
      <path d="M8 26a6 6 0 0 1 1-11.9 8 8 0 0 1 15.4 2.4A5.5 5.5 0 0 1 24 26H8Z" fill="${stroke}" opacity="0.9"/>`,
    'cloudy': `<path d="M7 25a6 6 0 0 1 1-11.9 8 8 0 0 1 15.4 2.4A5.5 5.5 0 0 1 23 25H7Z" fill="${stroke}" opacity="0.85"/>`,
    'fog': `<g stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" opacity="0.85">
      <line x1="5" y1="13" x2="29" y2="13"/><line x1="8" y1="18" x2="26" y2="18"/>
      <line x1="5" y1="23" x2="29" y2="23"/></g>`,
    'drizzle': `<path d="M7 18a6 6 0 0 1 1-11.9A8 8 0 0 1 23.4 8.5 5.5 5.5 0 0 1 23 18H7Z" fill="${stroke}" opacity="0.85"/>
      <g stroke="${blue}" stroke-width="1.6" stroke-linecap="round"><line x1="12" y1="23" x2="10" y2="28"/><line x1="18" y1="23" x2="16" y2="28"/><line x1="24" y1="23" x2="22" y2="28"/></g>`,
    'rain': `<path d="M7 16a6 6 0 0 1 1-11.9A8 8 0 0 1 23.4 6.5 5.5 5.5 0 0 1 23 16H7Z" fill="${stroke}" opacity="0.85"/>
      <g stroke="${blue}" stroke-width="2" stroke-linecap="round"><line x1="11" y1="21" x2="8" y2="29"/><line x1="18" y1="21" x2="15" y2="29"/><line x1="25" y1="21" x2="22" y2="29"/></g>`,
    'snow': `<path d="M7 16a6 6 0 0 1 1-11.9A8 8 0 0 1 23.4 6.5 5.5 5.5 0 0 1 23 16H7Z" fill="${stroke}" opacity="0.85"/>
      <g fill="${blue}"><circle cx="10" cy="25" r="1.6"/><circle cx="17" cy="28" r="1.6"/><circle cx="24" cy="25" r="1.6"/></g>`,
    'storm': `<path d="M7 15a6 6 0 0 1 1-11.9A8 8 0 0 1 23.4 5.5 5.5 5.5 0 0 1 23 15H7Z" fill="${stroke}" opacity="0.85"/>
      <polygon points="18,18 12,24 16,24 14,31 22,22 17,22" fill="${amber}"/>`
  };
  return `<svg viewBox="0 0 34 34" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${icons[category] || icons['cloudy']}</svg>`;
}

function setStatus(text, isError = false) {
  statusLine.textContent = text;
  statusLine.classList.toggle('error', isError);
}

// Map a temperature (Celsius) to a needle rotation on the dial.
// Dial spans -20C to 45C across a 180-degree semicircle.
function tempToAngle(tempC) {
  const min = -20, max = 45;
  const clamped = Math.max(min, Math.min(max, tempC));
  const fraction = (clamped - min) / (max - min);
  return -90 + fraction * 180;
}

async function geocodeCity(name) {
  const url = `${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    throw new Error(`No location found for "${name}"`);
  }
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country_code || '' };
}

async function fetchForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: 5
  });
  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('Forecast request failed');
  return res.json();
}

function renderWeather(place, data) {
  const cur = data.current;
  const category = weatherCategory(cur.weather_code);

  placeEl.textContent = `${place.name}${place.country ? ', ' + place.country : ''}`;
  dialTemp.textContent = `${Math.round(cur.temperature_2m)}°C`;
  dialCondition.textContent = CATEGORY_LABEL[category];
  dialNeedle.setAttribute('transform', `rotate(${tempToAngle(cur.temperature_2m)} 120 130)`);

  statFeels.innerHTML = `${Math.round(cur.apparent_temperature)}<span>°C</span>`;
  statHumidity.innerHTML = `${Math.round(cur.relative_humidity_2m)}<span>%</span>`;
  statWind.innerHTML = `${Math.round(cur.wind_speed_10m)}<span> km/h</span>`;
  statPressure.innerHTML = `${Math.round(cur.surface_pressure)}<span> hPa</span>`;

  forecastStrip.innerHTML = '';
  const days = data.daily.time;
  days.forEach((dateStr, i) => {
    const dayCategory = weatherCategory(data.daily.weather_code[i]);
    const date = new Date(dateStr + 'T00:00:00');
    const label = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="forecast-day">${label}</div>
      <div class="forecast-icon">${weatherIconSVG(dayCategory)}</div>
      <div class="forecast-range">${Math.round(data.daily.temperature_2m_max[i])}°<span class="lo"> / ${Math.round(data.daily.temperature_2m_min[i])}°</span></div>
    `;
    forecastStrip.appendChild(card);
  });

  station.classList.add('show');
  emptyState.classList.add('hide');
}

async function loadCity(name) {
  setStatus(`Locating "${name}"…`);
  try {
    const place = await geocodeCity(name);
    setStatus(`Reading station at ${place.name}…`);
    const data = await fetchForecast(place.lat, place.lon);
    renderWeather(place, data);
    setStatus(`Last reading: ${new Date(data.current.time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })} (${data.timezone})`);
  } catch (err) {
    setStatus(err.message || 'Something went wrong fetching weather data.', true);
  }
}

async function loadByCoords(lat, lon, label) {
  setStatus('Reading station at your location…');
  try {
    const data = await fetchForecast(lat, lon);
    renderWeather({ name: label || 'Your location', country: '' }, data);
    setStatus(`Last reading: ${new Date(data.current.time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })} (${data.timezone})`);
  } catch (err) {
    setStatus(err.message || 'Something went wrong fetching weather data.', true);
  }
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = cityInput.value.trim();
  if (!name) return;
  loadCity(name);
});

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by this browser.', true);
    return;
  }
  setStatus('Requesting your location…');
  navigator.geolocation.getCurrentPosition(
    (pos) => loadByCoords(pos.coords.latitude, pos.coords.longitude),
    () => setStatus('Location request denied or unavailable.', true)
  );
});

// Load a default city on first visit
loadCity('London');
