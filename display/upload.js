// ImgBB Image Upload with Gallery Display for CTU Bulletin Board
console.log('ImgBB Gallery module loading...');

// API Key configured
const IMGBB_API_KEY = '34daf6c73a7b54ebde6cd462794ae26b';

const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const imageGallery = document.getElementById('imageGallery');
const uploadStatus = document.getElementById('uploadStatus');
const galleryCount = document.getElementById('galleryCount');

let uploadedImages = []; // Store uploaded images

// Load saved images from localStorage
function loadSavedImages() {
  try {
    const saved = localStorage.getItem('ctu_gallery_images');
    if (saved) {
      uploadedImages = JSON.parse(saved);
      renderGallery();
      updateCount();
    }
  } catch (error) {
    console.error('Error loading saved images:', error);
  }
}

// Save images to localStorage
function saveImages() {
  try {
    localStorage.setItem('ctu_gallery_images', JSON.stringify(uploadedImages));
  } catch (error) {
    console.error('Error saving images:', error);
  }
}

// Initialize
if (uploadBtn && fileInput) {
  // Click upload button to select files
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
    fileInput.value = ''; // Reset input
  });
}

// Upload files
async function uploadFiles(files) {
  for (const file of files) {
    // Validate file
    if (!file.type.startsWith('image/')) {
      showStatus(`${file.name} is not an image`, 0, 'error');
      continue;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showStatus(`${file.name} is too large (max 10MB)`, 0, 'error');
      continue;
    }

    // Show uploading state
    showUploadingItem();

    try {
      // Upload to ImgBB
      const imageData = await uploadToImgBB(file);
      
      // Add to gallery
      uploadedImages.unshift(imageData); // Add to beginning
      saveImages();
      renderGallery();
      updateCount();

      showStatus(`${file.name} uploaded successfully!`, 100, 'success');
      console.log('✅ Image uploaded:', imageData.url);

    } catch (error) {
      console.error('Upload error:', error);
      showStatus(`Failed to upload ${file.name}`, 0, 'error');
    }

    // Remove uploading indicator
    removeUploadingItem();
  }
}

// Upload to ImgBB
async function uploadToImgBB(file) {
  // Convert to base64
  const base64 = await fileToBase64(file);
  const base64Data = base64.split(',')[1];

  // Create form data
  const formData = new FormData();
  formData.append('image', base64Data);
  formData.append('name', file.name.replace(/\.[^/.]+$/, ""));

  // Upload
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error('Upload failed');
  }

  // Return image data
  return {
    id: data.data.id,
    name: file.name,
    url: data.data.url,
    displayUrl: data.data.display_url,
    deleteUrl: data.data.delete_url,
    thumb: data.data.thumb.url,
    size: file.size,
    uploadedAt: new Date().toISOString()
  };
}

// Render gallery
function renderGallery() {
  if (!imageGallery) return;

  // Clear gallery
  imageGallery.innerHTML = '';

  if (uploadedImages.length === 0) {
    // Show empty state
    imageGallery.innerHTML = `
      <div class="gallery-empty">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M6 36L16.172 25.828C17.734 24.266 20.266 24.266 21.828 25.828L32 36M28 30L31.172 26.828C32.734 25.266 35.266 25.266 36.828 26.828L42 32M28 16H28.02M10 42H38C39.0609 42 40.0783 41.5786 40.8284 40.8284C41.5786 40.0783 42 39.0609 42 38V10C42 8.93913 41.5786 7.92172 40.8284 7.17157C40.0783 6.42143 39.0609 6 38 6H10C8.93913 6 7.92172 6.42143 7.17157 7.17157C6.42143 7.92172 6 8.93913 6 10V38C6 39.0609 6.42143 40.0783 7.17157 40.8284C7.92172 41.5786 8.93913 42 10 42Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>No images yet</p>
        <p class="empty-hint">Click + to upload</p>
      </div>
    `;
    return;
  }

  // Render images
  uploadedImages.forEach((image, index) => {
    const item = createGalleryItem(image, index);
    imageGallery.appendChild(item);
  });
}

// Create gallery item
function createGalleryItem(image, index) {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  
  item.innerHTML = `
    <img src="${image.thumb || image.url}" alt="${image.name}" loading="lazy">
    <div class="gallery-item-overlay">
      <div class="gallery-item-name">${image.name}</div>
      <div class="gallery-item-actions">
        <button class="gallery-action-btn copy-btn" data-index="${index}" title="Copy URL">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
            <path d="M5 3V2C5 1.44772 5.44772 1 6 1H12C12.5523 1 13 1.44772 13 2V8C13 8.55228 12.5523 9 12 9H11" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          Copy
        </button>
        <button class="gallery-action-btn view-btn" data-index="${index}" title="View full image">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <path d="M1 7C1 7 3 2 7 2C11 2 13 7 13 7C13 7 11 12 7 12C3 12 1 7 1 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="7" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          View
        </button>
        <button class="gallery-action-btn delete-btn" data-index="${index}" title="Delete image">
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Del
        </button>
      </div>
    </div>
  `;

  // Add event listeners
  item.querySelector('.copy-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    copyURL(index);
  });

  item.querySelector('.view-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    viewImage(index);
  });

  item.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteImage(index);
  });

  return item;
}

// Show uploading item
function showUploadingItem() {
  if (!imageGallery) return;

  // Remove empty state if exists
  const empty = imageGallery.querySelector('.gallery-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'gallery-uploading';
  item.id = 'uploading-indicator';
  item.innerHTML = '<div class="gallery-uploading-spinner"></div>';
  
  imageGallery.insertBefore(item, imageGallery.firstChild);
}

// Remove uploading item
function removeUploadingItem() {
  const item = document.getElementById('uploading-indicator');
  if (item) item.remove();
}

// Copy URL
function copyURL(index) {
  const image = uploadedImages[index];
  if (!image) return;

  copyToClipboard(image.url);
  showStatus('Image URL copied! Paste in announcement', 100, 'success');
  
  console.log('📋 URL copied:', image.url);
  console.log('📝 Paste this in your announcement imageUrl field');
}

// View image
function viewImage(index) {
  const image = uploadedImages[index];
  if (!image) return;

  window.open(image.url, '_blank');
}

// Delete image
function deleteImage(index) {
  const image = uploadedImages[index];
  if (!image) return;

  if (confirm(`Delete "${image.name}"?`)) {
    uploadedImages.splice(index, 1);
    saveImages();
    renderGallery();
    updateCount();
    showStatus('Image deleted', 100, 'success');
  }
}

// Update count
function updateCount() {
  if (galleryCount) {
    galleryCount.textContent = uploadedImages.length;
  }
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

// Copy to clipboard
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('✅ Copied to clipboard');
    }).catch(err => {
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
    console.log('✅ Copied (fallback)');
  } catch (err) {
    alert('Please copy this URL:\n\n' + text);
  }
  document.body.removeChild(textarea);
}

// Show status
function showStatus(message, progress = 0, type = 'info') {
  if (!uploadStatus) return;

  uploadStatus.classList.remove('hidden');
  const statusMsg = uploadStatus.querySelector('.status-message');
  statusMsg.textContent = message;

  if (type === 'error') {
    statusMsg.style.color = '#ef4444';
  } else if (type === 'success') {
    statusMsg.style.color = 'var(--success)';
  } else {
    statusMsg.style.color = 'var(--text-secondary)';
  }

  const progressBar = uploadStatus.querySelector('.progress-bar');
  if (progressBar) {
    progressBar.style.width = progress + '%';
  }

  if (type === 'error' || type === 'success') {
    setTimeout(() => {
      uploadStatus.classList.add('hidden');
    }, 3000);
  }
}

// Initialize on load
loadSavedImages();

console.log('✅ ImgBB Gallery loaded!');
console.log('📸 Click + button to upload images');
console.log('🖼️ Images will appear in the gallery');
console.log('📋 Click Copy to get image URLs for announcements');

// Export functions
export { uploadedImages, renderGallery };
