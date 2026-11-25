import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const form = document.getElementById("account-form");
const emailInput = document.getElementById("account-email");
const passwordInput = document.getElementById("account-password");
const status = document.getElementById("account-status");
const submitButton = document.getElementById("account-submit");
const modeButton = document.getElementById("account-mode");
const logoutButton = document.getElementById("account-logout");
let createMode = false;

modeButton.addEventListener("click", () => {
  createMode = !createMode;
  submitButton.textContent = createMode ? "Create account" : "Sign in";
  modeButton.textContent = createMode ? "Already registered? Sign in" : "New customer? Create account";
  status.textContent = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (password.length < 6) {
    status.textContent = "Password must be at least 6 characters.";
    return;
  }
  submitButton.disabled = true;
  status.textContent = "Please wait...";
  try {
    if (createMode) {
      await createUserWithEmailAndPassword(auth, email, password);
      status.textContent = "Account created successfully.";
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      status.textContent = "Signed in successfully.";
    }
  } catch (error) {
    status.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
    status.textContent = "You have signed out.";
  } catch (error) {
    status.textContent = error.message;
  }
});

onAuthStateChanged(auth, (user) => {
  document.getElementById("account-signed-in").hidden = !user;
  form.hidden = !!user;
  if (user) {
    document.getElementById("account-user").textContent = user.email || "Signed in";
    status.textContent = "You are signed in.";
  }
});
