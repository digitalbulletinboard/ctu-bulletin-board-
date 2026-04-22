import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let slides = [];
let currentSlide = 0;
let data = [];
let timer = null;
let progressBarEl;

export function initSlideshow(db, weatherApiKey) {
  // Progress bar element
  progressBarEl = document.getElementById('progress-bar');

  // Firebase listener — re-renders slides whenever data changes
  const postsRef = ref(db, 'posts');
  onValue(postsRef, (snapshot) => {
    data = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => data.push({ id: child.key, ...child.val() }));
    }
    renderSlides();
  });

  updateInfoBar(weatherApiKey);
  setInterval(updateDateTime, 1000);
}

function renderSlides() {
  const container = document.getElementById('slideshow');
  // Keep the progress bar element, clear the rest
  container.innerHTML = '<div id="progress-bar" class="progress-bar"></div>';
  progressBarEl = document.getElementById('progress-bar');

  if (data.length === 0) {
    container.innerHTML += '<div style="color:#7f8c8d; font-size:2rem; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">No slides yet</div>';
    return;
  }

  data.forEach((item, index) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    if (index === 0) slide.classList.add('active');

    if (item.type === 'text') {
      slide.innerHTML = `
        <div class="slide-text">
          <div class="category">${item.category || 'NOTICE'}</div>
          <div class="title">${item.title || ''}</div>
          <div class="content">${item.content || ''}</div>
        </div>
      `;
    } else if (item.type === 'image') {
      slide.innerHTML = `<div class="slide-image"><img src="${item.url}" alt="${item.title}" loading="lazy"></div>`;
    } else if (item.type === 'video') {
      slide.innerHTML = `
        <video autoplay muted playsinline loop>
          <source src="${item.url}" type="video/mp4">
        </video>
      `;
    }

    container.appendChild(slide);
  });

  slides = document.querySelectorAll('.slide');
  currentSlide = 0;
  if (timer) clearTimeout(timer);
  showSlide();
}

function showSlide() {
  slides.forEach(s => s.classList.remove('active'));
  slides[currentSlide].classList.add('active');

  // Duration stored in seconds → convert to ms
  const durationSec = data[currentSlide]?.duration || 8;
  const durationMs = durationSec * 1000;

  // Animate progress bar
  if (progressBarEl) {
    progressBarEl.style.transition = 'none';
    progressBarEl.style.width = '0%';
    // Force reflow so the reset is visible before animating
    void progressBarEl.offsetWidth;
    progressBarEl.style.transition = `width ${durationMs}ms linear`;
    progressBarEl.style.width = '100%';
  }

  timer = setTimeout(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide();
  }, durationMs);
}

// ── Info Bar ────────────────────────────────────────────────────────────────

function updateInfoBar(weatherApiKey) {
  updateDateTime();
  updateWeather(weatherApiKey);
  updateCalendar();
}

function updateDateTime() {
  const now = new Date();
  const el = document.getElementById('date-time');
  if (el) {
    el.textContent =
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) +
      ' | ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

function updateWeather(apiKey) {
  if (!apiKey) return;
  // Using Cebu City as default — change the city name as needed
  fetch(`https://api.openweathermap.org/data/2.5/weather?q=Cebu+City&appid=${apiKey}&units=metric`)
    .then(r => r.json())
    .then(weatherData => {
      const iconEl = document.getElementById('weather-icon');
      const tempEl  = document.getElementById('weather-temp');
      const descEl  = document.getElementById('weather-desc');
      if (iconEl) iconEl.textContent = getWeatherIcon(weatherData.weather[0].main);
      if (tempEl) tempEl.textContent = Math.round(weatherData.main.temp) + '°C';
      if (descEl) descEl.textContent = weatherData.weather[0].description;
    })
    .catch(() => {
      // Silently ignore network / key errors so the page doesn't break
    });
}

function getWeatherIcon(condition) {
  const icons = {
    Clear: '☀️', Thunderstorm: '⛈️', Drizzle: '🌦️', Rain: '🌧️',
    Snow: '❄️', Clouds: '☁️', Mist: '🌫️', Haze: '🌫️', Fog: '🌫️'
  };
  return icons[condition] || '🌤️';
}

function updateCalendar() {
  const today = new Date();
  const calendar = document.getElementById('mini-calendar');
  if (!calendar) return;

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  calendar.innerHTML = days.map(d => `<div>${d}</div>`).join('');

  const startWeek = new Date(today);
  startWeek.setDate(today.getDate() - today.getDay());

  for (let i = 0; i < 7; i++) {
    const day = new Date(startWeek);
    day.setDate(startWeek.getDate() + i);
    const isToday = day.toDateString() === today.toDateString();
    calendar.innerHTML += `<div class="calendar-day ${isToday ? 'today' : ''}">${day.getDate()}</div>`;
  }
}
