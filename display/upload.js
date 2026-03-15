// ImgBB Image Upload Integration for CTU Bulletin Board
console.log('ImgBB Upload module loading...');

// ⚠️ IMPORTANT: Replace with your ImgBB API key
// Get free API key at: https://api.imgbb.com/
const IMGBB_API_KEY = 'e28d03a98e325a693cfa0baa5bd7381a'; // ← PUT YOUR API KEY HERE

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadList = document.getElementById('uploadList');
const uploadStatus = document.getElementById('uploadStatus');
const uploadCount = document.getElementById('uploadCount');

let selectedFiles = [];
let uploadedImages = []; // Track uploaded images with URLs

// Initialize upload area
if (uploadArea && fileInput) {
  
  // Click to upload
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  // Drag and drop events
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
}

// Handle selected files
function handleFiles(files) {
  const fileArray = Array.from(files);
  
  fileArray.forEach(file => {
    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      showStatus(`${file.name} is not an image file`, 0, 'error');
      return;
    }
    
    // Validate file size (max 10MB for ImgBB free tier)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showStatus(`${file.name} is too large. Max 10MB`, 0, 'error');
      return;
    }
    
    // Check if file already added
    if (!selectedFiles.find(f => f.name === file.name)) {
      selectedFiles.push(file);
      addFileToList(file);
    }
  });
  
  updateCount();
}

// Add file to upload list
function addFileToList(file) {
  const item = document.createElement('div');
  item.className = 'upload-item';
  item.dataset.fileName = file.name;
  
  const icon = getImageIcon();
  const size = formatFileSize(file.size);
  
  item.innerHTML = `
    <div class="upload-item-icon">
      ${icon}
    </div>
    <div class="upload-item-info">
      <div class="upload-item-name">${file.name}</div>
      <div class="upload-item-size">${size}</div>
      <div class="upload-item-status">Ready to upload</div>
    </div>
    <button class="upload-item-action" data-file="${file.name}" title="Upload to ImgBB">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2L7 12M2 7L12 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  `;
  
  // Upload button click handler
  const actionBtn = item.querySelector('.upload-item-action');
  actionBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    // Check API key
    if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
      showStatus('Please add your ImgBB API key in upload.js', 0, 'error');
      alert('Setup Required:\n\n1. Get free API key at: https://api.imgbb.com\n2. Open upload.js\n3. Replace YOUR_IMGBB_API_KEY_HERE with your key');
      return;
    }
    
    await uploadToImgBB(file, item);
  });
  
  uploadList.appendChild(item);
}

// Upload image to ImgBB
async function uploadToImgBB(file, itemElement) {
  const actionBtn = itemElement.querySelector('.upload-item-action');
  const statusEl = itemElement.querySelector('.upload-item-status');
  
  try {
    // Disable button during upload
    actionBtn.disabled = true;
    actionBtn.innerHTML = `<div class="mini-spinner"></div>`;
    
    statusEl.textContent = 'Uploading...';
    statusEl.style.color = 'var(--accent)';
    
    // Convert image to base64
    const base64 = await fileToBase64(file);
    
    // Remove data:image/...;base64, prefix
    const base64Data = base64.split(',')[1];
    
    // Create form data
    const formData = new FormData();
    formData.append('image', base64Data);
    formData.append('name', file.name.replace(/\.[^/.]+$/, "")); // Remove extension
    
    // Upload to ImgBB
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Get image URL
      const imageUrl = data.data.url;
      const displayUrl = data.data.display_url;
      const deleteUrl = data.data.delete_url;
      
      console.log('✅ Image uploaded successfully!');
      console.log('📸 Image URL:', imageUrl);
      console.log('🔗 Display URL:', displayUrl);
      console.log('🗑️ Delete URL:', deleteUrl);
      
      // Save uploaded image info
      const imageInfo = {
        name: file.name,
        url: imageUrl,
        displayUrl: displayUrl,
        deleteUrl: deleteUrl,
        size: file.size,
        uploadedAt: new Date().toISOString()
      };
      
      uploadedImages.push(imageInfo);
      
      // Update UI to show success
      statusEl.innerHTML = `✓ Uploaded! <a href="${imageUrl}" target="_blank" style="color: var(--accent); text-decoration: underline;">View</a>`;
      statusEl.style.color = 'var(--success)';
      
      // Change button to copy URL
      actionBtn.disabled = false;
      actionBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <path d="M5 3V2C5 1.44772 5.44772 1 6 1H12C12.5523 1 13 1.44772 13 2V8C13 8.55228 12.5523 9 12 9H11" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;
      actionBtn.title = 'Copy image URL';
      actionBtn.style.background = 'rgba(16, 185, 129, 0.1)';
      actionBtn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      
      // Change action to copy URL
      actionBtn.onclick = (e) => {
        e.stopPropagation();
        copyToClipboard(imageUrl);
        showStatus(`URL copied! Paste it in your announcement`, 100, 'success');
        
        // Visual feedback
        actionBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M12 4L5.5 10.5L2 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
        setTimeout(() => {
          actionBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5 3V2C5 1.44772 5.44772 1 6 1H12C12.5523 1 13 1.44772 13 2V8C13 8.55228 12.5523 9 12 9H11" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          `;
        }, 1500);
      };
      
      showStatus(`${file.name} uploaded successfully!`, 100, 'success');
      
      // Show instructions
      console.log('\n📋 HOW TO USE THIS IMAGE:');
      console.log('1. Copy this URL:', imageUrl);
      console.log('2. Go to Admin Dashboard');
      console.log('3. Create/Edit announcement');
      console.log('4. Paste URL in imageUrl field');
      console.log('5. Save - Image will appear on bulletin board!\n');
      
    } else {
      throw new Error('Upload failed - Invalid response');
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    statusEl.textContent = 'Upload failed!';
    statusEl.style.color = '#ef4444';
    
    // Restore upload button
    actionBtn.disabled = false;
    actionBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2L7 12M2 7L12 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    
    showStatus(`Failed to upload ${file.name}. Check API key.`, 0, 'error');
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

// Copy text to clipboard
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('✅ URL copied to clipboard:', text);
    }).catch(err => {
      console.error('Copy failed:', err);
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

// Fallback copy method
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    console.log('✅ URL copied to clipboard (fallback)');
  } catch (err) {
    console.error('Copy failed:', err);
    alert('Please copy this URL manually:\n\n' + text);
  }
  document.body.removeChild(textarea);
}

// Remove file from selection
function removeFile(fileName) {
  selectedFiles = selectedFiles.filter(f => f.name !== fileName);
  updateCount();
}

// Update count badge
function updateCount() {
  if (uploadCount) {
    uploadCount.textContent = selectedFiles.length;
  }
}

// Get image icon
function getImageIcon() {
  return `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor"/>
      <path d="M14 11L11 8L7 12L5 10L2 13V14C2 15.1046 2.89543 16 4 16H14C15.1046 16 16 15.1046 16 14V11H14Z" fill="currentColor"/>
    </svg>
  `;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Show status message
function showStatus(message, progress = 0, type = 'info') {
  if (!uploadStatus) return;
  
  uploadStatus.classList.remove('hidden');
  const statusMsg = uploadStatus.querySelector('.status-message');
  statusMsg.textContent = message;
  
  // Set color based on type
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
  
  // Auto-hide after 5 seconds for success/error
  if (type === 'error' || type === 'success') {
    setTimeout(() => {
      hideStatus();
    }, 5000);
  }
}

// Hide status message
function hideStatus() {
  if (uploadStatus) {
    uploadStatus.classList.add('hidden');
  }
}

// Get all uploaded image URLs
function getUploadedURLs() {
  return uploadedImages.map(img => ({
    name: img.name,
    url: img.url,
    displayUrl: img.displayUrl
  }));
}

// Log uploaded images
function logUploadedImages() {
  if (uploadedImages.length === 0) {
    console.log('No images uploaded yet');
    return;
  }
  
  console.log('\n📸 UPLOADED IMAGES:');
  uploadedImages.forEach((img, index) => {
    console.log(`\n${index + 1}. ${img.name}`);
    console.log(`   URL: ${img.url}`);
    console.log(`   Size: ${formatFileSize(img.size)}`);
  });
  console.log('\n');
}

console.log('✅ ImgBB Upload module loaded!');
console.log('📸 Drag & drop images or click to browse');
console.log('🌐 Images will be uploaded to ImgBB (free unlimited hosting)');
console.log('📋 After upload, copy the URL to use in your announcements');

// Check API key on load
if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY_HERE') {
  console.warn('\n⚠️  SETUP REQUIRED:');
  console.warn('1. Get free API key: https://api.imgbb.com');
  console.warn('2. Open display/upload.js');
  console.warn('3. Replace YOUR_IMGBB_API_KEY_HERE with your key\n');
}

// Export functions
export { getUploadedURLs, logUploadedImages, uploadedImages };
