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
// ImgBB API Configuration
// =======================
const IMGBB_API_KEY = 'b99af5a6ee167476243614632f46f144';

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
let currentImageUrl = '';
let selectedImageFile = null;

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
  
  // Clear image upload
  clearImage();
  
  // Show all fields
  showAllFormFields();
}

// =======================
// FORM FIELD VISIBILITY
// =======================
function updateFormFields(contentType) {
  const contentGroup = document.getElementById('contentGroup');
  const datesGroup = document.getElementById('datesGroup');
  const endDateGroup = document.getElementById('endDateGroup');
  const imageLabel = document.getElementById('imageLabel');
  const contentField = document.getElementById('content');
  const startDateField = document.getElementById('startDate');
  const endDateField = document.getElementById('endDate');

  if (contentType === 'images') {
    // For Image Gallery: Only title and image required
    contentGroup.style.display = 'none';
    datesGroup.style.display = 'none';
    endDateGroup.style.display = 'none';
    imageLabel.innerHTML = '<span style="color: #ef4444;">Image (Required) *</span>';
    
    contentField.required = false;
    startDateField.required = false;
    endDateField.required = false;
  } else {
    // For other types: All fields visible
    contentGroup.style.display = 'block';
    datesGroup.style.display = 'block';
    endDateGroup.style.display = 'block';
    imageLabel.textContent = 'Image (Optional)';
    
    contentField.required = true;
    startDateField.required = true;
    endDateField.required = true;
  }
}

function showAllFormFields() {
  document.getElementById('contentGroup').style.display = 'block';
  document.getElementById('datesGroup').style.display = 'block';
  document.getElementById('endDateGroup').style.display = 'block';
  document.getElementById('imageLabel').textContent = 'Image (Optional)';
  document.getElementById('content').required = true;
  document.getElementById('startDate').required = true;
  document.getElementById('endDate').required = true;
}

// =======================
// IMAGE UPLOAD FUNCTIONS
// =======================
const imageUploadArea = document.getElementById('imageUploadArea');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const imageName = document.getElementById('imageName');
const imageSize = document.getElementById('imageSize');
const removeImageBtn = document.getElementById('removeImageBtn');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const imageUrlDisplay = document.getElementById('imageUrlDisplay');
const imageUrl = document.getElementById('imageUrl');
const copyUrlBtn = document.getElementById('copyUrlBtn');

// Initialize image upload
if (imageUploadArea && imageUpload) {
  
  // Click upload area to select file
  imageUploadArea.addEventListener('click', () => {
    imageUpload.click();
  });

  // File selected
  imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageSelect(file);
    }
  });

  // Drag and drop
  imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = 'rgba(59, 130, 246, 0.8)';
    imageUploadArea.style.background = 'rgba(59, 130, 246, 0.1)';
  });

  imageUploadArea.addEventListener('dragleave', () => {
    imageUploadArea.style.borderColor = '';
    imageUploadArea.style.background = '';
  });

  imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = '';
    imageUploadArea.style.background = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageSelect(file);
    }
  });

  // Remove image
  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearImage();
    });
  }

  // Copy URL
  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', () => {
      copyToClipboard(currentImageUrl);
      showMessage('URL copied to clipboard!', 'success');
    });
  }
}

// Handle image selection
function handleImageSelect(file) {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    showMessage('Please select an image file', 'error');
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    showMessage('Image is too large. Max 10MB', 'error');
    return;
  }

  selectedImageFile = file;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    imageName.textContent = file.name;
    imageSize.textContent = formatFileSize(file.size);
    
    imageUploadArea.classList.add('hidden');
    imagePreview.classList.remove('hidden');
    imageUrlDisplay.classList.add('hidden');
  };
  reader.readAsDataURL(file);

  // Auto-upload to ImgBB
  uploadImageToImgBB(file);
}

// Upload image to ImgBB
async function uploadImageToImgBB(file) {
  try {
    // Show progress
    imagePreview.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Uploading...';
    progressPercent.textContent = '0%';

    // Convert to base64
    const base64 = await fileToBase64(file);
    const base64Data = base64.split(',')[1];

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += 10;
        progressBar.style.width = progress + '%';
        progressPercent.textContent = progress + '%';
      }
    }, 200);

    // Create form data
    const formData = new FormData();
    formData.append('image', base64Data);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ""));

    // Upload to ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('Upload failed');
    }

    // Complete progress
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressText.textContent = 'Upload complete!';

    // Hide progress after a moment
    setTimeout(() => {
      uploadProgress.classList.add('hidden');
      imagePreview.classList.remove('hidden');
      imageUrlDisplay.classList.remove('hidden');
    }, 1000);

    // Store image URL
    currentImageUrl = data.data.url;
    imageUrl.value = currentImageUrl;

    console.log('✅ Image uploaded successfully!');
    console.log('📸 URL:', currentImageUrl);

    showMessage('Image uploaded successfully!', 'success');

  } catch (error) {
    console.error('Upload error:', error);
    
    uploadProgress.classList.add('hidden');
    imagePreview.classList.remove('hidden');
    
    showMessage('Failed to upload image. Please try again.', 'error');
  }
}

// Clear image
function clearImage() {
  selectedImageFile = null;
  currentImageUrl = '';
  
  imageUploadArea.classList.remove('hidden');
  imagePreview.classList.add('hidden');
  imageUrlDisplay.classList.add('hidden');
  uploadProgress.classList.add('hidden');
  
  imageUpload.value = '';
  previewImg.src = '';
  imageUrl.value = '';
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Copy to clipboard
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

// Fallback copy
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('Copy failed:', err);
  }
  document.body.removeChild(textarea);
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
    
    // Special rendering for images
    if (collectionName === 'images') {
      div.className = "image-item";
      div.innerHTML = `
        <div class="image-thumbnail">
          <img src="${item.imageUrl}" alt="${item.title}" loading="lazy">
        </div>
        <div class="image-info">
          <h4>${item.title}</h4>
          <div class="actions">
            <button class="editBtn">Edit</button>
            <button class="deleteBtn">Delete</button>
          </div>
        </div>
      `;
    } else {
      div.className = "item";
      div.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.content}</p>
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" style="max-width: 100%; margin-top: 8px; border-radius: 8px;">` : ''}
        <small>Start: ${formatDate(item.startDate)}</small><br>
        <small>End: ${formatDate(item.endDate)}</small>
        <div class="actions">
          <button class="editBtn">Edit</button>
          <button class="deleteBtn">Delete</button>
        </div>
      `;
    }

    // =======================
    // EDIT
    // =======================
    div.querySelector(".editBtn").addEventListener("click", () => {
      editMode = true;
      editId = d.id;
      editCollection = collectionName;

      document.getElementById("type").value = collectionName;
      document.getElementById("type").disabled = true;
      document.getElementById("title").value = item.title;
      
      // Update form fields based on type
      updateFormFields(collectionName);
      
      if (collectionName !== 'images') {
        document.getElementById("content").value = item.content;
        document.getElementById("startDate").value = item.startDate.toDate().toISOString().slice(0, 16);
        document.getElementById("endDate").value = item.endDate.toDate().toISOString().slice(0, 16);
      }

      // Load image if exists
      if (item.imageUrl) {
        currentImageUrl = item.imageUrl;
        imageUrl.value = item.imageUrl;
        imageUrlDisplay.classList.remove('hidden');
        imageUploadArea.classList.add('hidden');
      }

      document.getElementById("cancelEditBtn").classList.remove("hidden");
      document.getElementById("formTitle").innerText = "Edit Content";
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
  const typeSelect = document.getElementById("type");

  if (openDisplayBtn) {
    openDisplayBtn.addEventListener("click", () => {
      window.open("../display/", "_blank");
    });
  }
  
  // Content type change handler
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      updateFormFields(e.target.value);
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

    if (!collectionName) {
      showMessage("Please select a content type.");
      return;
    }

    if (!title) {
      showMessage("Title is required.");
      return;
    }

    // For Image Gallery: only title and image required
    if (collectionName === 'images') {
      if (!currentImageUrl) {
        showMessage("Please upload an image.");
        return;
      }

      const payload = {
        title,
        imageUrl: currentImageUrl,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      try {
        if (editMode) {
          await updateDoc(doc(db, editCollection, editId), {
            title: payload.title,
            imageUrl: payload.imageUrl,
            updatedAt: payload.updatedAt
          });
          showMessage("Updated successfully!", "success");
        } else {
          await addDoc(collection(db, collectionName), payload);
          showMessage("Image added to gallery!", "success");
        }

        resetForm();
      } catch (err) {
        console.error(err);
        showMessage("Error saving. Please try again.");
      }
      return;
    }

    // For other content types: all fields required
    const content = document.getElementById("content").value.trim();
    const startDate = toTimestamp(document.getElementById("startDate").value);
    const endDate = toTimestamp(document.getElementById("endDate").value);

    if (!content) {
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
      imageUrl: currentImageUrl || '',
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
      console.error(err);
      showMessage("Error saving. Please try again.");
    }
  });

  // =======================
  // LISTEN TO COLLECTIONS
  // =======================
  const annList = document.getElementById("annList");
  const eventList = document.getElementById("eventList");
  const calendarList = document.getElementById("calendarList");
  const imageList = document.getElementById("imageList");

  if (annList) {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      renderList(annList, docs, "announcements");
    });
  }

  if (eventList) {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      renderList(eventList, docs, "events");
    });
  }

  if (calendarList) {
    const q = query(collection(db, "academicCalendar"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      renderList(calendarList, docs, "academicCalendar");
    });
  }

  if (imageList) {
    const q = query(collection(db, "images"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs;
      renderList(imageList, docs, "images");
    });
  }
}

// Run on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeDashboard);
} else {
  initializeDashboard();
}

console.log('✅ Admin dashboard with Image Gallery ready!');
console.log('📸 ImgBB API configured');
console.log('🖼️ Image Gallery enabled');
