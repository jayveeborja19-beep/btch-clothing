const SHOPIFY_DOMAIN = "btch-clothing.myshopify.com";
const STOREFRONT_ACCESS_TOKEN = "d8463ddfb6962692451d57928255c2ee";
const API_VERSION = "2026-07";

const STOREFRONT_API_URL =
  `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

let products = [];
let cart = [];

/* =========================
   SHOPIFY API
========================= */

async function shopifyFetch(query, variables = {}) {
  const response = await fetch(STOREFRONT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(`Shopify HTTP error: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors && result.errors.length) {
    throw new Error(
      result.errors.map(error => error.message).join("\n")
    );
  }

  return result.data;
}

/* =========================
   LOAD PRODUCTS
========================= */

async function loadShopifyProducts() {
  const query = `
    query {
      products(first: 50) {
        nodes {
          id
          title
          handle
          description
          featuredImage {
            url
            altText
          }
          images(first: 10) {
            nodes {
              url
              altText
            }
          }
          variants(first: 50) {
            nodes {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await shopifyFetch(query);

    products = data.products.nodes || [];

    renderProducts(products);
  } catch (error) {
    console.error("Could not load Shopify products:", error);
  }
}

/* =========================
   RENDER PRODUCTS
========================= */

function renderProducts(items) {
  const grid =
    document.querySelector(".products-grid") ||
    document.querySelector("#products-grid") ||
    document.querySelector(".product-grid");

  if (!grid) {
    console.warn("Product grid not found.");
    return;
  }

  grid.innerHTML = "";

  items.forEach(product => {
    const variant =
      product.variants &&
      product.variants.nodes &&
      product.variants.nodes[0];

    if (!variant) return;

    const image =
      product.featuredImage?.url ||
      variant.image?.url ||
      product.images?.nodes?.[0]?.url ||
      "";

    const price = Number(variant.price.amount).toLocaleString(
      "en-PH",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-image">
        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(product.title)}"
        >
      </div>

      <div class="product-info">
        <h3>${escapeHtml(product.title)}</h3>
        <p>₱${price}</p>

        <button
          class="add-to-cart"
          data-variant-id="${escapeHtml(variant.id)}"
          data-product-title="${escapeHtml(product.title)}"
          data-price="${escapeHtml(variant.price.amount)}"
          data-image="${escapeHtml(image)}"
        >
          ADD TO CART
        </button>
      </div>
    `;

    grid.appendChild(card);
  });

  document.querySelectorAll(".add-to-cart").forEach(button => {
    button.addEventListener("click", () => {
      addToCart({
        variantId: button.dataset.variantId,
        title: button.dataset.productTitle,
        price: Number(button.dataset.price),
        image: button.dataset.image,
        quantity: 1
      });
    });
  });
}

/* =========================
   CART
========================= */

function getCartElements() {
  return {
    overlay: document.getElementById("cart-overlay"),
    items: document.getElementById("cart-items"),
    total: document.getElementById("cart-total"),
    checkoutButton: document.getElementById("checkout-button"),
    closeButton: document.getElementById("close-cart")
  };
}

function addToCart(item) {
  const existing = cart.find(
    product => product.variantId === item.variantId
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push(item);
  }

  updateCart();

  showCart();
}

function updateCart() {
  createCartButton();
  renderCart();
}

function createCartButton() {
  let button = document.querySelector(".cart-button");

  if (!button) {
    button = document.createElement("button");
    button.className = "cart-button";
    button.innerHTML = `CART <span class="cart-count">0</span>`;

    document.body.appendChild(button);

    button.addEventListener("click", showCart);
  }

  const countElement = button.querySelector(".cart-count");

  const count = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  if (countElement) {
    countElement.textContent = count;
  }
}

function renderCart() {
  const {
    items,
    total,
    checkoutButton
  } = getCartElements();

  if (!items || !total) {
    return;
  }

  items.innerHTML = "";

  if (cart.length === 0) {
    items.innerHTML = `
      <p class="empty-cart">
        YOUR CART IS EMPTY.
      </p>
    `;

    total.textContent = "₱0";

    if (checkoutButton) {
      checkoutButton.disabled = true;
    }

    return;
  }

  let cartTotal = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;

    cartTotal += itemTotal;

    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";

    cartItem.innerHTML = `
      <div class="cart-item-image">
        <img
          src="${escapeHtml(item.image || "")}"
          alt="${escapeHtml(item.title)}"
        >
      </div>

      <div class="cart-item-info">
        <h4>${escapeHtml(item.title)}</h4>

        <p>
          ₱${item.price.toLocaleString("en-PH", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          })}
        </p>

        <div class="cart-quantity">
          <button
            class="quantity-minus"
            data-index="${index}"
          >
            −
          </button>

          <span>${item.quantity}</span>

          <button
            class="quantity-plus"
            data-index="${index}"
          >
            +
          </button>
        </div>

        <button
          class="remove-item"
          data-index="${index}"
        >
          REMOVE
        </button>
      </div>

      <div class="cart-item-total">
        ₱${itemTotal.toLocaleString("en-PH", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })}
      </div>
    `;

    items.appendChild(cartItem);
  });

  total.textContent =
    "₱" +
    cartTotal.toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  if (checkoutButton) {
    checkoutButton.disabled = false;
  }

  document.querySelectorAll(".quantity-minus").forEach(button => {
    button.addEventListener("click", () => {
      changeQuantity(Number(button.dataset.index), -1);
    });
  });

  document.querySelectorAll(".quantity-plus").forEach(button => {
    button.addEventListener("click", () => {
      changeQuantity(Number(button.dataset.index), 1);
    });
  });

  document.querySelectorAll(".remove-item").forEach(button => {
    button.addEventListener("click", () => {
      removeFromCart(Number(button.dataset.index));
    });
  });
}

function changeQuantity(index, amount) {
  if (!cart[index]) return;

  cart[index].quantity += amount;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  updateCart();
}

function removeFromCart(index) {
  if (!cart[index]) return;

  cart.splice(index, 1);

  updateCart();
}

/* =========================
   SHOW CART
========================= */

function showCart() {
  const { overlay } = getCartElements();

  if (!overlay) {
    console.error("Cart overlay not found.");
    return;
  }

  renderCart();

  overlay.hidden = false;
  overlay.style.display = "flex";

  document.body.style.overflow = "hidden";
}

function closeCart() {
  const { overlay } = getCartElements();

  if (!overlay) return;

  overlay.hidden = true;
  overlay.style.display = "none";

  document.body.style.overflow = "";
}

/* =========================
   CHECKOUT
========================= */

async function checkout() {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const { checkoutButton } = getCartElements();

  if (checkoutButton) {
    checkoutButton.disabled = true;
    checkoutButton.textContent = "CONNECTING...";
  }

  try {
    const lines = cart.map(item => ({
      merchandiseId: item.variantId,
      quantity: Number(item.quantity)
    }));

    const mutation = `
      mutation CartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }

          userErrors {
            field
            message
          }

          warnings {
            code
            message
          }
        }
      }
    `;

    const data = await shopifyFetch(mutation, {
      input: {
        lines
      }
    });

    const result = data.cartCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(
        result.userErrors
          .map(error => error.message)
          .join("\n")
      );
    }

    if (result.warnings && result.warnings.length > 0) {
      console.warn("Shopify warnings:", result.warnings);
    }

    if (!result.cart || !result.cart.checkoutUrl) {
      throw new Error(
        "Shopify did not return a checkout URL."
      );
    }

    window.location.assign(result.cart.checkoutUrl);

  } catch (error) {
    console.error("Checkout error:", error);

    alert(
      "CHECKOUT ERROR:\n\n" +
      error.message
    );

    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.textContent = "CHECKOUT";
    }
  }
}

/* =========================
   CART SETUP
========================= */

function setupCart() {
  const {
    overlay,
    closeButton,
    checkoutButton
  } = getCartElements();

  if (overlay) {
    overlay.hidden = true;
    overlay.style.display = "none";

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        closeCart();
      }
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeCart);
  }

  if (checkoutButton) {
    checkoutButton.addEventListener("click", checkout);
  }

  updateCart();
}

/* =========================
   NAVIGATION
========================= */

function setupNavigation() {
  const shopLinks = document.querySelectorAll(
    'a[href="#shop"], a[href="#collection"]'
  );

  shopLinks.forEach(link => {
    link.addEventListener("click", event => {
      const target =
        document.querySelector("#shop") ||
        document.querySelector("#collection") ||
        document.querySelector(".products-section");

      if (target) {
        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });

  const aboutLinks = document.querySelectorAll(
    'a[href="#about"]'
  );

  aboutLinks.forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector("#about");

      if (target) {
        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });

  const contactLinks = document.querySelectorAll(
    'a[href="#contact"]'
  );

  contactLinks.forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector("#contact");

      if (target) {
        event.preventDefault();

        target.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });
}

/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   START
========================= */

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupCart();
  loadShopifyProducts();
});