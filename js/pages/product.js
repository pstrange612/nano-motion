// Product page: product.html?id=NM-RUN-001 (optionally &variant=NM-RUN-001-BLK-M)
(function () {
  "use strict";

  var main = document.getElementById("main");
  var product = NM.getProduct(NM.param("id"));

  if (!product) {
    main.innerHTML =
      '<section class="section empty-state">' +
        "<h1>We couldn't find that product</h1>" +
        '<a class="btn btn-dark" href="index.html">Back to home</a>' +
      "</section>";
    return;
  }

  var category = NM.getCategory(product.category);
  var hasSizes = product.sizes.length > 0;
  var hasColors = product.colors.length > 1;

  // The page opens on a color (the first one, as if the shopper clicked that
  // product), but the size is never prefilled: it has to be chosen before
  // adding to the bag. A link that names a variant (from the bag, for example)
  // opens with that variant chosen.
  var requested = NM.getVariant(NM.param("variant"));
  if (requested && requested.groupId !== product.id) requested = null;
  var state = {
    colorCode: requested ? requested.color.code : product.colors[0].code,
    size: requested ? requested.size : null,
    quantity: 1
  };

  // The chosen variant, or null while a size is still missing.
  function selectedVariant() {
    if (hasSizes && !state.size) return null;
    return NM.getVariant(NM.variantId(product, state.colorCode, state.size));
  }

  document.title = product.name + " | Nano Motion";

  main.innerHTML =
    '<nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span>' +
      '<a href="category.html?c=' + category.id + '">' + NM.escapeHtml(category.name) + "</a><span>/</span>" +
      NM.escapeHtml(product.name) + "</nav>" +
    '<section class="product-layout">' +
      '<div class="product-gallery"><img id="product-image" src="" alt="' + NM.escapeHtml(product.name) + '"></div>' +
      '<div class="product-info">' +
        "<h1>" + NM.escapeHtml(product.name) + "</h1>" +
        '<p class="product-price">' + NM.money(product.price) + "</p>" +
        (hasColors
          ? '<div class="option-group"><div class="option-label">Color <span id="color-name"></span></div>' +
            '<div class="swatches" id="swatches">' +
              product.colors.map(function (c) {
                return '<button type="button" class="swatch" data-color="' + c.code + '" style="--swatch:' + c.hex +
                  '" aria-label="' + NM.escapeHtml(c.name) + '"></button>';
              }).join("") +
            "</div></div>"
          : "") +
        (hasSizes
          ? '<div class="option-group"><div class="option-label">Size <span id="size-name"></span></div>' +
            '<div class="sizes" id="sizes">' +
              product.sizes.map(function (s) {
                return '<button type="button" class="size-btn" data-size="' + s + '">' + s + "</button>";
              }).join("") +
            "</div></div>"
          : "") +
        '<div class="option-group"><div class="option-label">Quantity</div>' +
          '<div class="stepper">' +
            '<button type="button" id="qty-down" aria-label="Decrease quantity">&minus;</button>' +
            '<span id="qty-value">1</span>' +
            '<button type="button" id="qty-up" aria-label="Increase quantity">+</button>' +
          "</div></div>" +
        '<p class="form-error option-error" id="option-error" hidden></p>' +
        '<button type="button" class="btn btn-dark btn-block" id="add-to-bag">Add to bag</button>' +
        '<p class="muted small item-id" id="item-id"></p>' +
        '<p class="product-description">' + NM.escapeHtml(product.description) + "</p>" +
        '<ul class="feature-list">' +
          product.features.map(function (f) { return "<li>" + NM.escapeHtml(f) + "</li>"; }).join("") +
        "</ul>" +
        '<p class="muted small">Free shipping and 30-day returns on every order.</p>' +
      "</div>" +
    "</section>" +
    '<div class="drawer-backdrop" id="drawer-backdrop" hidden></div>' +
    '<aside class="drawer" id="drawer" aria-label="Added to bag" hidden></aside>';

  var errorBox = document.getElementById("option-error");

  function refresh() {
    var variant = selectedVariant();
    document.getElementById("product-image").src = NM.imageFor(product, state.colorCode);
    document.getElementById("qty-value").textContent = state.quantity;
    document.getElementById("item-id").textContent = variant
      ? "Item ID: " + variant.itemId
      : "Product ID: " + product.id + " (choose a size to see the item ID)";

    if (hasColors) {
      var color = product.colors.filter(function (c) { return c.code === state.colorCode; })[0];
      document.getElementById("color-name").textContent = color ? color.name : "";
      Array.prototype.forEach.call(document.querySelectorAll(".swatch"), function (el) {
        el.classList.toggle("is-selected", el.getAttribute("data-color") === state.colorCode);
      });
    }
    if (hasSizes) {
      document.getElementById("size-name").textContent = state.size || "";
      Array.prototype.forEach.call(document.querySelectorAll(".size-btn"), function (el) {
        el.classList.toggle("is-selected", el.getAttribute("data-size") === state.size);
      });
    }
  }

  main.addEventListener("click", function (event) {
    var swatch = event.target.closest(".swatch");
    var sizeBtn = event.target.closest(".size-btn");
    if (swatch) state.colorCode = swatch.getAttribute("data-color");
    if (sizeBtn) state.size = sizeBtn.getAttribute("data-size");
    if (swatch || sizeBtn) {
      errorBox.hidden = true;
      refresh();
    }
  });

  document.getElementById("qty-down").addEventListener("click", function () {
    state.quantity = Math.max(1, state.quantity - 1);
    refresh();
  });
  document.getElementById("qty-up").addEventListener("click", function () {
    state.quantity = Math.min(10, state.quantity + 1);
    refresh();
  });

  // ---------- Added-to-bag drawer ----------

  var drawer = document.getElementById("drawer");
  var backdrop = document.getElementById("drawer-backdrop");

  function closeDrawer() {
    drawer.hidden = true;
    backdrop.hidden = true;
  }

  function openDrawer(line) {
    var summary = NM.cart.summary();
    drawer.innerHTML =
      '<button type="button" class="drawer-close" id="drawer-close" aria-label="Close">&times;</button>' +
      "<h2>Added to bag</h2>" +
      '<div class="drawer-item">' +
        '<img src="' + line.image + '" alt="">' +
        "<div><strong>" + NM.escapeHtml(line.name) + "</strong>" +
          (line.label ? '<span class="muted">' + NM.escapeHtml(line.label) + "</span>" : "") +
          '<span class="muted">Qty ' + line.quantity + "</span>" +
          "<span>" + NM.money(line.lineTotal) + "</span></div>" +
      "</div>" +
      '<div class="drawer-total"><span>Subtotal (' + summary.itemCount + (summary.itemCount === 1 ? " item" : " items") +
        ")</span><strong>" + NM.money(summary.subtotal) + "</strong></div>" +
      '<div class="drawer-actions">' +
        '<button type="button" class="btn btn-outline" id="drawer-continue">Continue shopping</button>' +
        '<a class="btn btn-dark" href="cart.html">View bag</a>' +
      "</div>";
    drawer.hidden = false;
    backdrop.hidden = false;
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);
    document.getElementById("drawer-continue").addEventListener("click", closeDrawer);
  }

  backdrop.addEventListener("click", closeDrawer);

  document.getElementById("add-to-bag").addEventListener("click", function () {
    var variant = selectedVariant();
    if (!variant) {
      errorBox.textContent = "Please select a size.";
      errorBox.hidden = false;
      return;
    }

    var line = NM.cart.add(variant.itemId, state.quantity);
    // MEASUREMENT: an item was added to the bag. In scope: line (itemId, name, quantity,
    // unitPrice, lineTotal) and NM.catalog.currency.
    oaiq("measure", "items_added", {
      type: "contents",
      amount: line.lineTotal,
      currency: "USD",
      contents: [
        {
          id: line.itemId,
          name: line.name,
          content_type: "product",
          quantity: line.quantity,
          amount: line.unitPrice,
          currency: "USD"
        }
      ]
    });

    openDrawer(line);
    state.quantity = 1;
    refresh();
  });

  refresh();

  // MEASUREMENT: a product page has loaded. In scope: product (id, name, category, price),
  // state.colorCode (the color shown), and selectedVariant(), which is null until the
  // shopper has chosen a size.
  oaiq("measure", "page_viewed", {
    type: "contents",
    contents: [
      { id: "product-" + product.id, name: product.name + " product page", content_type: "page" }
    ]
  });

  oaiq("measure", "contents_viewed", {
    type: "contents",
    contents: [
      {
        id: product.id,
        name: product.name,
        content_type: "product",
        amount: product.price,
        currency: "USD"
      }
    ]
  });
})();
