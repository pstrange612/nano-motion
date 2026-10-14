// Shared store logic for every page: catalog lookups, the bag, order storage,
// and the header and footer.
// This file contains no advertising or measurement code.
(function () {
  "use strict";

  var catalog = window.NM_CATALOG;
  var CART_KEY = "nm_cart";
  var ORDER_KEY = "nm_last_order";
  var TAX_RATE = 0.08; // flat demo rate

  // ---------- Catalog ----------

  // Every purchasable variant gets its own item ID:
  //   sizes and colors  -> NM-RUN-001-BLK-M
  //   colors only       -> NM-ACC-002-STL
  //   single variant    -> NM-YOG-001
  function variantId(product, colorCode, size) {
    if (product.sizes.length) return product.id + "-" + colorCode + "-" + size;
    if (product.colors.length > 1) return product.id + "-" + colorCode;
    return product.id;
  }

  var variantIndex = {};
  catalog.products.forEach(function (product) {
    product.colors.forEach(function (color) {
      var sizes = product.sizes.length ? product.sizes : [null];
      sizes.forEach(function (size) {
        var itemId = variantId(product, color.code, size);
        variantIndex[itemId] = {
          itemId: itemId,
          groupId: product.id,
          product: product,
          color: color,
          size: size,
          name: product.name,
          unitPrice: product.price,
          image: imageFor(product, color.code)
        };
      });
    });
  });

  function getProduct(id) {
    return catalog.products.filter(function (p) { return p.id === id; })[0] || null;
  }

  function getCategory(id) {
    return catalog.categories.filter(function (c) { return c.id === id; })[0] || null;
  }

  function productsIn(categoryId) {
    return catalog.products.filter(function (p) { return p.category === categoryId; });
  }

  function getVariant(itemId) {
    return variantIndex[itemId] || null;
  }

  function imageFor(product, colorCode) {
    return "images/" + product.id + "-" + colorCode + ".svg";
  }

  function productUrl(product, itemId) {
    var url = "product.html?id=" + encodeURIComponent(product.id);
    if (itemId) url += "&variant=" + encodeURIComponent(itemId);
    return url;
  }

  function variantLabel(variant) {
    var parts = [];
    if (variant.product.colors.length > 1 || variant.product.sizes.length) parts.push(variant.color.name);
    if (variant.size) parts.push("Size " + variant.size);
    return parts.join(" / ");
  }

  // ---------- Formatting and helpers ----------

  var moneyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: catalog.currency });

  function money(cents) {
    return moneyFormat.format(cents / 100);
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  // ---------- Bag ----------

  function readCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return raw.filter(function (line) { return variantIndex[line.itemId] && line.quantity > 0; });
    } catch (err) {
      return [];
    }
  }

  function writeCart(lines) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch (err) { /* storage unavailable */ }
    updateCartCount();
  }

  function addToCart(itemId, quantity) {
    var lines = readCart();
    var existing = lines.filter(function (l) { return l.itemId === itemId; })[0];
    if (existing) existing.quantity += quantity;
    else lines.push({ itemId: itemId, quantity: quantity });
    writeCart(lines);
    return toLine({ itemId: itemId, quantity: quantity }); // the line that was just added
  }

  function setQuantity(itemId, quantity) {
    var lines = readCart().map(function (l) {
      return l.itemId === itemId ? { itemId: itemId, quantity: quantity } : l;
    }).filter(function (l) { return l.quantity > 0; });
    writeCart(lines);
  }

  function removeFromCart(itemId) {
    writeCart(readCart().filter(function (l) { return l.itemId !== itemId; }));
  }

  function clearCart() {
    writeCart([]);
  }

  // A bag or order line with everything a page needs to display it.
  function toLine(line) {
    var v = variantIndex[line.itemId];
    return {
      itemId: v.itemId,
      groupId: v.groupId,
      name: v.name,
      category: v.product.category,
      color: v.color.name,
      size: v.size,
      label: variantLabel(v),
      image: v.image,
      url: productUrl(v.product, v.itemId),
      quantity: line.quantity,
      unitPrice: v.unitPrice,
      lineTotal: v.unitPrice * line.quantity
    };
  }

  // All amounts are integers in cents.
  function cartSummary() {
    var items = readCart().map(toLine);
    var subtotal = items.reduce(function (sum, i) { return sum + i.lineTotal; }, 0);
    var tax = Math.round(subtotal * TAX_RATE);
    return {
      currency: catalog.currency,
      items: items,
      itemCount: items.reduce(function (sum, i) { return sum + i.quantity; }, 0),
      subtotal: subtotal,
      shipping: 0,
      tax: tax,
      total: subtotal + tax
    };
  }

  // ---------- Orders ----------
  // The last order is kept in sessionStorage so the confirmation page can show
  // it. It is gone when the tab closes. Nothing is sent to a server.

  function saveOrder(order) {
    try {
      sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
      return true;
    } catch (err) { return false; }
  }

  function getLastOrder() {
    try { return JSON.parse(sessionStorage.getItem(ORDER_KEY) || "null"); } catch (err) { return null; }
  }

  function newOrderId() {
    return "NM-" + Date.now().toString(36).toUpperCase();
  }

  // ---------- Header and footer ----------

  function renderChrome() {
    var header = document.getElementById("site-header");
    var footer = document.getElementById("site-footer");
    var active = document.body.getAttribute("data-page") === "category" ? param("c") : null;

    if (header) {
      header.innerHTML =
        '<div class="header-inner">' +
          '<a class="logo" href="index.html" aria-label="Nano Motion home">NANO<span class="logo-dot"></span>MOTION</a>' +
          '<nav class="main-nav" aria-label="Shop by category">' +
            catalog.categories.map(function (c) {
              return '<a href="category.html?c=' + c.id + '"' + (c.id === active ? ' class="is-active"' : "") + ">" + escapeHtml(c.name) + "</a>";
            }).join("") +
          "</nav>" +
          '<a class="bag-link" href="cart.html">Bag <span class="bag-count" id="bag-count">0</span></a>' +
        "</div>";
    }

    if (footer) {
      footer.innerHTML =
        '<div class="footer-inner">' +
          '<div><div class="logo logo-small">NANO<span class="logo-dot"></span>MOTION</div>' +
          '<p class="muted">Premium activewear for running, training, and yoga.</p></div>' +
          '<div class="footer-links">' +
            catalog.categories.map(function (c) {
              return '<a href="category.html?c=' + c.id + '">' + escapeHtml(c.name) + "</a>";
            }).join("") +
          "</div>" +
          '<p class="muted footer-note">&copy; 2026 Nano Motion. All rights reserved.</p>' +
        "</div>";
    }

    updateCartCount();
  }

  function updateCartCount() {
    var el = document.getElementById("bag-count");
    if (!el) return;
    var count = readCart().reduce(function (sum, l) { return sum + l.quantity; }, 0);
    el.textContent = count;
    el.classList.toggle("has-items", count > 0);
  }

  // A product card used on the home and category pages.
  function productCard(product) {
    var firstColor = product.colors[0];
    var dots = product.colors.length > 1
      ? '<span class="card-dots">' + product.colors.map(function (c) {
          return '<span class="dot" style="background:' + c.hex + '" title="' + escapeHtml(c.name) + '"></span>';
        }).join("") + "</span>"
      : "";
    return (
      '<a class="product-card" href="' + productUrl(product) + '">' +
        '<span class="card-image"><img src="' + imageFor(product, firstColor.code) + '" alt="' + escapeHtml(product.name) + '" loading="lazy"></span>' +
        '<span class="card-name">' + escapeHtml(product.name) + "</span>" +
        '<span class="card-meta"><span class="card-price">' + money(product.price) + "</span>" + dots + "</span>" +
      "</a>"
    );
  }

  window.NM = {
    catalog: catalog,
    getProduct: getProduct,
    getCategory: getCategory,
    productsIn: productsIn,
    getVariant: getVariant,
    variantId: variantId,
    variantLabel: variantLabel,
    imageFor: imageFor,
    productUrl: productUrl,
    productCard: productCard,
    money: money,
    param: param,
    escapeHtml: escapeHtml,
    cart: {
      read: readCart,
      add: addToCart,
      setQuantity: setQuantity,
      remove: removeFromCart,
      clear: clearCart,
      summary: cartSummary
    },
    orders: {
      save: saveOrder,
      last: getLastOrder,
      newId: newOrderId
    },
    renderChrome: renderChrome
  };

  renderChrome();
})();
