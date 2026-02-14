import { auth } from "../firebase/firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = form.querySelector('button[type="submit"]');

// Update current time in status bar
function updateTime() {
  const timeElement = document.getElementById('currentTime');
  if (timeElement) {
    const now = new Date();
    const options = { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    };
    timeElement.textContent = now.toLocaleTimeString('en-US', options);
  }
}

// Update time every second
setInterval(updateTime, 1000);
updateTime();

// Check auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});

// Show message helper
function showMessage(message, type = 'error') {
  msg.textContent = message;
  msg.className = `msg ${type}`;
  msg.style.display = 'block';
}

// Clear message
function clearMessage() {
  msg.textContent = '';
  msg.style.display = 'none';
}

// Handle form submission
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validation
  if (!email || !password) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  // Disable button and show loading state
  submitBtn.disabled = true;
  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span>Signing in...</span>';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMessage("Login successful! Redirecting...", "success");
    
    // Redirect after short delay
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);
    
  } catch (err) {
    console.error("Login error:", err);
    
    // User-friendly error messages
    let errorMessage = "Login failed. Please try again.";
    
    switch (err.code) {
      case 'auth/invalid-email':
        errorMessage = "Invalid email address";
        break;
      case 'auth/user-disabled':
        errorMessage = "This account has been disabled";
        break;
      case 'auth/user-not-found':
        errorMessage = "No account found with this email";
        break;
      case 'auth/wrong-password':
        errorMessage = "Incorrect password";
        break;
      case 'auth/too-many-requests':
        errorMessage = "Too many failed attempts. Please try again later";
        break;
      case 'auth/network-request-failed':
        errorMessage = "Network error. Please check your connection";
        break;
      case 'auth/invalid-credential':
        errorMessage = "Invalid credentials. Please check your email and password";
        break;
    }
    
    showMessage(errorMessage, "error");
    
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHTML;
  }
});

// Add input listeners to clear errors
emailInput.addEventListener('input', clearMessage);
passwordInput.addEventListener('input', clearMessage);

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ESC to clear form
  if (e.key === 'Escape') {
    emailInput.value = '';
    passwordInput.value = '';
    clearMessage();
  }
});

// Add animations on load
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});
