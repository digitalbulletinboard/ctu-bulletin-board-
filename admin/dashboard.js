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
    container.innerHTML = `<p style="opacity:0.6">No ${collectio
