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
const imageGalleryContainer = document.getElementById("imageGallery");

const annCountEl = document.getElementById("annCount");
const eventCountEl = document.getElementById("eventCount");
const calendarCountEl = document.getElementById("calendarCount");
const imageCountEl = document.getElementById("imageCount");

const currentTimeEl = document.getElementById("currentTime");
const currentDateEl = document.getElementById("currentDate");
const dayOfWeekEl = document.getElementById("dayOfWeek");
const timeZoneEl = document.getElementById("timeZone");
const weatherEl = document.getElementById("weather");

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
// FULLSCREEN IMAGE VIEWER
// =======================
function openFullscreen(imageUrl, title) {
  // Create fullscreen overlay
  const overlay = document.createElement('div');
  overlay.id = 'fullscreen-overlay';
  overlay.innerHTML = `
    <div class="fullscreen-container">
      <button class="fullscreen-close" onclick="closeFullscreen()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <img src="${imageUrl}" alt="${title}">
      <div class="fullscreen-title">${title}</div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeFullscreen();
    }
  });
  
  // Close on ESC key
  document.addEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
  if (e.key === 'Escape') {
    closeFullscreen();
  }
}

window.closeFullscreen = function() {
  const overlay = document.getElementById('fullscreen-overlay');
  if (overlay) {
    overlay.remove();
    document.removeEventListener('keydown', handleEscKey);
  }
}

// =======================
// RENDER FUNCTIONS
// =======================
function renderItems(container, data, countEl, isImageGallery = false) {
  if (!container) return;

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div class="loading-state">
        <p>No ${isImageGallery ? 'images' : 'active content'} yet</p>
      </div>
    `;
    if (countEl) countEl.textContent = "0";
    return;
  }

  if (isImageGallery) {
    // Render image gallery with click handler
    data.forEach(item => {
      const div = document.createElement("div");
      div.className = "gallery-image-card";
      div.innerHTML = `
        <div class="gallery-image-wrapper">
          <img src="${item.imageUrl}" 
               alt="${item.title}" 
               loading="lazy" 
               onerror="this.parentElement.parentElement.style.display='none'">
        </div>
        <div class="gallery-image-title">${item.title}</div>
      `;
      
      // Add click event for fullscreen
      div.addEventListener('click', () => {
        openFullscreen(item.imageUrl, item.title);
      });
      
      container.appendChild(div);
    });
  } else {
    // Render regular content with images
    data.forEach(item => {
      const div = document.createElement("div");
      div.className = "announcement-card";
      
      let html = '';
      
      if (item.imageUrl && item.imageUrl.trim() !== '') {
        html += `
          <div class="announcement-image-large">
            <img src="${item.imageUrl}" 
                 alt="${item.title}" 
                 loading="lazy" 
                 onerror="this.parentElement.style.display='none'">
          </div>
        `;
      }
      
      html += `
        <div class="announcement-content">
          <h3 class="announcement-title">${item.title}</h3>
          <p class="announcement-text">${item.content}</p>
        </div>
      `;
      
      div.innerHTML = html;
      container.appendChild(div);
    });
  }

  if (countEl) countEl.textContent = data.length;
}

// =======================
// FIRESTORE LISTENERS
// =======================
function listenCollection(container, collectionName, countEl, isImageGallery = false) {
  const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter by date for ALL collections including Image Gallery
    const now = new Date();
    data = data.filter(item => {
      const start = item.startDate?.toDate();
      const end = item.endDate?.toDate();
      return start && end && end >= now;
    });

    console.log(`📊 ${collectionName}: ${data.length} items`);
    
    renderItems(container, data, countEl, isImageGallery);
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

  calendarMonth.textContent = now.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  calendarDays.innerHTML = '';

  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.className = 'calendar-day empty';
    calendarDays.appendChild(emptyDay);
  }

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
  console.log('🚀 Initializing display page...');
  
  listenCollection(announcementsContainer, "announcements", annCountEl);
  listenCollection(eventsContainer, "events", eventCountEl);
  listenCollection(academicCalendarContainer, "academicCalendar", calendarCountEl);
  listenCollection(imageGalleryContainer, "images", imageCountEl, true);

  renderMiniCalendar();
  setInterval(renderMiniCalendar, 24 * 60 * 60 * 1000);
  
  console.log('✅ Display page loaded with fullscreen image viewer');
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
