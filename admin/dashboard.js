// Admin Dashboard Image Upload Handler
// ADD THIS TO YOUR EXISTING dashboard.js

const IMGBB_API_KEY = 'b99af5a6ee167476243614632f46f144';

// Image upload elements
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

let currentImageUrl = '';
let selectedImageFile = null;

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

// Show message (integrate with your existing message system)
function showMessage(message, type = 'info') {
  const formMsg = document.getElementById('formMsg');
  if (formMsg) {
    formMsg.textContent = message;
    formMsg.className = 'msg ' + type;
    formMsg.style.display = 'block';
    
    setTimeout(() => {
      formMsg.style.display = 'none';
    }, 3000);
  }
}

// MODIFY YOUR EXISTING SAVE FUNCTION TO INCLUDE IMAGE URL

// Example modification to your existing save function:
/*
async function saveContent() {
  const data = {
    title: document.getElementById('title').value,
    content: document.getElementById('content').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    imageUrl: currentImageUrl || '',  // ← ADD THIS LINE
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  
  // Rest of your save logic...
}
*/

// RESET FORM - ADD THIS TO YOUR RESET/CLEAR FORM FUNCTION

// Example modification to your existing reset function:
/*
function resetForm() {
  document.getElementById('contentForm').reset();
  clearImage();  // ← ADD THIS LINE
  currentImageUrl = '';
  // Rest of your reset logic...
}
*/

console.log('✅ Admin image upload ready!');
console.log('📸 ImgBB API key configured');
console.log('💡 Upload an image and it will automatically upload to ImgBB');
console.log('🔗 Image URL will be saved with the announcement/event');
