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

console.log("Dashboard.js loading...");

// =======================
// AUTH GUARD
// =======================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log("No user authenticated, redirecting to login");
    window.location.href = "index.html";
  } else {
    console.log("User authenticated:", user.email);
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
function toTimestamp(datetimeLocalValue) {
  const date = new Date(datetimeLocalValue);
  return Timestamp.fromDate(date);
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function showMessage(message, type = 'error') {
  const formMsg = document.getElementById("formMsg");
  if (!formMsg) return;
  
  formMsg.textContent = message;
  formMsg.className = `msg ${type}`;
  formMsg.style.display = 'block';
  
  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      formMsg.style.display = 'none';
    }, 3000);
  }
}

function clearMessage() {
  const formMsg = document.getElementById("formMsg");
  if (!formMsg) return;
  
  formMsg.textContent = '';
  formMsg.style.display = 'none';
}

function resetForm() {
  editMode = false;
  editId = null;
  editCollection = null;

  const formTitle = document.getElementById("formTitle");
  const saveBtn = document.getElementById("saveBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const contentForm = document.getElementById("contentForm");

  if (formTitle) {
    formTitle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
        <path d="M10 5V15M5 10H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      Create Content
    `;
  }
  
  if (saveBtn) {
    saveBtn.innerHTML = `
      <span>Save</span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M12 6L6.5 11.5L4 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
  
  if (cancelEditBtn) {
    cancelEditBtn.classList.add("hidden");
  }

  if (contentForm) {
    contentForm.reset();
  }
  
  clearMessage();
}

// =======================
// LIST RENDER
// =======================
function renderList(container, docs, collectionName) {
  if (!container) {
    console.warn(`Container for ${collectionName} not found`);
    return;
  }
  
  if (docs.length === 0) {
    container.innerHTML = `
      <div style="
        padding: 40px 20px; 
        text-align: center; 
        opacity: 0.5;
        border: 2px dashed var(--border-color);
        border-radius: 12px;
      ">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="margin: 0 auto 12px; opacity: 0.3;">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M8 12H16M12 8V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p style="margin: 0; color: var(--text-muted);">No ${collectionName} yet.</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: var(--text-muted);">Create your first one above!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  docs.forEach((d) => {
    const item = d.data();
    const div = document.createElement("div");
    div.className = "item";

    const isActive = item.startDate.toDate() <= new Date() && item.endDate.toDate() >= new Date();
    const statusBadge = isActive 
      ? '<span style="display: inline-block; padding: 4px 8px; background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 8px;">Active</span>'
      : '';

    div.innerHTML = `
      <h3>${item.title}${statusBadge}</h3>
      <p>${item.content}</p>
      <small>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
          <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
          <path d="M6 3V6L8 8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        Start: ${formatDate(item.startDate)}
      </small>
      <small>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
          <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
          <path d="M6 3V6L8 8" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        End: ${formatDate(item.endDate)}
      </small>

      <div class="actions">
        <button class="ghost" data-action="edit" data-id="${d.id}" data-collection="${collectionName}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right: 4px;">
            <path d="M10 1L13 4L5 12H2V9L10 1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Edit
        </button>
        <button class="danger" data-action="delete" data-id="${d.id}" data-collection="${collectionName}" data-title="${item.title}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-right: 4px;">
            <path d="M2 4H12M5 4V2H9V4M5 7V10M9 7V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M3 4H11V12H3V4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Delete
        </button>
      </div>
    `;

    // Edit handler
    const editBtn = div.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        console.log("Edit clicked for:", d.id);
        
        editMode = true;
        editId = d.id;
        editCollection = collectionName;

        const formTitle = document.getElementById("formTitle");
        const saveBtn = document.getElementById("saveBtn");
        const cancelEditBtn = document.getElementById("cancelEditBtn");
        const typeEl = document.getElementById("type");
        const titleEl = document.getElementById("title");
        const contentEl = document.getElementById("content");
        const startEl = document.getElementById("startDate");
        const endEl = document.getElementById("endDate");

        if (formTitle) {
          formTitle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
              <path d="M13 3L17 7L7 17H3V13L13 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Edit Content
          `;
        }
        
        if (saveBtn) {
          saveBtn.innerHTML = `
            <span>Update</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 6L6.5 11.5L4 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
        }
        
        if (cancelEditBtn) {
          cancelEditBtn.classList.remove("hidden");
        }

        if (typeEl) typeEl.value = collectionName;
        if (titleEl) titleEl.value = item.title || "";
        if (contentEl) contentEl.value = item.content || "";

        if (startEl && item.startDate) {
          const startD = item.startDate.toDate();
          startEl.value = startD.toISOString().slice(0, 16);
        }
        
        if (endEl && item.endDate) {
          const endD = item.endDate.toDate();
          endEl.value = endD.toISOString().slice(0, 16);
        }

        showMessage("Editing mode active. Make changes and click Update.", "success");
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    // Delete handler
    const deleteBtn = div.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        const itemId = deleteBtn.getAttribute('data-id');
        const itemCollection = deleteBtn.getAttribute('data-collection');
        const itemTitle = deleteBtn.getAttribute('data-title');
        
        console.log("Delete clicked for:", itemId, "in", itemCollection);
        
        if (!confirm(`Delete "${itemTitle}"?\n\nThis action cannot be undone.`)) {
          console.log("Delete cancelled by user");
          return;
        }

        try {
          console.log("Deleting document...");
          await deleteDoc(doc(db, itemCollection, itemId));
          console.log("Delete successful!");
          showMessage("Content deleted successfully!", "success");
        } catch (err) {
          console.error("Delete error:", err);
          alert("Error deleting content: " + err.message);
        }
      });
    }

    container.appendChild(div);
  });
  
  console.log(`Rendered ${docs.length} items in ${collectionName}`);
}

// =======================
// INITIALIZATION
// =======================
function initializeDashboard() {
  console.log("🚀 Initializing dashboard...");
  
  // =======================
  // OPEN DISPLAY BUTTON
  // =======================
  const openDisplayBtn = document.getElementById("openDisplayBtn");
  if (openDisplayBtn) {
    console.log("✅ Open Display button found");
    openDisplayBtn.addEventListener("click", () => {
      console.log("🔵 Open Display clicked!");
      
      // Try to open the display page
      const displayUrl = window.location.href.replace('/admin/dashboard.html', '/display/');
      console.log("Opening URL:", displayUrl);
      
      const newWindow = window.open(displayUrl, '_blank');
      
      // Check if popup was blocked
      setTimeout(() => {
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          console.warn("Popup blocked!");
          alert('Pop-up blocked! Please allow pop-ups for this site.\n\nOr manually open: ' + displayUrl);
        } else {
          console.log("✅ Display opened successfully");
        }
      }, 100);
    });
  } else {
    console.error("❌ Open Display button not found!");
  }

  // =======================
  // LOGOUT BUTTON
  // =======================
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    console.log("✅ Logout button found");
    logoutBtn.addEventListener("click", async () => {
      console.log("🔴 Logout clicked!");
      
      if (confirm("Are you sure you want to logout?")) {
        try {
          console.log("Signing out...");
          await signOut(auth);
          console.log("✅ Signed out successfully");
          window.location.href = "index.html";
        } catch (error) {
          console.error("❌ Logout error:", error);
          alert("Error logging out: " + error.message);
        }
      } else {
        console.log("Logout cancelled");
      }
    });
  } else {
    console.error("❌ Logout button not found!");
  }

  // =======================
  // CANCEL EDIT BUTTON
  // =======================
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) {
    console.log("✅ Cancel Edit button found");
    cancelEditBtn.addEventListener("click", () => {
      console.log("Cancel edit clicked");
      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // =======================
  // CREATE / UPDATE FORM
  // =======================
  const contentForm = document.getElementById("contentForm");
  if (contentForm) {
    console.log("✅ Content form found");
    
    contentForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("📝 Form submitted");
      clearMessage();

      const typeEl = document.getElementById("type");
      const titleEl = document.getElementById("title");
      const contentEl = document.getElementById("content");
      const startEl = document.getElementById("startDate");
      const endEl = document.getElementById("endDate");
      const saveBtn = document.getElementById("saveBtn");

      const collectionName = typeEl.value;
      const title = titleEl.value.trim();
      const content = contentEl.value.trim();
      const startDateVal = startEl.value;
      const endDateVal = endEl.value;

      // Validation
      if (!title || !content || !startDateVal || !endDateVal) {
        showMessage("Please fill out all fields.", "error");
        return;
      }

      const startDate = toTimestamp(startDateVal);
      const endDate = toTimestamp(endDateVal);

      if (endDate.toDate() <= startDate.toDate()) {
        showMessage("End date must be later than start date.", "error");
        return;
      }

      // Build payload based on mode
      let payload;
      
      if (editMode) {
        console.log("Updating existing content...");
        payload = { 
          title, 
          content, 
          startDate, 
          endDate,
          updatedAt: Timestamp.now()
        };
      } else {
        console.log("Creating new content...");
        payload = { 
          title, 
          content, 
          startDate, 
          endDate,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
      }

      // Disable form during save
      saveBtn.disabled = true;
      const originalHTML = saveBtn.innerHTML;
      saveBtn.innerHTML = '<span>Saving...</span>';

      try {
        if (!editMode) {
          await addDoc(collection(db, collectionName), payload);
          console.log("✅ Content created successfully");
          showMessage("Content created successfully!", "success");
          contentForm.reset();
        } else {
          await updateDoc(doc(db, editCollection, editId), payload);
          console.log("✅ Content updated successfully");
          showMessage("Content updated successfully!", "success");
          setTimeout(resetForm, 1000);
        }
      } catch (err) {
        console.error("❌ Save error:", err);
        showMessage("Error: " + err.message, "error");
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHTML;
      }
    });
  } else {
    console.error("❌ Content form not found!");
  }

  // =======================
  // REALTIME LISTENERS
  // =======================
  const annList = document.getElementById("annList");
  const eventList = document.getElementById("eventList");

  if (annList) {
    console.log("✅ Setting up announcements listener");
    const annQ = query(collection(db, "announcements"), orderBy("startDate", "desc"));
    onSnapshot(annQ, (snap) => {
      console.log(`📢 Announcements updated: ${snap.size} items`);
      renderList(annList, snap.docs, "announcements");
    }, (error) => {
      console.error("❌ Announcements listener error:", error);
    });
  } else {
    console.error("❌ Announcements list not found!");
  }

  if (eventList) {
    console.log("✅ Setting up events listener");
    const eventQ = query(collection(db, "events"), orderBy("startDate", "asc"));
    onSnapshot(eventQ, (snap) => {
      console.log(`📅 Events updated: ${snap.size} items`);
      renderList(eventList, snap.docs, "events");
    }, (error) => {
      console.error("❌ Events listener error:", error);
    });
  } else {
    console.error("❌ Events list not found!");
  }

  // Reset form state
  resetForm();
  
  console.log("✅ Dashboard initialized successfully!");
}

// =======================
// START WHEN DOM IS READY
// =======================
if (document.readyState === 'loading') {
  console.log("⏳ Waiting for DOM to load...");
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  console.log("✅ DOM already loaded");
  initializeDashboard();
}

// Add load animation
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
  console.log("✅ Page fully loaded");
});
