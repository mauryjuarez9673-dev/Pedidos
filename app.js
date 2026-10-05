import { catalogToText, matchesProduct, orderToCsv, orderToTsv, parseCatalog } from "./catalog.js";
import { DEFAULT_PRODUCTS } from "./catalog-data.js";

const STORAGE = { catalog: "nutrisource.catalog.v2", order: "nutrisource.order.v2" };
const state = {
  products: readStorage(STORAGE.catalog, DEFAULT_PRODUCTS),
  order: readStorage(STORAGE.order, {}),
  search: "",
  category: "all",
};

const elements = {
  productGrid: document.querySelector("#productGrid"),
  productCount: document.querySelector("#productCount"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  emptyState: document.querySelector("#emptyState"),
  noResults: document.querySelector("#noResults"),
  orderItems: document.querySelector("#orderItems"),
  orderEmpty: document.querySelector("#orderEmpty"),
  selectionBadge: document.querySelector("#selectionBadge"),
  lineTotal: document.querySelector("#lineTotal"),
  unitTotal: document.querySelector("#unitTotal"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton"),
  clearOrderButton: document.querySelector("#clearOrderButton"),
  catalogDialog: document.querySelector("#catalogDialog"),
  catalogForm: document.querySelector("#catalogForm"),
  catalogText: document.querySelector("#catalogText"),
  parseMessage: document.querySelector("#parseMessage"),
  toast: document.querySelector("#toast"),
};

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function saveState() {
  localStorage.setItem(STORAGE.catalog, JSON.stringify(state.products));
  localStorage.setItem(STORAGE.order, JSON.stringify(state.order));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function productCard(product) {
  const quantity = state.order[product.code] || 0;
  return `
    <article class="product-row ${quantity ? "in-order" : ""}" data-code="${escapeHtml(product.code)}">
      <span class="product-code">${escapeHtml(product.code)}</span>
      <div class="product-info">
        <p class="product-name">${escapeHtml(product.description)}</p>
        <p class="product-meta">${[product.presentation, product.category].filter(Boolean).map(escapeHtml).join(" · ")}</p>
      </div>
      <div class="quantity-control" aria-label="Cantidad de ${escapeHtml(product.description)}">
        ${quantity ? `<button class="qty-button" data-action="decrement" type="button" aria-label="Restar uno">−</button>
          <input class="qty-number" data-action="quantity" type="number" min="0" max="9999" value="${quantity}" aria-label="Cantidad" />` : ""}
        <button class="qty-button plus" data-action="increment" type="button" aria-label="Agregar uno">+</button>
      </div>
    </article>`;
}

function renderCatalog() {
  const filtered = state.products.filter((product) => matchesProduct(product, state.search, state.category));
  elements.productCount.textContent = state.products.length;
  elements.emptyState.hidden = state.products.length > 0;
  elements.noResults.hidden = state.products.length === 0 || filtered.length > 0;
  elements.productGrid.innerHTML = filtered.map(productCard).join("");

  const currentCategory = state.category;
  const categories = [...new Set(state.products.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  elements.categoryFilter.innerHTML = `<option value="all">Todas las categorías</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  elements.categoryFilter.value = categories.includes(currentCategory) ? currentCategory : "all";
}

function orderItem(product) {
  const quantity = state.order[product.code];
  return `
    <div class="order-item" data-code="${escapeHtml(product.code)}">
      <div>
        <span class="code">${escapeHtml(product.code)}</span>
        <span class="order-item-name">${escapeHtml(product.description)}</span>
        ${product.presentation ? `<span class="order-item-meta">${escapeHtml(product.presentation)}</span>` : ""}
      </div>
      <div class="order-item-actions">
        <button class="qty-button" data-action="decrement" type="button" aria-label="Restar uno">−</button>
        <strong>${quantity}</strong>
        <button class="qty-button" data-action="increment" type="button" aria-label="Agregar uno">+</button>
        <button class="remove-button" data-action="remove" type="button" aria-label="Quitar producto">×</button>
      </div>
    </div>`;
}

function renderOrder() {
  const selected = state.products.filter((product) => (state.order[product.code] || 0) > 0);
  const units = selected.reduce((total, product) => total + state.order[product.code], 0);
  elements.orderItems.innerHTML = selected.map(orderItem).join("");
  elements.orderEmpty.hidden = selected.length > 0;
  elements.orderItems.hidden = selected.length === 0;
  elements.selectionBadge.textContent = selected.length;
  elements.lineTotal.textContent = selected.length;
  elements.unitTotal.textContent = units.toLocaleString("es-GT");
  [elements.copyButton, elements.downloadButton, elements.clearOrderButton].forEach((button) => { button.disabled = selected.length === 0; });
}

function render() {
  renderCatalog();
  renderOrder();
}

function updateQuantity(code, nextQuantity) {
  const quantity = Math.max(0, Math.min(9999, Number.parseInt(nextQuantity, 10) || 0));
  if (quantity) state.order[code] = quantity;
  else delete state.order[code];
  saveState();
  render();
}

function handleQuantityAction(event) {
  const button = event.target.closest("[data-action]");
  const container = event.target.closest("[data-code]");
  if (!button || !container) return;
  const code = container.dataset.code;
  const current = state.order[code] || 0;
  if (button.dataset.action === "increment") updateQuantity(code, current + 1);
  if (button.dataset.action === "decrement") updateQuantity(code, current - 1);
  if (button.dataset.action === "remove") updateQuantity(code, 0);
}

function openCatalog() {
  elements.catalogText.value = state.products.length ? catalogToText(state.products) : "";
  elements.parseMessage.textContent = state.products.length
    ? `${state.products.length} productos cargados. Puedes reemplazar o editar el listado.`
    : "Puedes pegar datos separados por tabulaciones, punto y coma o comas.";
  elements.parseMessage.classList.remove("error");
  elements.catalogDialog.showModal();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("visible"), 2300);
}

document.querySelector("#openCatalogButton").addEventListener("click", openCatalog);
document.querySelector("#emptyCatalogButton").addEventListener("click", openCatalog);

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderCatalog();
});

elements.categoryFilter.addEventListener("change", (event) => {
  state.category = event.target.value;
  renderCatalog();
});

elements.productGrid.addEventListener("click", handleQuantityAction);
elements.orderItems.addEventListener("click", handleQuantityAction);
elements.productGrid.addEventListener("change", (event) => {
  if (event.target.dataset.action === "quantity") updateQuantity(event.target.closest("[data-code]").dataset.code, event.target.value);
});

elements.catalogForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const products = parseCatalog(elements.catalogText.value);
  if (!products.length) {
    elements.parseMessage.textContent = "No pude leer productos. Cada fila debe tener al menos código y descripción.";
    elements.parseMessage.classList.add("error");
    return;
  }
  state.products = products;
  const validCodes = new Set(products.map((product) => product.code));
  state.order = Object.fromEntries(Object.entries(state.order).filter(([code]) => validCodes.has(code)));
  state.category = "all";
  saveState();
  render();
  elements.catalogDialog.close();
  showToast(`${products.length} productos guardados`);
});

elements.copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(orderToTsv(state.products, state.order));
    showToast("Pedido copiado. Pégalo directamente en Excel.");
  } catch {
    showToast("No se pudo copiar. Usa Descargar CSV.");
  }
});

elements.downloadButton.addEventListener("click", () => {
  const blob = new Blob(["\uFEFF", orderToCsv(state.products, state.order)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `pedido-nutrisource-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Archivo CSV descargado");
});

elements.clearOrderButton.addEventListener("click", () => {
  if (!window.confirm("¿Vaciar todos los productos del pedido?")) return;
  state.order = {};
  saveState();
  render();
  showToast("Pedido vaciado");
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.searchInput.focus();
  }
});

render();
