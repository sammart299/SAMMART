import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc
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
const adminDashboard = document.getElementById("admin-dashboard");
const adminOrdersMessage = document.getElementById("admin-orders-message");
const adminOrdersList = document.getElementById("admin-orders-list");
const accountUid = document.getElementById("account-uid");
const roleMessage = document.getElementById("account-role-message");
let createMode = false;
const allowedStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

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
    const orders = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    ordersMessage.textContent = orders.length + (orders.length === 1 ? " order found." : " orders found.");
    orders.forEach(order => ordersList.append(showOrder(order.id, order)));
  } catch (error) {
    console.error("Could not load customer orders:", error);
    ordersMessage.textContent = error.code === "permission-denied"
      ? "Order history is waiting for secure Firestore rules."
      : "Order database is not ready yet. Please try again after Firestore setup.";
  }
}

function makeAdminOrder(order) {
  const card = document.createElement("article");
  card.className = "admin-order-item";
  const heading = document.createElement("strong");
  heading.textContent = "Order #" + order.id;
  const details = document.createElement("span");
  details.textContent = (order.productName || "Order details unavailable") +
    " · ₹" + (Number(order.totalAmount) || 0).toFixed(2);
  const controls = document.createElement("div");
  controls.className = "admin-order-controls";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Order status");
  allowedStatuses.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = allowedStatuses.includes(order.status) ? order.status : "Pending";
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Save status";
  const feedback = document.createElement("small");
  save.addEventListener("click", async () => {
    save.disabled = true;
    feedback.textContent = "Saving...";
    try {
      await updateDoc(doc(db, "orders", order.id), { status: select.value });
      feedback.textContent = "Status updated.";
    } catch (error) {
      console.error("Status update failed:", error);
      feedback.textContent = error.code === "permission-denied"
        ? "Firestore admin update rules are not enabled yet."
        : "Could not update status. Please try again.";
    } finally {
      save.disabled = false;
    }
  });
  controls.append(select, save);
  card.append(heading, details, controls, feedback);
  return card;
}

async function loadAdminOrders() {
  adminOrdersList.replaceChildren();
  adminOrdersMessage.textContent = "Loading all orders...";
  try {
    const snapshot = await getDocs(collection(db, "orders"));
    if (snapshot.empty) {
      adminOrdersMessage.textContent = "No orders have been placed yet.";
      return;
    }
    const orders = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    adminOrdersMessage.textContent = orders.length + (orders.length === 1 ? " order." : " orders.");
    orders.forEach(order => adminOrdersList.append(makeAdminOrder(order)));
  } catch (error) {
    console.error("Admin orders unavailable:", error);
    adminOrdersMessage.textContent = error.code === "permission-denied"
      ? "Admin permission is not configured in Firestore Rules yet."
      : "Could not load orders. Please try again.";
  }
}

async function checkAccountRole(user) {
  adminDashboard.hidden = true;
  accountUid.textContent = user.uid;
  roleMessage.textContent = "Checking account role...";
  try {
    const roleSnapshot = await getDoc(doc(db, "users", user.uid));
    if (roleSnapshot.exists() && roleSnapshot.data().role === "admin") {
      roleMessage.textContent = "Admin access enabled.";
      adminDashboard.hidden = false;
      await loadAdminOrders();
    } else {
      roleMessage.textContent = "Customer account. Admin access has not been assigned.";
    }
  } catch (error) {
    console.error("Role check failed:", error);
    roleMessage.textContent = error.code === "permission-denied"
      ? "Role check is waiting for Firestore Rules setup."
      : "Could not check account role.";
  }
}

window.addEventListener("sammart-order-created", () => {
  if (auth.currentUser) loadCustomerOrders(auth.currentUser);
});

onAuthStateChanged(auth, async user => {
  document.getElementById("account-signed-in").hidden = !user;
  form.hidden = !!user;
  dashboard.hidden = !user;
  adminDashboard.hidden = true;
  if (user) {
    document.getElementById("account-user").textContent = user.email || "Signed in";
    dashboardEmail.textContent = user.email || "Email not available";
    status.textContent = "You are signed in.";
    await Promise.all([loadCustomerOrders(user), checkAccountRole(user)]);
  } else {
    dashboardEmail.textContent = "";
    accountUid.textContent = "";
    roleMessage.textContent = "";
    ordersList.replaceChildren();
    ordersMessage.textContent = "Sign in to view your orders.";
  }
});
