// SAMMART Firebase web configuration
// Firebase web API keys identify the project; never place service-account keys here.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA61Bo7wXIU77R639GRHDBV6MwHLExtSKc",
  authDomain: "sammart-8eafd.firebaseapp.com",
  projectId: "sammart-8eafd",
  storageBucket: "sammart-8eafd.firebasestorage.app",
  messagingSenderId: "887927532446",
  appId: "1:887927532446:web:92c66a2d0c95ae27f6448f",
  measurementId: "G-M3RG7JWLD2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
