let slides = [];
let currentSlide = 0;
let data = [];
let timer = null;
let progressBar;

export function initSlideshow(db) {
  // Progress bar
  progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';
  document.getElementById('slideshow').appendChild(progressBar);

  // Firebase listener
  const postsRef = ref(db, 'posts');
  onValue(postsRef, (snapshot) => {
    data = [];
    if (snapshot.exists()) {
      snapshot.forEach(child => data.push({ id: child.key, ...child.val() }));
    }
    renderSlides();
    updateInfoBar();
  });

  updateInfoBar(); // Initial load
}

function renderSlides() {
  const container = document.getElementById('slideshow');
  container.innerHTML = '<div id="progress-bar" class="progress-bar"></div>';

  if (data.length === 0) {
    container.innerHTML += '<div style="color:#7f8c8d;font-size:2rem;">No slides yet</div>';
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
          <div class="title">${item.title}</div>
          <div class="content">${item.content}</div>
        </div>
      `;
    } else if (item.type === 'image') {
      slide.innerHTML = <div class="slide-image"><img src="${item.url}" alt="${item.title}" loading="lazy"></div>;
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
  startSlideshow();
}

function startSlideshow() {
  if (timer) clearTimeout(timer);
  showSlide();
}

function showSlide() {
  slides.forEach((s, i) => s.classList.remove('active'));
  slides[currentSlide].classList.add('active');

  const duration = data[currentSlide]?.duration || 8000;
  
  // Progress bar
  progressBar.style.transition = width ${duration}ms linear;
  progressBar.style.width = '0%';
  setTimeout(() => progressBar.style.width = '100%', 10);

  timer = setTimeout(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide();
  }, duration);
}

// Info Bar Updates
function updateInfoBar() {
  updateDateTime();
  updateWeather();
  updateCalendar();
}

function updateDateTime() {
  const now = new Date();
  document.getElementById('date-time').textContent = 
    now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) + ' | ' + 
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function updateWeather() {
  // Replace with your city
  fetch(https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY&units=metric)
    .then(r => r.json())
    .then(data => {
      document.getElementById('weather-icon').textContent = getWeatherIcon(data.weather[0].main);
      document.getElementById('weather-temp').textContent = Math.round(data.main.temp) + '°C';
      document.getElementById('weather-desc').textContent = data.weather[0].description;
    });
}

function getWeatherIcon(condition) {
  const icons = {
    Clear: '☀️', Thunderstorm: '⛈️', Drizzle: '🌦️', Rain: '🌧️',
    Snow: '❄️', Clouds: '☁️', Mist: '🌫️'
  };
  return icons[condition] || '🌤️';
}

function updateCalendar() {
  const today = new Date();
  const calendar = document.getElementById('mini-calendar');
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  // Days header
  calendar.innerHTML = days.map(d => <div>${d}</div>).join('');
  
  // Current week
  const startWeek = new Date(today);
  startWeek.setDate(today.getDate() - today.getDay());
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startWeek);
    day.setDate(startWeek.getDate() + i);
    const isToday = day.toDateString() === today.toDateString();
    calendar.innerHTML += <div class="calendar-day ${isToday ? 'today' : ''}">${day.getDate()}</div>;
  }
}

setInterval(updateDateTime, 1000);
