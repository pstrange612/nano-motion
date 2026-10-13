// Bag page: review items, change quantities, remove items, go to checkout.
(function () {
  "use strict";

  var main = document.getElementById("main");

  function render() {
    var summary = NM.cart.summary();

    if (!summary.items.length) {
      main.innerHTML =
        '<section class="section empty-state">' +
          "<h1>Your bag is empty</h1>" +
          '<p class="muted">Add something you\'ll move in.</p>' +
          '<a class="btn btn-dark" href="category.html?c=running">Shop Running</a>' +
        "</section>";
      return;
    }

    main.innerHTML =
      '<section class="section">' +
        '<div class="cart-head"><h1>Your bag</h1>' +
          '<button type="button" class="link-btn" id="clear-bag">Clear bag</button></div>' +
        '<div class="cart-layout">' +
          '<div class="cart-lines">' +
            summary.items.map(function (item) {
              return (
                '<div class="cart-line" data-item="' + item.itemId + '">' +
                  '<a class="cart-thumb" href="' + item.url + '"><img src="' + item.image + '" alt=""></a>' +
                  '<div class="cart-line-info">' +
                    '<a class="cart-line-name" href="' + item.url + '">' + NM.escapeHtml(item.name) + "</a>" +
                    (item.label ? '<span class="muted">' + NM.escapeHtml(item.label) + "</span>" : "") +
                    '<span class="muted small">Item ID: ' + item.itemId + "</span>" +
                    '<div class="cart-line-controls">' +
                      '<div class="stepper stepper-small">' +
                        '<button type="button" data-action="down" aria-label="Decrease quantity">&minus;</button>' +
                        "<span>" + item.quantity + "</span>" +
                        '<button type="button" data-action="up" aria-label="Increase quantity">+</button>' +
                      "</div>" +
                      '<button type="button" class="link-btn" data-action="remove">Remove</button>' +
                    "</div>" +
                  "</div>" +
                  '<div class="cart-line-price">' + NM.money(item.lineTotal) + "</div>" +
                "</div>"
              );
            }).join("") +
          "</div>" +
          '<aside class="summary-card">' +
            "<h2>Order summary</h2>" +
            '<div class="summary-row"><span>Subtotal</span><span>' + NM.money(summary.subtotal) + "</span></div>" +
            '<div class="summary-row"><span>Shipping</span><span>Free</span></div>' +
            '<div class="summary-row"><span>Estimated tax</span><span>' + NM.money(summary.tax) + "</span></div>" +
            '<div class="summary-row summary-total"><span>Total</span><span>' + NM.money(summary.total) + "</span></div>" +
            '<a class="btn btn-dark btn-block" href="checkout.html" id="go-to-checkout">Checkout</a>' +
            '<a class="btn btn-outline btn-block" href="index.html">Continue shopping</a>' +
          "</aside>" +
        "</div>" +
      "</section>";
  }

  main.addEventListener("click", function (event) {
    if (event.target.id === "clear-bag") {
      NM.cart.clear();
      render();
      return;
    }
    var control = event.target.closest("[data-action]");
    if (!control) return;
    var line = control.closest(".cart-line");
    var itemId = line.getAttribute("data-item");
    var current = NM.cart.read().filter(function (l) { return l.itemId === itemId; })[0];
    if (!current) return;

    var action = control.getAttribute("data-action");
    if (action === "remove") NM.cart.remove(itemId);
    if (action === "up") NM.cart.setQuantity(itemId, Math.min(10, current.quantity + 1));
    if (action === "down") NM.cart.setQuantity(itemId, current.quantity - 1);
    render();
  });

  render();
})();
