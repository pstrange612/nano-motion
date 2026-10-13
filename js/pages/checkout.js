// Checkout page: one page, test details only. Placing the order saves it in the
// browser and moves to the confirmation page. No payment is processed and
// nothing is sent to a server.
(function () {
  "use strict";

  var main = document.getElementById("main");
  var summary = NM.cart.summary();

  if (!summary.items.length) {
    window.location.replace("cart.html");
    return;
  }

  var TEST_DETAILS = {
    email: "taylor.test@example.com",
    firstName: "Taylor",
    lastName: "Test",
    address: "123 Main Street",
    city: "San Francisco",
    region: "CA",
    postalCode: "94107",
    country: "US"
  };

  function field(id, label, type, autocomplete, extra) {
    return (
      '<label class="field' + (extra || "") + '" for="' + id + '"><span>' + label + "</span>" +
        '<input id="' + id + '" name="' + id + '" type="' + type + '" autocomplete="' + autocomplete + '" required>' +
      "</label>"
    );
  }

  main.innerHTML =
    '<section class="section">' +
      "<h1>Checkout</h1>" +
      '<div class="checkout-layout">' +
        '<form class="checkout-form" id="checkout-form" novalidate>' +
          '<div class="form-head"><h2>Contact</h2>' +
            '<button type="button" class="link-btn" id="fill-test">Fill test details</button></div>' +
          field("email", "Email", "email", "email") +

          "<h2>Shipping</h2>" +
          '<div class="field-row">' +
            field("firstName", "First name", "text", "given-name") +
            field("lastName", "Last name", "text", "family-name") +
          "</div>" +
          field("address", "Address", "text", "street-address") +
          '<div class="field-row field-row-3">' +
            field("city", "City", "text", "address-level2") +
            field("region", "State", "text", "address-level1") +
            field("postalCode", "ZIP code", "text", "postal-code") +
          "</div>" +
          '<label class="field" for="country"><span>Country</span>' +
            '<select id="country" name="country"><option value="US">United States</option></select></label>' +
          '<p class="muted small">Arrives in 3 to 5 business days. Standard shipping is free.</p>' +

          "<h2>Payment</h2>" +
          '<div class="payment-method">' +
            '<span class="payment-radio" aria-hidden="true"></span>' +
            '<span class="payment-brand">VISA</span>' +
            '<span class="payment-number">&bull;&bull;&bull;&bull; 4242</span>' +
            '<span class="muted small">Expires 12/28</span>' +
          "</div>" +

          '<p class="form-error" id="form-error" hidden></p>' +
          '<button type="submit" class="btn btn-dark btn-block" id="place-order">Place order</button>' +
        "</form>" +

        '<aside class="summary-card">' +
          "<h2>Order summary</h2>" +
          '<div class="summary-items">' +
            summary.items.map(function (item) {
              return (
                '<div class="summary-item">' +
                  '<img src="' + item.image + '" alt="">' +
                  "<div><strong>" + NM.escapeHtml(item.name) + "</strong>" +
                    (item.label ? '<span class="muted">' + NM.escapeHtml(item.label) + "</span>" : "") +
                    '<span class="muted">Qty ' + item.quantity + "</span></div>" +
                  "<span>" + NM.money(item.lineTotal) + "</span>" +
                "</div>"
              );
            }).join("") +
          "</div>" +
          '<div class="summary-row"><span>Subtotal</span><span>' + NM.money(summary.subtotal) + "</span></div>" +
          '<div class="summary-row"><span>Shipping</span><span>Free</span></div>' +
          '<div class="summary-row"><span>Tax</span><span>' + NM.money(summary.tax) + "</span></div>" +
          '<div class="summary-row summary-total"><span>Order total</span><span>' + NM.money(summary.total) + " " + summary.currency + "</span></div>" +
        "</aside>" +
      "</div>" +
    "</section>";

  var form = document.getElementById("checkout-form");
  var emailInput = document.getElementById("email");
  var errorBox = document.getElementById("form-error");
  var lastEmailAnnounced = null;

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  // Runs once each time the shopper has entered a new, valid email address.
  function announceEmail() {
    var email = emailInput.value.trim();
    if (isEmail(email) && email !== lastEmailAnnounced) {
      lastEmailAnnounced = email;
      // MEASUREMENT: a valid email is now available. In scope: email.
    }
  }

  emailInput.addEventListener("blur", announceEmail);

  document.getElementById("fill-test").addEventListener("click", function () {
    Object.keys(TEST_DETAILS).forEach(function (key) {
      var input = document.getElementById(key);
      if (input) input.value = TEST_DETAILS[key];
    });
    errorBox.hidden = true;
    announceEmail();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var values = {};
    var missing = [];
    ["email", "firstName", "lastName", "address", "city", "region", "postalCode", "country"].forEach(function (key) {
      var input = document.getElementById(key);
      values[key] = input.value.trim();
      input.classList.toggle("has-error", !values[key]);
      if (!values[key]) missing.push(key);
    });

    if (missing.length || !isEmail(values.email)) {
      if (!missing.length) emailInput.classList.add("has-error");
      errorBox.textContent = missing.length
        ? "Please fill in every field, or use Fill test details."
        : "Please enter a valid email address.";
      errorBox.hidden = false;
      return;
    }

    announceEmail();

    var cart = NM.cart.summary();
    var order = {
      id: NM.orders.newId(),
      createdAt: new Date().toISOString(),
      currency: cart.currency,
      items: cart.items,
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      tax: cart.tax,
      total: cart.total,
      customer: {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        city: values.city,
        region: values.region,
        postalCode: values.postalCode,
        country: values.country
      }
    };

    NM.orders.save(order);
    NM.cart.clear();
    window.location.href = "order-confirmation.html?order=" + encodeURIComponent(order.id);
  });

  // MEASUREMENT: checkout has started. In scope: summary (items, itemCount, subtotal, tax, total, currency).
})();
