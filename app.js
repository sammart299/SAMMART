const grid=document.getElementById("product-grid");
const searchForm=document.getElementById("search-form");
const searchInput=document.getElementById("search-input");
const cartCount=document.getElementById("cart-count");
let cart=0;
document.getElementById("year").textContent=new Date().getFullYear();
function updateCart(){cartCount.textContent=String(cart)}
grid.addEventListener("click",event=>{if(event.target.matches(".add-button")){cart+=1;updateCart();event.target.textContent="Added";setTimeout(()=>{event.target.textContent="Add to cart"},900)}});
searchForm.addEventListener("submit",event=>{event.preventDefault();const term=searchInput.value.trim().toLowerCase();const cards=[...grid.querySelectorAll(".product-card")];let visible=0;cards.forEach(card=>{const match=card.textContent.toLowerCase().includes(term);card.hidden=!!term&&!match;if(match)visible+=1});document.getElementById("result-count").textContent=term?visible+" result(s)":"Sample products"});