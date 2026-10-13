// Reusable customer normalization and hashing for the OpenAI Measurement Pixel.
window.NMUserData = (function () {
  "use strict";

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizePhone(countryCode, number) {
    var code = String(countryCode || "").replace(/\D/g, "").replace(/^0+/, "");
    var nationalNumber = String(number || "").replace(/\D/g, "").replace(/^0+/, "");
    if (!code || !nationalNumber) return "";
    var phone = code + nationalNumber;
    return /^\d{8,15}$/.test(phone) ? phone : "";
  }

  // First and last names use the same rule: keep accents and non-ASCII punctuation.
  function normalizeName(value) {
    return String(value || "").toLowerCase().replace(/[\s\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/g, "");
  }

  async function sha256(value) {
    var bytes = new TextEncoder().encode(value);
    var digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  async function buildUserData(customer) {
    if (!window.crypto || !window.crypto.subtle) throw new Error("SHA-256 is unavailable.");
    customer = customer || {};
    var user = {};
    var identifiers = {
      email_sha256: normalizeEmail(customer.email),
      phone_number_sha256: normalizePhone(customer.phoneCountryCode, customer.phone),
      first_name_sha256: normalizeName(customer.firstName),
      last_name_sha256: normalizeName(customer.lastName)
    };

    await Promise.all(Object.keys(identifiers).map(async function (field) {
      if (identifiers[field]) user[field] = await sha256(identifiers[field]);
    }));

    var location = {
      city: customer.city,
      region: customer.region,
      postal_code: customer.postalCode,
      country: customer.country
    };
    Object.keys(location).forEach(function (field) {
      var value = String(location[field] || "").trim();
      if (value) user[field] = value;
    });
    return user;
  }

  return {
    normalizeEmail: normalizeEmail,
    normalizePhone: normalizePhone,
    normalizeName: normalizeName,
    sha256: sha256,
    buildUserData: buildUserData
  };
})();
