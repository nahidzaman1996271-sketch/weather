// Elements
const searchInput = document.getElementById('search-input');
const autocompleteList = document.getElementById('autocomplete-list');
const searchBtn = document.getElementById('search-btn');

const initialState = document.getElementById('initial-state');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const weatherCard = document.getElementById('weather-card');
const bgContainer = document.getElementById('background-container');

const els = {
    name: document.getElementById('location-name'),
    country: document.getElementById('location-country'),
    time: document.getElementById('local-time'),
    icon: document.getElementById('weather-icon-anim'),
    temp: document.getElementById('temperature'),
    desc: document.getElementById('weather-desc'),
    feelsLike: document.getElementById('feels-like'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('wind-speed'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset')
};

let clockInterval = null;

// WMO Weather Mapping
const weatherMap = {
    0: { desc: 'Clear sky', icon: 'fa-sun', type: 'sunny' },
    1: { desc: 'Mainly clear', icon: 'fa-cloud-sun', type: 'cloudy' },
    2: { desc: 'Partly cloudy', icon: 'fa-cloud-sun', type: 'cloudy' },
    3: { desc: 'Overcast', icon: 'fa-cloud', type: 'cloudy' },
    45: { desc: 'Fog', icon: 'fa-smog', type: 'cloudy' },
    48: { desc: 'Depositing rime fog', icon: 'fa-smog', type: 'cloudy' },
    51: { desc: 'Light drizzle', icon: 'fa-cloud-rain', type: 'rain' },
    53: { desc: 'Moderate drizzle', icon: 'fa-cloud-rain', type: 'rain' },
    55: { desc: 'Dense drizzle', icon: 'fa-cloud-rain', type: 'rain' },
    56: { desc: 'Light freezing drizzle', icon: 'fa-snowflake', type: 'rain' },
    57: { desc: 'Dense freezing drizzle', icon: 'fa-snowflake', type: 'rain' },
    61: { desc: 'Slight rain', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    63: { desc: 'Moderate rain', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    65: { desc: 'Heavy rain', icon: 'fa-cloud-showers-water', type: 'rain' },
    66: { desc: 'Light freezing rain', icon: 'fa-cloud-meatball', type: 'rain' },
    67: { desc: 'Heavy freezing rain', icon: 'fa-cloud-meatball', type: 'rain' },
    71: { desc: 'Slight snow fall', icon: 'fa-snowflake', type: 'rain' },
    73: { desc: 'Moderate snow fall', icon: 'fa-snowflake', type: 'rain' },
    75: { desc: 'Heavy snow fall', icon: 'fa-snowflake', type: 'rain' },
    77: { desc: 'Snow grains', icon: 'fa-snowflake', type: 'rain' },
    80: { desc: 'Slight rain showers', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    81: { desc: 'Moderate rain showers', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    82: { desc: 'Violent rain showers', icon: 'fa-cloud-showers-heavy', type: 'rain' },
    85: { desc: 'Slight snow showers', icon: 'fa-snowflake', type: 'rain' },
    86: { desc: 'Heavy snow showers', icon: 'fa-snowflake', type: 'rain' },
    95: { desc: 'Thunderstorm', icon: 'fa-bolt', type: 'rain' },
    96: { desc: 'Thunderstorm, slight hail', icon: 'fa-bolt', type: 'rain' },
    99: { desc: 'Thunderstorm, heavy hail', icon: 'fa-bolt', type: 'rain' }
};

// Debounce util
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Autocomplete logic
searchInput.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
        autocompleteList.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
            autocompleteList.innerHTML = '';
            data.results.forEach(city => {
                const li = document.createElement('li');
                const admin = city.admin1 ? `, ${city.admin1}` : '';
                li.innerHTML = `<i class="fas fa-location-dot" style="margin-right:8px; opacity:0.7"></i> ${city.name}${admin}, ${city.country}`;
                li.addEventListener('click', () => {
                    searchInput.value = city.name;
                    autocompleteList.classList.add('hidden');
                    fetchWeather(city);
                });
                autocompleteList.appendChild(li);
            });
            autocompleteList.classList.remove('hidden');
        } else {
            autocompleteList.classList.add('hidden');
        }
    } catch (err) {
        console.error('Autocomplete error:', err);
    }
}, 300));

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
        autocompleteList.classList.add('hidden');
    }
});

// Search Trigger
searchBtn.addEventListener('click', () => triggerSearch(searchInput.value));
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSearch(searchInput.value);
});

async function triggerSearch(query) {
    query = query.trim();
    if (!query) return;
    autocompleteList.classList.add('hidden');
    showState('loading');
    
    try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            fetchWeather(data.results[0]);
        } else {
            showState('error');
        }
    } catch (err) {
        showState('error');
    }
}

// Core Weather Fetch
async function fetchWeather(city) {
    showState('loading');
    const tz = city.timezone || 'auto';
    
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=${encodeURIComponent(tz)}`);
        const data = await res.json();
        updateUI(city, data);
        showState('weather');
    } catch (err) {
        console.error('Weather error:', err);
        showState('error');
    }
}

// UI Updates
function showState(state) {
    [initialState, loadingState, errorState, weatherCard].forEach(el => el.classList.add('hidden'));
    if (state === 'initial') initialState.classList.remove('hidden');
    if (state === 'loading') loadingState.classList.remove('hidden');
    if (state === 'error') errorState.classList.remove('hidden');
    if (state === 'weather') weatherCard.classList.remove('hidden');
}

function updateUI(city, weatherData) {
    const { current, daily } = weatherData;
    const isDay = current.is_day === 1;
    const code = current.weather_code;
    const info = weatherMap[code] || { desc: 'Unknown', icon: 'fa-cloud', type: 'cloudy' };

    els.name.textContent = city.name;
    els.country.textContent = `${city.admin1 ? city.admin1 + ', ' : ''}${city.country}`;
    els.temp.textContent = Math.round(current.temperature_2m);
    els.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
    els.humidity.textContent = `${current.relative_humidity_2m}%`;
    els.wind.textContent = `${current.wind_speed_10m} km/h`;
    els.desc.textContent = info.desc;

    // Time Formatting
    const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    els.sunrise.textContent = formatTime(daily.sunrise[0]);
    els.sunset.textContent = formatTime(daily.sunset[0]);

    // Icon logic
    let iconClass = info.icon;
    if (code === 0 && !isDay) iconClass = 'fa-moon';
    if ([1,2].includes(code) && !isDay) iconClass = 'fa-cloud-moon';
    els.icon.innerHTML = `<i class="fas ${iconClass}"></i>`;

    // Real-time Clock
    if (clockInterval) clearInterval(clockInterval);
    const updateClock = () => {
        try {
            const timeStr = new Intl.DateTimeFormat('en-US', {
                timeZone: city.timezone,
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }).format(new Date());
            els.time.textContent = timeStr;
        } catch(e) { els.time.textContent = '--:--'; }
    };
    updateClock();
    clockInterval = setInterval(updateClock, 1000);

    // Update Background
    updateBackground(info.type, isDay);
}

// Dynamic Background Magic
function updateBackground(type, isDay) {
    bgContainer.innerHTML = '';
    
    let bgClass = 'bg-default';
    if (type === 'sunny') bgClass = isDay ? 'bg-sunny' : 'bg-night';
    if (type === 'cloudy') bgClass = isDay ? 'bg-cloudy' : 'bg-cloudy-night';
    if (type === 'rain') bgClass = 'bg-rain';
    
    bgContainer.className = bgClass;
    
    // Create elements based on weather
    if (bgClass === 'bg-sunny') {
        createEl('sun');
    } else if (bgClass === 'bg-night' || bgClass === 'bg-cloudy-night') {
        if(bgClass === 'bg-night') createEl('moon');
        for(let i=0; i<60; i++) createStar();
    }

    if (type === 'cloudy' || type === 'rain') {
        const count = type === 'rain' ? 8 : 4;
        for(let i=0; i<count; i++) createCloud();
    }

    if (type === 'rain') {
        for(let i=0; i<120; i++) createDrop();
    }
}

function createEl(className) {
    const el = document.createElement('div');
    el.className = className;
    bgContainer.appendChild(el);
}

function createStar() {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 3;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + 'vw';
    star.style.top = Math.random() * 100 + 'vh';
    star.style.animationDelay = Math.random() * 2 + 's';
    star.style.animationDuration = 1 + Math.random() * 2 + 's';
    bgContainer.appendChild(star);
}

function createCloud() {
    const cloud = document.createElement('div');
    cloud.className = 'cloud';
    const size = 100 + Math.random() * 150;
    cloud.style.width = size + 'px';
    cloud.style.height = (size * 0.35) + 'px';
    
    // Cloud bumps
    cloud.innerHTML = `
        <div style="position:absolute; width:${size*0.5}px; height:${size*0.5}px; background:inherit; border-radius:50%; top:-${size*0.25}px; left:${size*0.1}px;"></div>
        <div style="position:absolute; width:${size*0.4}px; height:${size*0.4}px; background:inherit; border-radius:50%; top:-${size*0.15}px; right:${size*0.1}px;"></div>
    `;
    
    cloud.style.top = Math.random() * 40 + 'vh';
    cloud.style.opacity = 0.3 + Math.random() * 0.4;
    cloud.style.animationDuration = 20 + Math.random() * 40 + 's';
    cloud.style.animationDelay = '-' + (Math.random() * 30) + 's';
    bgContainer.appendChild(cloud);
}

function createDrop() {
    const drop = document.createElement('div');
    drop.className = 'drop';
    drop.style.left = Math.random() * 100 + 'vw';
    drop.style.animationDelay = Math.random() * 2 + 's';
    drop.style.animationDuration = 0.4 + Math.random() * 0.3 + 's';
    drop.style.opacity = 0.4 + Math.random() * 0.6;
    bgContainer.appendChild(drop);
}
