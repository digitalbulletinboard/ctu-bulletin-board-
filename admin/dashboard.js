import { db, auth } from "../firebase/firebaseConfig.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// =======================
// AUTH GUARD
// =======================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

// =======================
// STATE
// =======================
let editMode = false;
let editId = null;
let editCollection = null;

// =======================
// HELPERS
// =======================
function toTimestamp(value) {
  return Timestamp.fromDate(new Date(value));
}

function formatDate(ts) {
  if (!ts) return "";
  return ts.toDate().toLocaleString();
}

function showMessage(msg, type = "error") {
  const el = document.getElementById("formMsg");
  el.textContent = msg;
  el.className = `msg ${type}`;
  el.style.display = "block";

  if (type === "success") {
    setTimeout(() => el.style.display = "none", 3000);
  }
}

function resetForm() {
  editMode = false;
  editId = null;
  editCollection = null;

  document.getElementById("contentForm").reset();
  document.getElementById("cancelEditBtn").classList.add("hidden");
  document.getElementById("formTitle").innerText = "Create Content";

  // Unlock dropdown
  document.getElementById("type").disabled = false;
}

// =======================
// RENDER LIST
// =======================
function renderList(container, docs, collectionName) {
  if (!container) return;

  container.innerHTML = "";

  if (docs.length === 0) {
    container.innerHTML = `<p style="opacity:0.6">No ${collectionName} yet.</p>`;
    return;
  }

  docs.forEach((d) => {
    const item = d.data();
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.content}</p>
      <small>Start: ${formatDate(item.startDate)}</small><br>
      <small>End: ${formatDate(item.endDate)}</small>
      <div class="actions">
        <button class="editBtn">Edit</button>
        <button class="deleteBtn">Delete</button>
      </div>
    `;

    // =======================
    // EDIT
    // =======================
    div.querySelector(".editBtn").addEventListener("click", () => {
      editMode = true;
      editId = d.id;
      editCollection = collectionName;

      document.getElementById("type").value = collectionName;
      document.getElementById("type").disabled = true; // lock type during edit

      document.getElementById("title").value = item.title;
      document.getElementById("content").value = item.content;
      document.getElementById("startDate").value =
        item.startDate.toDate().toISOString().slice(0, 16);
      document.getElementById("endDate").value =
        item.endDate.toDate().toISOString().slice(0, 16);

      document.getElementById("cancelEditBtn").classList.remove("hidden");
      document.getElementById("formTitle").innerText = "Edit Content";

      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // =======================
    // DELETE
    // =======================
    div.querySelector(".deleteBtn").addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      await deleteDoc(doc(db, collectionName, d.id));
    });

    container.appendChild(div);
  });
}

// =======================
// INITIALIZE
// =======================
function initializeDashboard() {

  const openDisplayBtn = document.getElementById("openDisplayBtn");

  if (openDisplayBtn) {
    openDisplayBtn.addEventListener("click", () => {
      window.open("../display/", "_blank");
    });
  }
  // LOGOUT
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });

  // CANCEL EDIT
  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

  // =======================
  // FORM SUBMIT
  // =======================
  document.getElementById("contentForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const collectionName = document.getElementById("type").value;
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    const startDate = toTimestamp(document.getElementById("startDate").value);
    const endDate = toTimestamp(document.getElementById("endDate").value);

    if (!collectionName) {
      showMessage("Please select a content type.");
      return;
    }

    if (!title || !content) {
      showMessage("All fields required.");
      return;
    }

    if (endDate.toDate() <= startDate.toDate()) {
      showMessage("End date must be later than start date.");
      return;
    }

    const payload = {
      title,
      content,
      startDate,
      endDate,
      updatedAt: Timestamp.now()
    };

    try {
      if (editMode) {
        await updateDoc(doc(db, editCollection, editId), payload);
        showMessage("Updated successfully!", "success");
      } else {
        payload.createdAt = Timestamp.now();
        await addDoc(collection(db, collectionName), payload);
        showMessage("Created successfully!", "success");
      }

      resetForm();

    } catch (err) {
      showMessage(err.message);
    }
  });

  // =======================
  // REALTIME LISTENERS
  // =======================

  onSnapshot(
    query(collection(db, "announcements"), orderBy("startDate", "desc")),
    snap => renderList(document.getElementById("annList"), snap.docs, "announcements")
  );

  onSnapshot(
    query(collection(db, "events"), orderBy("startDate", "asc")),
    snap => renderList(document.getElementById("eventList"), snap.docs, "events")
  );

  onSnapshot(
    query(collection(db, "academic_calendar"), orderBy("startDate", "asc")),
    snap => renderList(document.getElementById("calendarList"), snap.docs, "academicCalendar")
  );
}

// =======================
// START
// =======================
document.addEventListener("DOMContentLoaded", initializeDashboard);
