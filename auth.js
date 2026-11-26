import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const form = document.getElementById("account-form");
const emailInput = document.getElementById("account-email");
const passwordInput = document.getElementById("account-password");
const status = document.getElementById("account-status");
const submitButton = document.getElementById("account-submit");
const modeButton = document.getElementById("account-mode");
const logoutButton = document.getElementById("account-logout");
const dashboard = document.getElementById("customer-dashboard");
const dashboardEmail = document.getElementById("dashboard-email");
const ordersMessage = document.getElementById("orders-message");
const ordersList = document.getElementById("orders-list");
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

function showOrder(orderId, order) {
  const card = document.createElement("article");
  card.className = "order-item";
  const heading = document.createElement("strong");
  heading.textContent = "Order #" + orderId;
  const details = document.createElement("span");
  details.textContent = order.productName || "Order details unavailable";
  const meta = document.createElement("small");
  const amount = Number(order.totalAmount);
  const amountText = Number.isFinite(amount) ? "₹" + amount.toFixed(2) : "Amount pending";
  const date = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString("en-IN") : "Date pending";
  meta.textContent = amountText + " · " + date + " · " + (order.status || "Pending");
  card.append(heading, details, meta);
  return card;
}

async function loadCustomerOrders(user) {
  ordersList.replaceChildren();
  ordersMessage.textContent = "Loading your orders...";
  try {
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
    const snapshot = await getDocs(ordersQuery);
    if (snapshot.empty) {
      ordersMessage.textContent = "No orders yet.";
      return;
    }
    const orders = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    ordersMessage.textContent = orders.length + (orders.length === 1 ? " order found." : " orders found.");
    orders.forEach((order) => ordersList.append(showOrder(order.id, order)));
  } catch (error) {
    console.error("Could not load customer orders:", error);
    ordersMessage.textContent = error.code === "permission-denied"
      ? "Order history is waiting for secure Firestore rules."
      : "Order database is not ready yet. Please try again after Firestore setup.";
  }
}

window.addEventListener("sammart-order-created", () => {
  if (auth.currentUser) loadCustomerOrders(auth.currentUser);
});

onAuthStateChanged(auth, (user) => {
  document.getElementById("account-signed-in").hidden = !user;
  form.hidden = !!user;
  dashboard.hidden = !user;
  if (user) {
    document.getElementById("account-user").textContent = user.email || "Signed in";
    dashboardEmail.textContent = user.email || "Email not available";
    status.textContent = "You are signed in.";
    loadCustomerOrders(user);
  } else {
    dashboardEmail.textContent = "";
    ordersList.replaceChildren();
    ordersMessage.textContent = "Sign in to view your orders.";
  }
});
