import { db } from "../firebase/firebaseConfig.js";
import {
  collection,
  query,
  where,
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

// =======================
// RENDER FUNCTION
// =======================
function renderItems(container, data, countEl) {
  if (!container) return;

  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = `
      <div style="padding:40px 20px;text-align:center;opacity:.5;">
        <p>No active content</p>
      </div>
    `;
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
// LISTEN ANNOUNCEMENTS
// =======================
function listenAnnouncements() {
  if (!announcementsContainer) return;

  const now = new Date();

  const q = query(
    collection(db, "announcements"),
    orderBy("startDate", "desc")
  );

  onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => {
        const start = item.startDate?.toDate();
        const end = item.endDate?.toDate();
        return start && end && start <= now && end >= now;
      });

    renderItems(announcementsContainer, data, annCountEl);
  });
}

// =======================
// LISTEN EVENTS
// =======================
function listenEvents() {
  if (!eventsContainer) return;

  const now = new Date();

  const q = query(
    collection(db, "events"),
    orderBy("startDate", "asc")
  );

  onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => {
        const start = item.startDate?.toDate();
        const end = item.endDate?.toDate();
        return start && end && start <= now && end >= now;
      });

    renderItems(eventsContainer, data, eventCountEl);
  });
}

// =======================
// LISTEN ACADEMIC CALENDAR
// =======================
function listenAcademicCalendar() {
  if (!academicCalendarContainer) return;

  const now = new Date();

  const q = query(
    collection(db, "academicCalendar"),
    orderBy("startDate", "asc")
  );

  onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => {
        const start = item.startDate?.toDate();
        const end = item.endDate?.toDate();
        return start && end && end >= now;
      });

    renderItems(academicCalendarContainer, data, calendarCountEl);
  });
}

// =======================
// INIT DISPLAY
// =======================
console.log("CTU Digital Bulletin Board Display Loaded");

listenAnnouncements();
listenEvents();
listenAcademicCalendar();
