const SHOPIFY_DOMAIN = "btch-clothing.myshopify.com";

// Paste your PUBLIC Storefront API token between the quotes
const SHOPIFY_TOKEN = "d8463ddfb6962692451d57928255c2ee";

const SHOPIFY_API_VERSION = "2026-07";

const endpoint =
  `https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

let cart = [];

/* =========================
   SHOPIFY PRODUCTS
========================= */

async function loadShopifyProducts() {
  const query = `
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            description
            featuredImage {
              url
              altText
            }
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify API Error:", data.errors);
      return;
    }

    const products = data.data.products.edges.map(edge => edge.node);

    displayProducts(products);

  } catch (error) {
    console.error("Could not connect to Shopify:", error);
  }
}

/* =========================
   DISPLAY PRODUCTS
========================= */

function displayProducts(products) {
  const grid = document.querySelector(".products-grid");

  if (!grid) return;

  grid.innerHTML = "";

  products.forEach(product => {
    const variant = product.variants.edges[0]?.node;

    if (!variant) return;

    const price = Number(variant.price.amount).toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    const image = product.featuredImage
      ? product.featuredImage.url
      : "";

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-image">
        ${
          image
            ? `<img src="${image}" alt="${product.featuredImage.altText || product.title}">`
            : `<div>No image</div>`
        }
      </div>

      <h3>${product.title}</h3>

      <p>₱${price}</p>

      <button
        class="add-to-cart"
        data-variant-id="${variant.id}"
        data-title="${product.title}"
        data-price="${variant.price.amount}"
        data-image="${image}"
      >
        ADD TO CART
      </button>
    `;

    grid.appendChild(card);
  });

  attachCartButtons();
}

/* =========================
   ADD TO CART
========================= */

function attachCartButtons() {
  const buttons = document.querySelectorAll(".add-to-cart");

  buttons.forEach(button => {
    button.addEventListener("click", () => {

      const variantId = button.dataset.variantId;
      const title = button.dataset.title;
      const price = Number(button.dataset.price);
      const image = button.dataset.image;

      const existingItem = cart.find(
        item => item.variantId === variantId
      );

      if (existingItem) {
        existingItem.quantity++;
      } else {
        cart.push({
          variantId,
          title,
          price,
          image,
          quantity: 1
        });
      }

      updateCart();

      button.textContent = "ADDED ✓";

      setTimeout(() => {
        button.textContent = "ADD TO CART";
      }, 1000);
    });
  });
}

/* =========================
   CART
========================= */

function updateCart() {
  let cartButton = document.querySelector(".cart-button");

  if (!cartButton) {
    createCartButton();
    cartButton = document.querySelector(".cart-button");
  }

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  cartButton.textContent = `CART (${totalItems})`;
}

/* =========================
   CART BUTTON
========================= */

function createCartButton() {
  const header = document.querySelector("header");

  if (!header) return;

  const cartButton = document.createElement("button");

  cartButton.className = "cart-button";
  cartButton.textContent = "CART (0)";

  cartButton.addEventListener("click", showCart);

  header.appendChild(cartButton);
}

/* =========================
   SHOW CART
========================= */

function showCart() {
  let cartHTML = `
    <div class="cart-overlay">
      <div class="cart-box">

        <button class="close-cart">✕</button>

        <h2>YOUR CART</h2>
  `;

  if (cart.length === 0) {

    cartHTML += `
      <p>Your cart is empty.</p>
    `;

  } else {

    cart.forEach((item, index) => {

      const itemTotal = item.price * item.quantity;

      cartHTML += `
        <div class="cart-item">

          <img
            src="${item.image}"
            alt="${item.title}"
          >

          <div class="cart-item-info">

            <h3>${item.title}</h3>

            <p>₱${item.price.toLocaleString("en-PH")}</p>

            <div class="quantity-controls">

              <button onclick="changeQuantity(${index}, -1)">
                −
              </button>

              <span>${item.quantity}</span>

              <button onclick="changeQuantity(${index}, 1)">
                +
              </button>

            </div>

            <button
              class="remove-item"
              onclick="removeFromCart(${index})"
            >
              REMOVE
            </button>

          </div>

          <strong>
            ₱${itemTotal.toLocaleString("en-PH")}
          </strong>

        </div>
      `;
    });

    const cartTotal = cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    cartHTML += `
      <div class="cart-total">

        <h3>
          TOTAL:
          ₱${cartTotal.toLocaleString("en-PH")}
        </h3>

        <button class="checkout-button">
          CHECKOUT
        </button>

      </div>
    `;
  }

  cartHTML += `
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", cartHTML);

  document
    .querySelector(".close-cart")
    .addEventListener("click", closeCart);

  const checkoutButton =
    document.querySelector(".checkout-button");

  if (checkoutButton) {
    checkoutButton.addEventListener("click", checkout);
  }
}

/* =========================
   CLOSE CART
========================= */

function closeCart() {
  const overlay = document.querySelector(".cart-overlay");

  if (overlay) {
    overlay.remove();
  }
}

/* =========================
   CHANGE QUANTITY
========================= */

function changeQuantity(index, amount) {

  cart[index].quantity += amount;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  closeCart();
  updateCart();
  showCart();
}

/* =========================
   REMOVE ITEM
========================= */

function removeFromCart(index) {

  cart.splice(index, 1);

  closeCart();
  updateCart();
  showCart();
}

/* =========================
   CHECKOUT
========================= */

async function checkout() {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const lines = cart.map(item => ({
    merchandiseId: item.variantId,
    quantity: item.quantity
  }));

  const mutation = `
    mutation CartCreate($input: CartInput) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            lines: lines
          }
        }
      })
    });

    const data = await response.json();

    console.log("Checkout response:", data);

    const result = data.data?.cartCreate;

    if (!result) {
      console.error(data);
      alert("Something went wrong creating your checkout.");
      return;
    }

    if (result.userErrors.length > 0) {
      console.error(result.userErrors);
      alert(result.userErrors[0].message);
      return;
    }

    if (result.cart?.checkoutUrl) {
      window.location.href = result.cart.checkoutUrl;
    }

  } catch (error) {
    console.error("Checkout error:", error);
    alert("Could not connect to Shopify checkout.");
  }
}

/* =========================
   START
========================= */

loadShopifyProducts();