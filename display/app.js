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
const weatherEl = document.getElementById("weather");

// =======================
// TIME & DATE
// =======================
function updateDateTime() {
  const now = new Date();

  if (currentTimeEl) {
    currentTimeEl.textContent = now.toLocaleTimeString();
  }

  if (currentDateEl) {
    currentDateEl.textContent = now.toLocaleDateString();
  }

  if (dayOfWeekEl) {
    dayOfWeekEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
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
        <div>
          <strong>${temp}°C</strong><br>
          <small>${desc}</small>
        </div>
      `;
    })
    .catch(() => {
      if (weatherEl) weatherEl.textContent = "Weather unavailable";
    });
}

loadWeather();
setInterval(loadWeather, 30 * 60 * 1000);

// =======================
// RENDER FUNCTION
// =======================
function renderItems(container, data, countEl) {
  if (!container) return;

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `<p style="opacity:.6">No active content</p>`;
    if (countEl) countEl.textContent = "0";
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

    renderItems(container, data, countEl);
  });
}
// =======================
// MINI CALENDAR
// =======================

const calendarMonthEl = document.getElementById("calendarMonth");
const calendarDaysEl = document.getElementById("calendarDays");

function generateMiniCalendar() {
  if (!calendarMonthEl || !calendarDaysEl) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  // Set month title
  calendarMonthEl.textContent = now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = "";

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day empty"></div>`;
  }

  // Month days
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today ? " today" : "";
    html += `<div class="calendar-day${isToday}">${day}</div>`;
  }

  calendarDaysEl.innerHTML = html;
}

generateMiniCalendar();

// =======================
// INIT
// =======================
console.log("Display Loaded");

listenCollection(announcementsContainer, "announcements", annCountEl);
listenCollection(eventsContainer, "events", eventCountEl);
listenCollection(academicCalendarContainer, "academicCalendar", calendarCountEl);
