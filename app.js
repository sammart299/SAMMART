import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const grid = document.getElementById("product-grid");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const cartCount = document.getElementById("cart-count");
const cartButton = document.querySelector(".cart-button");
const checkoutPanel = document.getElementById("checkout-panel");
const cartItems = document.getElementById("cart-items");
const checkoutTotal = document.getElementById("checkout-total");
const checkoutForm = document.getElementById("checkout-form");
const checkoutStatus = document.getElementById("checkout-status");
const placeOrderButton = document.getElementById("place-order");
const cart = [];

document.getElementById("year").textContent = new Date().getFullYear();

function total() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = String(count);
  cartItems.replaceChildren();

  if (!cart.length) {
    const empty = document.createElement("p");
    empty.textContent = "Your cart is empty. Add the demo product to continue.";
    cartItems.append(empty);
  }

  cart.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "cart-row";
    const label = document.createElement("span");
    label.textContent = item.name + " × " + item.quantity;
    const price = document.createElement("strong");
    price.textContent = "₹" + (item.price * item.quantity).toFixed(2);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      cart.splice(index, 1);
      renderCart();
    });
    row.append(label, price, remove);
    cartItems.append(row);
  });

  checkoutTotal.textContent = "₹" + total().toFixed(2);
  placeOrderButton.disabled = !cart.length;
}

grid.addEventListener("click", event => {
  if (!event.target.matches(".add-button")) return;
  const card = event.target.closest(".product-card");
  const name = card.querySelector("h3")?.textContent.trim() || "Demo product";
  const existing = cart.find(item => item.name === name);
  if (existing) existing.quantity += 1;
  else cart.push({ name, price: 0, quantity: 1 });
  event.target.textContent = "Added";
  renderCart();
});

cartButton.addEventListener("click", () => {
  checkoutPanel.hidden = !checkoutPanel.hidden;
  if (!checkoutPanel.hidden) checkoutPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

onAuthStateChanged(auth, user => {
  checkoutStatus.textContent = user ? "" : "Please sign in before placing a demo order.";
});

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();
  const user = auth.currentUser;
  if (!user) {
    checkoutStatus.textContent = "Please sign in to place your order.";
    return;
  }
  if (!cart.length) {
    checkoutStatus.textContent = "Your cart is empty.";
    return;
  }

  const customerName = document.getElementById("checkout-name").value.trim();
  const phone = document.getElementById("checkout-phone").value.trim();
  const address = document.getElementById("checkout-address").value.trim();
  if (!customerName || !phone || address.length < 10) {
    checkoutStatus.textContent = "Please complete all delivery details.";
    return;
  }

  placeOrderButton.disabled = true;
  checkoutStatus.textContent = "Saving your demo order...";
  try {
    const productName = cart.map(item => item.name + " × " + item.quantity).join(", ");
    await addDoc(collection(db, "orders"), {
      userId: user.uid,
      productName,
      totalAmount: total(),
      status: "Pending",
      createdAt: serverTimestamp(),
      customerName,
      phone,
      address,
      itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    });
    cart.splice(0, cart.length);
    renderCart();
    checkoutForm.reset();
    checkoutStatus.textContent = "Demo order saved. Open My Orders to view it.";
    document.getElementById("customer-dashboard").scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new CustomEvent("sammart-order-created"));
  } catch (error) {
    console.error("Order creation failed:", error);
    checkoutStatus.textContent = error.code === "permission-denied"
      ? "Firestore rules need the secure order-create permission before orders can be saved."
      : "Could not save the order. Please check Firestore setup and try again.";
  } finally {
    placeOrderButton.disabled = !cart.length;
  }
});

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  const term = searchInput.value.trim().toLowerCase();
  const cards = [...grid.querySelectorAll(".product-card")];
  let visible = 0;
  cards.forEach(card => {
    const match = card.textContent.toLowerCase().includes(term);
    card.hidden = !!term && !match;
    if (match) visible += 1;
  });
  document.getElementById("result-count").textContent = term ? visible + " result(s)" : "Sample products";
});

renderCart();
