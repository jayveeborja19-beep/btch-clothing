// COMPLETE script.js
// Shopify + Cart + Checkout + BTCH 3D GLB logo

// IMPORTANT:
// Keep your existing Shopify Storefront token on this line.

import * as THREE from "https://esm.sh/three@0.180.0";
import { GLTFLoader } from "https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";

/* =====================================================
   SHOPIFY
===================================================== */

const SHOPIFY_DOMAIN = "btch-clothing.myshopify.com";

const STOREFRONT_ACCESS_TOKEN =
  "d8463ddfb6962692451d57928255c2ee";

const API_VERSION = "2026-07";

const STOREFRONT_API_URL =
  `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

let products = [];
let cart = [];

/* =====================================================
   SHOPIFY API
===================================================== */

async function shopifyFetch(query, variables = {}) {
  const response = await fetch(STOREFRONT_API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Shopify-Storefront-Access-Token":
        STOREFRONT_ACCESS_TOKEN
    },

    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(
      `Shopify HTTP error: ${response.status}`
    );
  }

  const result = await response.json();

  if (
    result.errors &&
    result.errors.length
  ) {
    throw new Error(
      result.errors
        .map(error => error.message)
        .join("\n")
    );
  }

  return result.data;
}

/* =====================================================
   LOAD PRODUCTS
===================================================== */

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
    const data =
      await shopifyFetch(query);

    products =
      data.products.nodes || [];

    renderProducts(products);

    console.log(
      "Shopify products loaded:",
      products.length
    );

  } catch (error) {
    console.error(
      "Could not load Shopify products:",
      error
    );
  }
}

/* =====================================================
   RENDER PRODUCTS
===================================================== */

function renderProducts(items) {
  const grid =
    document.querySelector(".products-grid") ||
    document.querySelector("#products-grid") ||
    document.querySelector(".product-grid");

  if (!grid) {
    console.warn(
      "Product grid not found."
    );

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

    const price =
      Number(
        variant.price.amount
      ).toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }
      );

    const card =
      document.createElement("div");

    card.className =
      "product-card";

    card.innerHTML = `

      <div class="product-image">
        <img
          src="${escapeHtml(image)}"
          alt="${escapeHtml(product.title)}"
        >
      </div>

      <div class="product-info">
        <h3>
          ${escapeHtml(product.title)}
        </h3>

        <p>
          ₱${price}
        </p>

        <button
          class="add-to-cart"
          type="button"
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

  document
    .querySelectorAll(".add-to-cart")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          addToCart({
            variantId:
              button.dataset.variantId,

            title:
              button.dataset.productTitle,

            price:
              Number(
                button.dataset.price
              ),

            image:
              button.dataset.image,

            quantity: 1
          });
        }
      );
    });
}

/* =====================================================
   CART ELEMENTS
===================================================== */

function getCartElements() {
  return {
    overlay:
      document.getElementById(
        "cart-overlay"
      ),

    items:
      document.getElementById(
        "cart-items"
      ),

    total:
      document.getElementById(
        "cart-total"
      ),

    checkoutButton:
      document.getElementById(
        "checkout-button"
      ),

    closeButton:
      document.getElementById(
        "close-cart"
      )
  };
}

/* =====================================================
   ADD TO CART
===================================================== */

function addToCart(item) {
  const existing =
    cart.find(
      product =>
        product.variantId ===
        item.variantId
    );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push(item);
  }

  updateCart();
  showCart();
}

/* =====================================================
   UPDATE CART
===================================================== */

function updateCart() {
  createCartButton();
  renderCart();
}

/* =====================================================
   CART BUTTON
===================================================== */

function createCartButton() {
  const header =
    document.querySelector("header");

  if (!header) return;

  let button =
    document.querySelector(
      ".cart-button"
    );

  if (!button) {
    button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "cart-button";

    button.setAttribute(
      "aria-label",
      "Open cart"
    );

    button.innerHTML = `
      <svg
        class="cart-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 4H5L7.2 15.2C7.4 16.2 8.3 17 9.4 17H18.2C19.2 17 20.1 16.3 20.4 15.4L22 9H6"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <circle
          cx="9.5"
          cy="20"
          r="1.2"
          fill="currentColor"
        />

        <circle
          cx="18"
          cy="20"
          r="1.2"
          fill="currentColor"
        />
      </svg>

      <span class="cart-count">
        0
      </span>
    `;

    header.appendChild(button);
  }

  if (!button.dataset.cartListener) {
    button.addEventListener(
      "click",
      showCart
    );

    button.dataset.cartListener =
      "true";
  }

  const countElement =
    button.querySelector(
      ".cart-count"
    );

  const count =
    cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  if (countElement) {
    countElement.textContent =
      count;
  }
}

/* =====================================================
   RENDER CART
===================================================== */

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

    total.textContent =
      "₱0";

    if (checkoutButton) {
      checkoutButton.disabled =
        true;
    }

    return;
  }

  let cartTotal = 0;

  cart.forEach(
    (item, index) => {
      const itemTotal =
        item.price *
        item.quantity;

      cartTotal +=
        itemTotal;

      const cartItem =
        document.createElement(
          "div"
        );

      cartItem.className =
        "cart-item";

      cartItem.innerHTML = `
        <div class="cart-item-image">
          <img
            src="${escapeHtml(
              item.image || ""
            )}"
            alt="${escapeHtml(
              item.title
            )}"
          >
        </div>

        <div class="cart-item-info">
          <h4>
            ${escapeHtml(
              item.title
            )}
          </h4>

          <p>
            ₱${item.price.toLocaleString(
              "en-PH",
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              }
            )}
          </p>

          <div class="cart-quantity">
            <button
              class="quantity-minus"
              type="button"
              data-index="${index}"
            >
              −
            </button>

            <span>
              ${item.quantity}
            </span>

            <button
              class="quantity-plus"
              type="button"
              data-index="${index}"
            >
              +
            </button>
          </div>

          <button
            class="remove-item"
            type="button"
            data-index="${index}"
          >
            REMOVE
          </button>
        </div>

        <div class="cart-item-total">
          ₱${itemTotal.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2
            }
          )}
        </div>
      `;

      items.appendChild(
        cartItem
      );
    }
  );

  total.textContent =
    "₱" +
    cartTotal.toLocaleString(
      "en-PH",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    );

  if (checkoutButton) {
    checkoutButton.disabled =
      false;
  }

  document
    .querySelectorAll(
      ".quantity-minus"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          changeQuantity(
            Number(
              button.dataset.index
            ),
            -1
          );
        }
      );
    });

  document
    .querySelectorAll(
      ".quantity-plus"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          changeQuantity(
            Number(
              button.dataset.index
            ),
            1
          );
        }
      );
    });

  document
    .querySelectorAll(
      ".remove-item"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          removeFromCart(
            Number(
              button.dataset.index
            )
          );
        }
      );
    });
}

/* =====================================================
   CHANGE QUANTITY
===================================================== */

function changeQuantity(
  index,
  amount
) {
  if (!cart[index])
    return;

  cart[index].quantity +=
    amount;

  if (
    cart[index].quantity <=
    0
  ) {
    cart.splice(
      index,
      1
    );
  }

  updateCart();
}

/* =====================================================
   REMOVE FROM CART
===================================================== */

function removeFromCart(index) {
  if (!cart[index])
    return;

  cart.splice(
    index,
    1
  );

  updateCart();
}

/* =====================================================
   SHOW CART
===================================================== */

function showCart() {
  const {
    overlay
  } = getCartElements();

  if (!overlay) {
    console.error(
      "Cart overlay not found."
    );

    return;
  }

  renderCart();

  overlay.hidden =
    false;

  overlay.style.display =
    "flex";

  document.body.style.overflow =
    "hidden";
}

/* =====================================================
   CLOSE CART
===================================================== */

function closeCart() {
  const {
    overlay
  } = getCartElements();

  if (!overlay)
    return;

  overlay.hidden =
    true;

  overlay.style.display =
    "none";

  document.body.style.overflow =
    "";
}

/* =====================================================
   CHECKOUT
===================================================== */

async function checkout() {
  if (cart.length === 0) {
    alert(
      "Your cart is empty."
    );

    return;
  }

  const {
    checkoutButton
  } = getCartElements();

  if (checkoutButton) {
    checkoutButton.disabled =
      true;

    checkoutButton.textContent =
      "CONNECTING...";
  }

  try {
    const lines =
      cart.map(
        item => ({
          merchandiseId:
            item.variantId,

          quantity:
            Number(
              item.quantity
            )
        })
      );

    const mutation = `

      mutation CartCreate(
        $input: CartInput!
      ) {

        cartCreate(
          input: $input
        ) {

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

    const data =
      await shopifyFetch(
        mutation,
        {
          input: {
            lines
          }
        }
      );

    const result =
      data.cartCreate;

    if (
      result.userErrors &&
      result.userErrors.length > 0
    ) {
      throw new Error(
        result.userErrors
          .map(
            error =>
              error.message
          )
          .join("\n")
      );
    }

    if (
      result.warnings &&
      result.warnings.length > 0
    ) {
      console.warn(
        "Shopify warnings:",
        result.warnings
      );
    }

    if (
      !result.cart ||
      !result.cart.checkoutUrl
    ) {
      throw new Error(
        "Shopify did not return a checkout URL."
      );
    }

    window.location.assign(
      result.cart.checkoutUrl
    );

  } catch (error) {
    console.error(
      "Checkout error:",
      error
    );

    alert(
      "CHECKOUT ERROR:\n\n" +
      error.message
    );

    if (checkoutButton) {
      checkoutButton.disabled =
        false;

      checkoutButton.textContent =
        "CHECKOUT";
    }
  }
}

/* =====================================================
   CART SETUP
===================================================== */

function setupCart() {
  const {
    overlay,
    closeButton,
    checkoutButton
  } = getCartElements();

  if (overlay) {
    overlay.hidden =
      true;

    overlay.style.display =
      "none";

    overlay.addEventListener(
      "click",
      event => {
        if (
          event.target ===
          overlay
        ) {
          closeCart();
        }
      }
    );
  }

  if (closeButton) {
    closeButton.addEventListener(
      "click",
      closeCart
    );
  }

  if (checkoutButton) {
    checkoutButton.addEventListener(
      "click",
      checkout
    );
  }

  updateCart();
}

/* =====================================================
   NAVIGATION
===================================================== */

function setupNavigation() {
  const shopLinks =
    document.querySelectorAll(
      'a[href="#shop"], a[href="#collection"]'
    );

  shopLinks.forEach(
    link => {
      link.addEventListener(
        "click",
        event => {
          const target =
            document.querySelector(
              "#shop"
            ) ||
            document.querySelector(
              "#collection"
            ) ||
            document.querySelector(
              ".products-section"
            );

          if (target) {
            event.preventDefault();

            target.scrollIntoView({
              behavior:
                "smooth"
            });
          }
        }
      );
    }
  );

  const aboutLinks =
    document.querySelectorAll(
      'a[href="#about"]'
    );

  aboutLinks.forEach(
    link => {
      link.addEventListener(
        "click",
        event => {
          const target =
            document.querySelector(
              "#about"
            );

          if (target) {
            event.preventDefault();

            target.scrollIntoView({
              behavior:
                "smooth"
            });
          }
        }
      );
    }
  );

  const contactLinks =
    document.querySelectorAll(
      'a[href="#contact"]'
    );

  contactLinks.forEach(
    link => {
      link.addEventListener(
        "click",
        event => {
          const target =
            document.querySelector(
              "#contact"
            );

          if (target) {
            event.preventDefault();

            target.scrollIntoView({
              behavior:
                "smooth"
            });
          }
        }
      );
    }
  );
}

/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

/* =====================================================
   BTCH 3D SPINNING GLB LOGO
===================================================== */

function setup3DLogo() {
  const container =
    document.getElementById(
      "btch-3d-logo"
    );

  if (!container) {
    console.warn(
      "BTCH 3D logo container not found."
    );

    return;
  }

  console.log(
    "Starting BTCH 3D logo..."
  );

  container.innerHTML = "";

  /*
    MOVE THE WHOLE 3D CANVAS DOWN.

    THIS IS THE IMPORTANT CHANGE.

    The old position was:
      -145px

    The new position is:
      -55px

    This keeps the logo below the white
    header and inside the black hero.
  */

  container.style.top =
    "-55px";

  container.style.left =
    "50%";

  container.style.transform =
    "translateX(-50%)";

  /* ===================================================
     FIXED SCENE
  =================================================== */

  const scene =
    new THREE.Scene();

  const camera =
    new THREE.PerspectiveCamera(
      32,
      container.clientWidth /
        container.clientHeight,
      0.01,
      1000
    );

  /*
    CAMERA NEVER MOVES.
    LOGO ROTATES AROUND ITS OWN CENTER.
  */

  camera.position.set(
    0,
    0,
    8
  );

  camera.lookAt(
    0,
    0,
    0
  );

  /* ===================================================
     RENDERER
  =================================================== */

  const renderer =
    new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  );

  renderer.setSize(
    container.clientWidth,
    container.clientHeight
  );

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.setClearColor(
    0x000000,
    0
  );

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure =
    1.15;

  container.appendChild(
    renderer.domElement
  );

  /* ===================================================
     LIGHTING
  =================================================== */

  scene.add(
    new THREE.AmbientLight(
      0xffffff,
      3.5
    )
  );

  const hemisphereLight =
    new THREE.HemisphereLight(
      0xffffff,
      0x222222,
      2
    );

  scene.add(
    hemisphereLight
  );

  const mainLight =
    new THREE.DirectionalLight(
      0xffffff,
      5
    );

  mainLight.position.set(
    5,
    6,
    8
  );

  scene.add(
    mainLight
  );

  const fillLight =
    new THREE.DirectionalLight(
      0xffffff,
      3
    );

  fillLight.position.set(
    -6,
    3,
    5
  );

  scene.add(
    fillLight
  );

  const rimLight =
    new THREE.DirectionalLight(
      0xffffff,
      4
    );

  rimLight.position.set(
    0,
    5,
    -8
  );

  scene.add(
    rimLight
  );

  /* ===================================================
     FIXED ROTATION PIVOT
  =================================================== */

  const logoPivot =
    new THREE.Group();

  logoPivot.position.set(
    0,
    0,
    0
  );

  logoPivot.rotation.set(
    0,
    0,
    0
  );

  scene.add(
    logoPivot
  );

  /* ===================================================
     LOAD GLB
  =================================================== */

  const loader =
    new GLTFLoader();

  loader.load(
    "./models/bitch.glb",

    function(gltf) {
      console.log(
        "BTCH 3D logo loaded successfully."
      );

      /*
        Ignore GLB animation.
        We control the spin ourselves.
      */

      if (
        gltf.animations &&
        gltf.animations.length
      ) {
        console.log(
          "Ignoring GLB animations:",
          gltf.animations.length
        );
      }

      const originalModel =
        gltf.scene;

      originalModel.updateMatrixWorld(
        true
      );

      /*
        Create clean model.
      */

      const cleanModel =
        new THREE.Group();

      const meshes = [];

      originalModel.traverse(
        child => {
          if (!child.isMesh) {
            return;
          }

          if (!child.geometry) {
            return;
          }

          meshes.push(
            child
          );
        }
      );

      if (!meshes.length) {
        console.error(
          "BTCH GLB contains no usable meshes."
        );

        return;
      }

      /*
        Bake original transforms
        into each mesh.
      */

      meshes.forEach(
        originalMesh => {
          const geometry =
            originalMesh.geometry.clone();

          geometry.applyMatrix4(
            originalMesh.matrixWorld
          );

          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          const material =
            new THREE.MeshStandardMaterial({
              color: 0xffffff,
              metalness: 0.75,
              roughness: 0.22
            });

          const mesh =
            new THREE.Mesh(
              geometry,
              material
            );

          mesh.position.set(
            0,
            0,
            0
          );

          mesh.rotation.set(
            0,
            0,
            0
          );

          mesh.scale.set(
            1,
            1,
            1
          );

          mesh.visible =
            true;

          mesh.frustumCulled =
            false;

          mesh.castShadow =
            false;

          mesh.receiveShadow =
            false;

          cleanModel.add(
            mesh
          );
        }
      );

      /* =================================================
         CENTER MODEL
      ================================================= */

      cleanModel.updateMatrixWorld(
        true
      );

      const box =
        new THREE.Box3()
          .setFromObject(
            cleanModel,
            true
          );

      const size =
        box.getSize(
          new THREE.Vector3()
        );

      const center =
        box.getCenter(
          new THREE.Vector3()
        );

      const maxDimension =
        Math.max(
          size.x,
          size.y,
          size.z
        );

      console.log(
        "BTCH CLEAN LOGO SIZE:",
        size
      );

      console.log(
        "BTCH CLEAN LOGO CENTER:",
        center
      );

      console.log(
        "BTCH CLEAN LOGO MAX:",
        maxDimension
      );

      if (
        !maxDimension ||
        !Number.isFinite(
          maxDimension
        )
      ) {
        console.error(
          "BTCH clean logo has invalid dimensions."
        );

        return;
      }

      /*
        SMALL LOGO SIZE.
      */

      const targetSize =
        3.2;

      const scale =
        targetSize /
        maxDimension;

      cleanModel.scale.setScalar(
        scale
      );

      /*
        Center after scaling.
        This prevents sliding/orbiting.
      */

      cleanModel.position.set(
        -center.x * scale,
        -center.y * scale,
        -center.z * scale
      );

      cleanModel.updateMatrixWorld(
        true
      );

      /*
        Add centered model
        to fixed pivot.
      */

      logoPivot.add(
        cleanModel
      );

      logoPivot.position.set(
        0,
        0,
        0
      );

      logoPivot.rotation.set(
        0,
        0,
        0
      );

      /*
        ONLY THIS OBJECT ROTATES.
      */

      window.btch3DLogo =
        logoPivot;

      console.log(
        "BTCH 3D logo is ready."
      );

      console.log(
        "Position: FIXED"
      );

      console.log(
        "Rotation: Y AXIS ONLY"
      );

      console.log(
        "Target size:",
        targetSize
      );
    },

    /* =================================================
       LOADING PROGRESS
    ================================================= */

    function(progress) {
      if (progress.total) {
        console.log(
          "Loading BTCH 3D logo:",
          Math.round(
            (
              progress.loaded /
              progress.total
            ) * 100
          ) + "%"
        );
      }
    },

    /* =================================================
       ERROR
    ================================================= */

    function(error) {
      console.error(
        "BTCH 3D logo failed to load:",
        error
      );
    }
  );

  /* ===================================================
     ANIMATION

     ONLY Y ROTATION.
     NO SLIDE.
     NO ORBIT.
     NO BOUNCE.
  =================================================== */

  function animate() {
    requestAnimationFrame(
      animate
    );

    if (
      window.btch3DLogo
    ) {
      window.btch3DLogo.rotation.y +=
        0.003;
    }

    renderer.render(
      scene,
      camera
    );
  }

  animate();

  /* ===================================================
     RESIZE
  =================================================== */

  function resize3DLogo() {
    const width =
      container.clientWidth;

    const height =
      container.clientHeight;

    if (
      !width ||
      !height
    ) {
      return;
    }

    camera.aspect =
      width /
      height;

    camera.updateProjectionMatrix();

    renderer.setSize(
      width,
      height
    );
  }

  window.addEventListener(
    "resize",
    resize3DLogo
  );
}

/* =====================================================
   START WEBSITE
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupNavigation();
    setupCart();
    loadShopifyProducts();
    setup3DLogo();
  }
);