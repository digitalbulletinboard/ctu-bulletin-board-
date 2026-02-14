// Firebase Configuration
// Replace with your actual Firebase project credentials

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: Replace these values with your actual Firebase project configuration
// Get these from Firebase Console: Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyDDJ-lUEz-Artqf6jqq9W6Is3zbNO9LjZk",
  authDomain: "ctu-bulletin-board.firebaseapp.com",
  projectId: "ctu-bulletin-board",
  storageBucket: "ctu-bulletin-board.firebasestorage.app",
  messagingSenderId: "836023283717",
  appId: "1:836023283717:web:0af03ec5d5a5b01905ec6c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("Firebase initialized successfully");
