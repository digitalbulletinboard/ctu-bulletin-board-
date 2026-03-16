import { db } from "../firebase/firebaseConfig.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =======================
// DOM ELEMENTS
// =======================
const announcementsContainer = document.getElementById("announcements");
const eventsContainer = document.getElementById("events");
const academicCalendarContainer = document.getElementById("academicCalendar");

const annCountEl = document.getElementById("annCount");
const eventCountEl = document.getElementById("eventCount");
const calendarCountEl = document.getElementById("calendarCount");

const currentTimeEl = document.getElementById("currentTime");
const currentDateEl = document.getElementById("currentDate");
const dayOfWeekEl = document.getElementById("dayOfWeek");
const timeZoneEl = document.getElementById("timeZone");
const weatherEl = document.getElementById("weather");
const weatherLocationEl = document.getElementById("weatherLocation");

// =======================
// TIME & DATE
// =======================
function updateDateTime() {
  const now = new Date();

  if (currentTimeEl) {
    currentTimeEl.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  if (currentDateEl) {
    currentDateEl.textContent = now.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  if (dayOfWeekEl) {
    dayOfWeekEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
  }

  if (timeZoneEl) {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    timeZoneEl.textContent = timeZone.split('/').pop().replace(/_/g, ' ');
  }
}

setInterval(updateDateTime, 1000);
updateDateTime();

// =======================
// WEATHER
// =======================
function loadWeather() {
  const API_KEY = "f5168c305674a67a705409181a80046d";
  const LAT = 10.650;
  const LON = 124.350;

  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (!weatherEl) return;
      if (!data.main) {
        weatherEl.textContent = "Weather unavailable";
        return;
      }

      const temp = Math.round(data.main.temp);
      const desc = data.weather[0].description;

      weatherEl.innerHTML = `
        <div style="font-size: 16px; font-weight: 700;">${temp}°C</div>
        <div style="font-size: 10px; opacity: 0.8; text-transform: capitalize;">${desc}</div>
      `;
    })
    .catch(() => {
      if (weatherEl) weatherEl.textContent = "Unavailable";
    });
}

loadWeather();
setInterval(loadWeather, 30 * 60 * 1000);

// =======================
// RENDER FUNCTION WITH HIGH-RES IMAGE SUPPORT
// =======================
function renderItems(container, data, countEl) {
  if (!container) return;

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div class="loading-state">
        <p>No active content</p>
      </div>
    `;
    if (countEl) countEl.textContent = "0";
    return;
  }

  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "announcement-card";
    
    let html = '';
    
    // PRIORITY: Show image if exists
    if (item.imageUrl && item.imageUrl.trim() !== '') {
      html += `
        <div class="announcement-image-large">
          <img src="${item.imageUrl}" 
               alt="${item.title}" 
               loading="lazy" 
               onerror="console.error('Image failed to load:', this.src); this.parentElement.style.display='none';">
        </div>
      `;
    }
    
    // Content section
    html += `
      <div class="announcement-content">
        <h3 class="announcement-title">${item.title}</h3>
        <p class="announcement-text">${item.content}</p>
      </div>
    `;
    
    div.innerHTML = html;
    container.appendChild(div);
  });

  if (countEl) countEl.textContent = data.length;
  
  console.log(`✅ Rendered ${data.length} items with images`);
}

// =======================
// FIRESTORE LISTENERS
// =======================
function listenCollection(container, collectionName, countEl) {
  const q = query(collection(db, collectionName), orderBy("startDate", "asc"));

  onSnapshot(q, (snapshot) => {
    const now = new Date();

    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => {
        const start = item.startDate?.toDate();
        const end = item.endDate?.toDate();
        return start && end && end >= now;
      });

    console.log(`📊 ${collectionName}: ${data.length} active items`);
    
    // Log items with images
    data.forEach(item => {
      if (item.imageUrl) {
        console.log(`📸 ${item.title}: ${item.imageUrl}`);
      }
    });

    renderItems(container, data, countEl);
  }, (error) => {
    console.error(`Error listening to ${collectionName}:`, error);
  });
}

// =======================
// MINI CALENDAR
// =======================
function renderMiniCalendar() {
  const calendarMonth = document.getElementById('calendarMonth');
  const calendarDays = document.getElementById('calendarDays');
  
  if (!calendarMonth || !calendarDays) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  // Set month/year header
  calendarMonth.textContent = now.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Get first day of month and days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Clear existing days
  calendarDays.innerHTML = '';

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendarDays.appendChild(emptyDay);
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;
    
    if (day === today) {
      dayEl.classList.add('today');
    }
    
    calendarDays.appendChild(dayEl);
  }
}

// =======================
// INITIALIZE
// =======================
function initialize() {
  console.log('🚀 Initializing display page with image support...');
  
  // Listen to collections
  listenCollection(announcementsContainer, "announcements", annCountEl);
  listenCollection(eventsContainer, "events", eventCountEl);
  listenCollection(academicCalendarContainer, "academicCalendar", calendarCountEl);

  // Render mini calendar
  renderMiniCalendar();
  
  // Update calendar daily
  setInterval(renderMiniCalendar, 24 * 60 * 60 * 1000);
  
  console.log('✅ Display page loaded successfully');
}

// Run on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
