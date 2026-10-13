// Home page: hero, category tiles, and a featured product row.
(function () {
  "use strict";

  var main = document.getElementById("main");
  var catalog = NM.catalog;

  var featuredIds = ["NM-RUN-002", "NM-OUT-001", "NM-YOG-002", "NM-TRN-002"];
  var featured = featuredIds.map(NM.getProduct).filter(Boolean);

  var tiles = catalog.categories.map(function (category) {
    var lead = NM.productsIn(category.id)[0];
    return (
      '<a class="category-tile" href="category.html?c=' + category.id + '">' +
        '<img src="' + NM.imageFor(lead, lead.colors[0].code) + '" alt="" loading="lazy">' +
        '<span class="tile-label">' + NM.escapeHtml(category.name) + "</span>" +
      "</a>"
    );
  }).join("");

  main.innerHTML =
    '<section class="hero">' +
      '<div class="hero-copy">' +
        '<p class="eyebrow">New season</p>' +
        "<h1>Built for the next mile.</h1>" +
        '<p class="hero-sub">Running, training, and yoga essentials engineered to move with you.</p>' +
        '<div class="hero-actions">' +
          '<a class="btn btn-light" href="category.html?c=running">Shop Running</a>' +
          '<a class="btn btn-ghost" href="category.html?c=outerwear">Explore Outerwear</a>' +
        "</div>" +
      "</div>" +
      '<svg class="hero-art" viewBox="0 0 600 400" aria-hidden="true" preserveAspectRatio="xMidYMid slice">' +
        '<g fill="none" stroke="currentColor" stroke-linecap="round">' +
          '<path d="M300 440 C 380 340, 440 300, 505 215 S 600 80, 650 30" stroke-width="26" opacity="0.95"/>' +
          '<path d="M390 440 C 450 360, 505 325, 565 255 S 630 180, 660 150" stroke-width="10" opacity="0.55"/>' +
          '<path d="M215 440 C 320 320, 385 265, 450 175 S 555 45, 600 -20" stroke-width="4" opacity="0.4"/>' +
        "</g>" +
      "</svg>" +
    "</section>" +

    '<section class="section">' +
      '<div class="section-head"><h2>Shop by activity</h2></div>' +
      '<div class="category-grid">' + tiles + "</div>" +
    "</section>" +

    '<section class="section">' +
      '<div class="section-head"><h2>Featured</h2></div>' +
      '<div class="product-grid">' + featured.map(NM.productCard).join("") + "</div>" +
    "</section>";

  // MEASUREMENT: the home page has loaded.
})();
