
// =====================================================
// BTCH CLOTHING - COMPLETE SCRIPT.JS
// Shopify + Product Gallery + Size Selection + Cart + Checkout + 3D Logo
// =====================================================

import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

// =====================================================
// SHOPIFY SETTINGS
// =====================================================

const SHOPIFY_DOMAIN = "btch-clothing.myshopify.com";

const STOREFRONT_ACCESS_TOKEN =
  "d8463ddfb6962692451d57928255c2ee";

const API_VERSION = "2026-07";

const STOREFRONT_API_URL =
  `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

let products = [];
let cart = [];

// =====================================================
// SHOPIFY API
// =====================================================

async function shopifyFetch(query, variables = {}) {
  const response = await fetch(STOREFRONT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Shopify HTTP error: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors.map(e => e.message).join("\n"));
  }

  return result.data;
}

// =====================================================
// LOAD SHOPIFY PRODUCTS
// =====================================================

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
              selectedOptions {
                name
                value
              }
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

    console.log("Shopify products loaded:", products.length);
  } catch (error) {
    console.error("Could not load Shopify products:", error);
  }
}

// =====================================================
// RENDER PRODUCTS
// =====================================================

function renderProducts(items) {
  const grid = document.querySelector(".products-grid");

  if (!grid) {
    console.warn("Product grid not found.");
    return;
  }

  grid.innerHTML = "";

  items.forEach(product => {
    const variants = product.variants?.nodes || [];
    if (!variants.length) return;

    const images = product.images?.nodes?.length
      ? product.images.nodes
      : product.featuredImage
        ? [product.featuredImage]
        : [];

    const image =
      product.featuredImage?.url ||
      variants[0].image?.url ||
      images[0]?.url ||
      "";

    const price = Number(variants[0].price.amount).toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    const card = document.createElement("div");
    card.className = "product-card";
    card.tabIndex = 0;

    card.innerHTML = `
      <div class="product-image">
        <img src="${escapeHtml(image)}"
             alt="${escapeHtml(product.title)}">
      </div>

      <div class="product-info">
        <h3>${escapeHtml(product.title)}</h3>
        <p>₱${price}</p>

        <button class="add-to-cart"
                type="button">
          SELECT SIZE
        </button>
      </div>
    `;

    card.addEventListener("click", event => {
      if (event.target.closest(".add-to-cart")) {
        event.stopPropagation();
      }
      openProductDetails(product);
    });

    card.addEventListener("keydown", event => {
      if (event.target === card &&
          (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openProductDetails(product);
      }
    });

    grid.appendChild(card);
  });
}

// =====================================================
// PRODUCT DETAILS AND IMAGE GALLERY
// =====================================================

function openProductDetails(product) {
  const variants = product.variants?.nodes || [];

  if (!variants.length) {
    alert("No product variants found.");
    return;
  }

  const images = product.images?.nodes?.length
    ? product.images.nodes
    : product.featuredImage
      ? [product.featuredImage]
      : [];

  if (!images.length) {
    alert("No product photos found.");
    return;
  }

  const getVariantSize = variant => {
    const sizeOption = variant.selectedOptions?.find(
      option => option.name?.toLowerCase() === "size"
    );
    return sizeOption?.value || variant.title;
  };

  const sizeVariants = variants.map(variant => ({
    ...variant,
    sizeLabel: getVariantSize(variant)
  }));

  // Customer must choose a size first.
  let selectedVariant = null;

  const formatPrice = variant =>
    Number(variant.price.amount).toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  let modal = document.getElementById("btch-product-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "btch-product-modal";
    modal.className = "btch-product-modal";
    document.body.appendChild(modal);
  }

  const sizeButtons = sizeVariants.map((variant, index) => `
    <button
      type="button"
      class="btch-size-option"
      data-variant-index="${index}"
      ${variant.availableForSale ? "" : "disabled"}
      aria-pressed="false">
      ${escapeHtml(variant.sizeLabel)}
      ${variant.availableForSale ? "" : '<span class="btch-sold-out">SOLD OUT</span>'}
    </button>
  `).join("");

  modal.innerHTML = `
    <style>
      #btch-product-modal .btch-size-picker {
        margin: 18px 0;
      }

      #btch-product-modal .btch-size-heading {
        display: block;
        margin-bottom: 10px;
        font-size: 12px;
        letter-spacing: 1.5px;
        font-weight: 700;
      }

      #btch-product-modal .btch-size-options {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
      }

      #btch-product-modal .btch-size-option {
        min-width: 48px;
        min-height: 44px;
        padding: 9px 13px;
        border: 1px solid #777;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
      }

      #btch-product-modal .btch-size-option.selected {
        background: #fff;
        color: #000;
        border-color: #fff;
      }

      #btch-product-modal .btch-size-option:disabled {
        opacity: .35;
        cursor: not-allowed;
        text-decoration: line-through;
      }

      #btch-product-modal .btch-sold-out {
        display: block;
        font-size: 8px;
        margin-top: 3px;
      }

      #btch-product-modal .btch-detail-add:disabled {
        opacity: .45;
        cursor: not-allowed;
      }
    </style>

    <div class="btch-product-window">

      <button class="btch-product-close"
              type="button"
              aria-label="Close">×</button>

      <div class="btch-product-gallery">

        <div class="btch-product-main">
          <img id="btch-main-image"
               src="${escapeHtml(images[0].url)}"
               alt="${escapeHtml(product.title)}">
        </div>

        <div class="btch-product-thumbnails">

          ${images.map((img, index) => `
            <button
              type="button"
              class="btch-product-thumb ${index === 0 ? "selected" : ""}"
              data-image-index="${index}">
              <img src="${escapeHtml(img.url)}"
                   alt="${escapeHtml(img.altText || product.title)}">
            </button>
          `).join("")}

        </div>
      </div>

      <div class="btch-product-details">

        <p class="btch-product-label">BTCH CLOTHING</p>

        <h2>${escapeHtml(product.title)}</h2>

        <p class="btch-product-price">SELECT A SIZE</p>

        <p class="btch-product-description">
          ${escapeHtml(product.description || "")}
        </p>

        <div class="btch-size-picker">
          <span class="btch-size-heading">SELECT SIZE</span>
          <div class="btch-size-options">
            ${sizeButtons}
          </div>
        </div>

        <button type="button"
                class="btch-detail-add"
                disabled>
          SELECT SIZE FIRST
        </button>

      </div>
    </div>
  `;

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  const mainImage = modal.querySelector("#btch-main-image");
  const priceElement = modal.querySelector(".btch-product-price");
  const addButton = modal.querySelector(".btch-detail-add");

  // SWITCH PRODUCT PHOTOS

  modal.querySelectorAll(".btch-product-thumb").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.imageIndex);
      const selectedImage = images[index];

      if (!selectedImage) return;

      mainImage.src = selectedImage.url;
      mainImage.alt = selectedImage.altText || product.title;

      modal.querySelectorAll(".btch-product-thumb").forEach(thumb => {
        thumb.classList.remove("selected");
      });

      button.classList.add("selected");
    });
  });

  // SELECT SIZE

  modal.querySelectorAll(".btch-size-option").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.variantIndex);
      const variant = sizeVariants[index];

      if (!variant || !variant.availableForSale) return;

      selectedVariant = variant;

      modal.querySelectorAll(".btch-size-option").forEach(optionButton => {
        const isSelected = optionButton === button;

        optionButton.classList.toggle("selected", isSelected);
        optionButton.setAttribute("aria-pressed", String(isSelected));
      });

      priceElement.textContent = "₱" + formatPrice(selectedVariant);

      addButton.disabled = false;
      addButton.textContent = "ADD TO CART";
    });
  });

  // CLOSE PRODUCT WINDOW

  modal.querySelector(".btch-product-close").addEventListener(
    "click",
    closeProductDetails
  );

  modal.onclick = event => {
    if (event.target === modal) {
      closeProductDetails();
    }
  };

  // ADD SELECTED SIZE TO CART

  addButton.addEventListener("click", () => {
    if (!selectedVariant || !selectedVariant.availableForSale) {
      alert("Please select an available size.");
      return;
    }

    addToCart({
      variantId: selectedVariant.id,
      title: product.title,
      size: selectedVariant.sizeLabel,
      price: Number(selectedVariant.price.amount),
      image: selectedVariant.image?.url || images[0].url,
      quantity: 1
    });

    closeProductDetails();
  });
}

function closeProductDetails() {
  const modal = document.getElementById("btch-product-modal");

  if (modal) modal.style.display = "none";

  document.body.style.overflow = "";
}

// =====================================================
// CART ELEMENTS
// =====================================================

function getCartElements() {
  return {
    overlay: document.getElementById("cart-overlay"),
    items: document.getElementById("cart-items"),
    total: document.getElementById("cart-total"),
    checkoutButton: document.getElementById("checkout-button"),
    closeButton: document.getElementById("close-cart")
  };
}

// =====================================================
// ADD TO CART
// =====================================================

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

// =====================================================
// UPDATE CART
// =====================================================

function updateCart() {
  createCartButton();
  renderCart();
}

// =====================================================
// CART BUTTON
// =====================================================

function createCartButton() {
  const header = document.querySelector("header");
  if (!header) return;

  let button = document.querySelector(".cart-button");

  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "cart-button";
    button.setAttribute("aria-label", "Open cart");

    button.innerHTML = `
      <svg class="cart-icon"
           viewBox="0 0 24 24"
           fill="none"
           xmlns="http://www.w3.org/2000/svg">

        <path d="M3 4H5L7.2 15.2C7.4 16.2 8.3 17 9.4 17H18.2C19.2 17 20.1 16.3 20.4 15.4L22 9H6"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"/>

        <circle cx="9.5" cy="20" r="1.2" fill="currentColor"/>
        <circle cx="18" cy="20" r="1.2" fill="currentColor"/>
      </svg>

      <span class="cart-count">0</span>
    `;

    header.appendChild(button);
  }

  if (!button.dataset.cartListener) {
    button.addEventListener("click", showCart);
    button.dataset.cartListener = "true";
  }

  const countElement = button.querySelector(".cart-count");

  const count = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  if (countElement) countElement.textContent = count;
}

// =====================================================
// RENDER CART
// =====================================================

function renderCart() {
  const { items, total, checkoutButton } = getCartElements();

  if (!items || !total) return;

  items.innerHTML = "";

  if (cart.length === 0) {
    items.innerHTML = `<p class="empty-cart">YOUR CART IS EMPTY.</p>`;
    total.textContent = "₱0";

    if (checkoutButton) checkoutButton.disabled = true;
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
        <img src="${escapeHtml(item.image || "")}"
             alt="${escapeHtml(item.title)}">
      </div>

      <div class="cart-item-info">

        <h4>${escapeHtml(item.title)}</h4>

        ${item.size ? `<p class="cart-item-size">SIZE: ${escapeHtml(item.size)}</p>` : ""}

        <p>₱${item.price.toLocaleString("en-PH")}</p>

        <div class="cart-quantity">
          <button class="quantity-minus"
                  type="button"
                  data-index="${index}">−</button>

          <span>${item.quantity}</span>

          <button class="quantity-plus"
                  type="button"
                  data-index="${index}">+</button>
        </div>

        <button class="remove-item"
                type="button"
                data-index="${index}">
          REMOVE
        </button>

      </div>

      <div class="cart-item-total">
        ₱${itemTotal.toLocaleString("en-PH")}
      </div>
    `;

    items.appendChild(cartItem);
  });

  total.textContent = "₱" + cartTotal.toLocaleString("en-PH");

  if (checkoutButton) checkoutButton.disabled = false;

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

// =====================================================
// CHANGE QUANTITY
// =====================================================

function changeQuantity(index, amount) {
  if (!cart[index]) return;

  cart[index].quantity += amount;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  updateCart();
}

// =====================================================
// REMOVE ITEM
// =====================================================

function removeFromCart(index) {
  if (!cart[index]) return;

  cart.splice(index, 1);
  updateCart();
}

// =====================================================
// SHOW CART
// =====================================================

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

// =====================================================
// CLOSE CART
// =====================================================

function closeCart() {
  const { overlay } = getCartElements();
  if (!overlay) return;

  overlay.hidden = true;
  overlay.style.display = "none";
  document.body.style.overflow = "";
}

// =====================================================
// CHECKOUT
// =====================================================

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
      input: { lines }
    });

    const result = data.cartCreate;

    if (result.userErrors?.length) {
      throw new Error(
        result.userErrors.map(error => error.message).join("\n")
      );
    }

    if (result.warnings?.length) {
      console.warn("Shopify warnings:", result.warnings);
    }

    if (!result.cart?.checkoutUrl) {
      throw new Error("Shopify did not return a checkout URL.");
    }

    window.location.assign(result.cart.checkoutUrl);

  } catch (error) {
    console.error("Checkout error:", error);

    alert("CHECKOUT ERROR:\n\n" + error.message);

    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.textContent = "CHECKOUT";
    }
  }
}

// =====================================================
// CART SETUP
// =====================================================

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

// =====================================================
// NAVIGATION
// =====================================================

function setupNavigation() {
  document.querySelectorAll('a[href="#shop"], a[href="#collection"]')
    .forEach(link => {
      link.addEventListener("click", event => {
        const target =
          document.querySelector("#shop") ||
          document.querySelector("#collection") ||
          document.querySelector(".products-section");

        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

  document.querySelectorAll('a[href="#about"]').forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector("#about");

      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  document.querySelectorAll('a[href="#contact"]').forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector("#contact");

      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =====================================================
// BTCH 3D SPINNING GLB LOGO
// =====================================================

function setup3DLogo() {
  const container = document.getElementById("btch-3d-logo");

  if (!container) {
    console.warn("BTCH 3D logo container not found.");
    return;
  }

  container.innerHTML = "";

  function position3DLogo() {
    if (window.innerWidth <= 480) {
      container.style.top = "50px";
    } else if (window.innerWidth <= 768) {
      container.style.top = "0px";
    } else {
      container.style.top = "-55px";
    }

    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
  }

  position3DLogo();
  window.addEventListener("resize", position3DLogo);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    32,
    container.clientWidth / container.clientHeight,
    0.01,
    1000
  );

  camera.position.set(0, 0, 8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 3.5));

  const hemisphereLight = new THREE.HemisphereLight(
    0xffffff, 0x222222, 2
  );
  scene.add(hemisphereLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 5);
  mainLight.position.set(5, 6, 8);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 3);
  fillLight.position.set(-6, 3, 5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 4);
  rimLight.position.set(0, 5, -8);
  scene.add(rimLight);

  const logoPivot = new THREE.Group();
  scene.add(logoPivot);

  const loader = new GLTFLoader();

  loader.load(
    "./models/bitch.glb",

    function(gltf) {
      console.log("BTCH 3D logo loaded successfully.");

      const originalModel = gltf.scene;
      originalModel.updateMatrixWorld(true);

      const cleanModel = new THREE.Group();
      const meshes = [];

      originalModel.traverse(child => {
        if (child.isMesh && child.geometry) {
          meshes.push(child);
        }
      });

      if (!meshes.length) {
        console.error("BTCH GLB contains no usable meshes.");
        return;
      }

      meshes.forEach(originalMesh => {
        const geometry = originalMesh.geometry.clone();

        geometry.applyMatrix4(originalMesh.matrixWorld);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 0.75,
          roughness: 0.22
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;

        cleanModel.add(mesh);
      });

      cleanModel.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(cleanModel, true);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDimension = Math.max(size.x, size.y, size.z);

      if (!maxDimension || !Number.isFinite(maxDimension)) {
        console.error("BTCH clean logo has invalid dimensions.");
        return;
      }

      const targetSize = 3.2;
      const scale = targetSize / maxDimension;

      cleanModel.scale.setScalar(scale);

      cleanModel.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );

      cleanModel.updateMatrixWorld(true);
      logoPivot.add(cleanModel);

      window.btch3DLogo = logoPivot;

      console.log("BTCH 3D logo is ready.");
    },

    function(progress) {
      if (progress.total) {
        console.log(
          "Loading BTCH 3D logo:",
          Math.round(progress.loaded / progress.total * 100) + "%"
        );
      }
    },

    function(error) {
      console.error("BTCH 3D logo failed to load:", error);
    }
  );

  function animate() {
    requestAnimationFrame(animate);

    if (window.btch3DLogo) {
      window.btch3DLogo.rotation.y += 0.003;
    }

    renderer.render(scene, camera);
  }

  animate();

  function resize3DLogo() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  window.addEventListener("resize", resize3DLogo);
}

// =====================================================
// START WEBSITE
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupCart();
  loadShopifyProducts();
  setup3DLogo();
});
