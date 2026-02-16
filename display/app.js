import { db } from "../firebase/firebaseConfig.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =======================
// DOM ELEMENTS
// =======================
const announcementsContainer = document.getElementById("announcements");
const eventsContainer = document.getElementById("events");
const academicCalendarContainer = document.getElementById("academicCalendar");

// Header counts
const annCountEl = document.getElementById("annCount");
const eventCountEl = document.getElementById("eventCount");
const calendarCountEl = document.getElementById("calendarCount");

// Sidebar widgets
const currentTimeEl = document.getElementById("currentTime");
const timeZoneEl = document.getElementById("timeZone");
const currentDateEl = document.getElementById("currentDate");
const dayOfWeekEl = document.getElementById("dayOfWeek");
const weatherEl = document.getElementById("weather");
const calendarMonthEl = document.getElementById("calendarMonth");
const calendarDaysEl = document.getElementById("calendarDays");

// =======================
// TIME & DATE FUNCTIONS
// =======================
function updateDateTime() {
  const now = new Date();
  
  // Update time
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  if (currentTimeEl) {
    currentTimeEl.textContent = now.toLocaleTimeString('en-US', timeOptions);
  }
  
  // Update timezone
  if (timeZoneEl) {
    const timeZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
    timeZoneEl.textContent = timeZoneName.replace('_', ' ');
  }
  
  // Update date
  const dateOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  };
  if (currentDateEl) {
    currentDateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
  }
  
  // Update day of week
  const dayOptions = { weekday: 'long' };
  if (dayOfWeekEl) {
    dayOfWeekEl.textContent = now.toLocaleDateString('en-US', dayOptions);
  }
}

// Update every second
setInterval(updateDateTime, 1000);
updateDateTime();

// =======================
// MINI CALENDAR FUNCTIONS
// =======================
function generateCalendar() {
  if (!calendarMonthEl || !calendarDaysEl) return;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  
  // Update month header
  const monthOptions = { month: 'long', year: 'numeric' };
  calendarMonthEl.textContent = now.toLocaleDateString('en-US', monthOptions);
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  let html = '';
  
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    html += `<div class="calendar-day other-month">${day}</div>`;
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today;
    const todayClass = isToday ? ' today' : '';
    html += `<div class="calendar-day${todayClass}">${day}</div>`;
  }
  
  // Next month days to fill the grid
  const totalCells = firstDay + daysInMonth;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  
  for (let day = 1; day <= remainingCells; day++) {
    html += `<div class="calendar-day other-month">${day}</div>`;
  }
  
  calendarDaysEl.innerHTML = html;
}

// Generate calendar on load and update at midnight
generateCalendar();
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
    generateCalendar();
  }
}, 1000);

// =======================
// WEATHER
// =======================
function loadWeather() {
  if (!weatherEl) return;
  
  const API_KEY = "f5168c305674a67a705409181a80046d";
  const LAT = 10.650; // Camotes, Cebu
  const LON = 124.350;

  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      if (data.cod && Number(data.cod) !== 200) {
        console.error("OpenWeatherMap error:", data);
        weatherEl.textContent = "Weather unavailable";
        return;
      }

      const temp = Math.round(data.main.temp);
      const desc = data.weather?.[0]?.description || "Unknown";
      const feelsLike = Math.round(data.main.feels_like);

      // Capitalize description
      const prettyDesc = desc
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      weatherEl.innerHTML = `
        <div style="line-height: 1.4;">
          <div style="font-size: 24px; font-weight: 700;">${temp}°C</div>
          <div style="font-size: 12px; margin-top: 4px;">${prettyDesc}</div>
          <div style="font-size: 11px; opacity: 0.7;">Feels like ${feelsLike}°C</div>
        </div>
      `;
    })
    .catch(err => {
      console.error("Weather fetch failed:", err);
      weatherEl.textContent = "Weather unavailable";
    });
}

// Fetch weather on load and every 30 minutes
loadWeather();
setInterval(loadWeather, 30 * 60 * 1000);

// =======================
// RENDER FUNCTIONS
// =======================
function renderItems(container, data, countEl) {
  if (!container) return;
  
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div style="
        padding: 40px 20px; 
        text-align: center; 
        opacity: 0.5;
        border: 2px dashed var(--border-color);
        border-radius: 12px;
      ">
        <p style="margin: 0; color: var(--text-muted);">No active content</p>
      </div>
    `;
    if (countEl) countEl.textContent = '0';
    return;
  }

  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "announcement";
    div.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.content}</p>
    `;
    container.appendChild(div);
  });
  
  if (countEl) countEl.textContent = data.length;
}

// =======================
// ACADEMIC CALENDAR
// =======================
function renderCalendarItems(container, data) {
  if (!container) return;
  
  container.innerHTML = "";
  
  if (data.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; opacity: 0.5;">
        <p>No upcoming calendar events</p>
      </div>
    `;
    if (calendarCountEl) calendarCountEl.textContent = '0';
    return;
  }

  data.forEach(item => {
    const div = document.createElement("div");
    div.className = "announcement calendar-item";
    
    const eventDate = item.eventDate.toDate();
    const dateStr = eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const categoryBadge = `<span style="
      display: inline-block;
      padding: 4px 8px;
      background: rgba(59, 130, 246, 0.2);
      border-radius: 6px;
      font-size: 11px;
      margin-left: 8px;
      text-transform: uppercase;
    ">${item.category}</span>`;
    
    div.innerHTML = `
      <h3>${item.title} ${categoryBadge}</h3>
      <p style="font-size: 12px; opacity: 0.7; margin: 4px 0;">📅 ${dateStr}</p>
      <p>${item.description || ''}</p>
    `;
    container.appendChild(div);
  });
  
  if (calendarCountEl) calendarCountEl.textContent = data.length;
}

function listenAcademicCalendar() {
  if (!academicCalendarContainer) return;
  
  const now = new Date();
  const oneMonthAhead = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

  const q = query(
    collection(db, "academicCalendar"),
    where("eventDate", ">=", Timestamp.fromDate(now)),
    where("eventDate", "<=", Timestamp.fromDate(oneMonthAhead)),
    orderBy("eventDate", "asc")
  );

  onSnapshot(q, (snapshot) => {
    const calendarData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    renderCalendarItems(academicCalendarContainer, calendarData);
  }, (err) => {
    console.error("Academic calendar snapshot error:", err);
  });
}

// =======================
// FIRESTORE LISTENERS
// =======================
function listenAnnouncements() {
  if (!announcementsContainer) return;
  
  const now = new Date();

  const q = query(
    collection(db, "announcements"),
    where("startDate", "<=", now),
    orderBy("startDate", "desc")
  );

  onSnapshot(
    q,
    (snapshot) => {
      const now2 = new Date();

      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => {
          const end = item.endDate?.toDate ? item.endDate.toDate() : item.endDate;
          return end && end >= now2;
        });

      renderItems(announcementsContainer, data, annCountEl);
    },
    (err) => {
      console.error("Announcements snapshot error:", err);
      announcementsContainer.innerHTML = "<p style='opacity:.6; color: var(--warning);'>Error loading announcements</p>";
    }
  );
}

function listenEvents() {
  if (!eventsContainer) return;
  
  const now = new Date();

  const q = query(
    collection(db, "events"),
    where("startDate", "<=", now),
    orderBy("startDate", "asc")
  );

  onSnapshot(
    q,
    (snapshot) => {
      const now2 = new Date();

      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => {
          const end = item.endDate?.toDate ? item.endDate.toDate() : item.endDate;
          return end && end >= now2;
        });

      renderItems(eventsContainer, data, eventCountEl);
    },
    (err) => {
      console.error("Events snapshot error:", err);
      eventsContainer.innerHTML = "<p style='opacity:.6; color: var(--warning);'>Error loading events</p>";
    }
  );
}

// =======================
// AUTO-REFRESH
// =======================
setInterval(() => {
  console.log('Auto-refreshing display...');
  location.reload();
}, 1000 * 60 * 30); // every 30 minutes

// =======================
// ANIMATIONS
// =======================
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});

// Add smooth transitions for new items
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.classList && node.classList.contains('announcement')) {
        node.style.animation = 'slideIn 0.4s ease';
      }
    });
  });
});

if (announcementsContainer) {
  observer.observe(announcementsContainer, { childList: true });
}

if (eventsContainer) {
  observer.observe(eventsContainer, { childList: true });
}

// =======================
// INIT DISPLAY APP
// =======================
console.log('CTU Digital Bulletin Board - Three Column Display loaded');
listenAnnouncements();
listenEvents();
listenAcademicCalendar();
