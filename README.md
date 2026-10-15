# Nano Motion demo store

A static storefront for Nano Motion, a fictional activewear retailer, instrumented with the
[OpenAI Measurement Pixel](https://developers.openai.com/ads/measurement-pixel).

**Live site:** https://pstrange612.github.io/nano-motion/

This is a demo. No real orders are placed and no payment is taken. The bag and orders are stored
in the browser.

## Tech stack

- Plain HTML, CSS, and JavaScript. No framework, no bundler, no build step.
- Hosted on GitHub Pages. All links are relative, so the site runs under any sub-path.
- Python 3 for the local server and asset generation. Node.js 18+ only for the tests.

## Project structure

```
├── index.html, category.html, product.html,      Six pages, each loading the Pixel in <head>
│   cart.html, checkout.html, order-confirmation.html
├── js/
│   ├── products.js        Product catalog (single source of truth; prices in cents)
│   ├── store.js           Catalog lookups, bag, order storage, header and footer
│   ├── user-data.js       Customer data normalization and SHA-256 hashing
│   └── pages/             One script per page, including that page's Pixel calls
├── css/styles.css
├── images/                Generated product illustrations
├── catalog/               Example product feed (CSV), one row per variant
├── tools/
│   ├── serve.py           Local server
│   └── build_assets.py    Regenerates images/ and catalog/ from js/products.js
└── tests/                 Tests for hashing and duplicate-event guards
```

## Run locally

```bash
python3 tools/serve.py
```

Open http://localhost:4173. To use a different port, pass it as an argument:
`python3 tools/serve.py 4174`.

## Pixel implementation

### Base code

Every page loads the Pixel near the top of `<head>` using the documented asynchronous loader,
then calls `oaiq("init", { pixelId, debug })`. Calls made before the SDK finishes loading are
queued.

### Events

Each `oaiq("measure", ...)` call is written directly in its page script, marked with a
`MEASUREMENT:` comment. There is no data layer or wrapper, so each event can be read where it
fires. Only [standard events](https://developers.openai.com/ads/supported-events) and documented
Pixel fields are used, and every event has `type: "contents"`.

| Trigger | Event | Payload | File |
|---|---|---|---|
| Home, category, or bag page loads | `page_viewed` | One `page` item (`home`, `category-<id>`, `cart`) | `home.js`, `category.js`, `cart.js` |
| Product page loads | `page_viewed`, then `contents_viewed` | Page item; then the parent product ID, name, unit price | `product.js` |
| Add to bag succeeds | `items_added` | Variant ID, quantity, unit price; event amount = unit price × quantity | `product.js` |
| Checkout page loads with items | `checkout_started` | All bag items; event amount = subtotal | `checkout.js` |
| Confirmation page loads | `order_created` | All order items; event amount = subtotal; customer data | `confirmation.js` |

### Data conventions

- **Amounts** are integers in minor units (`4800` = $48.00), always with a currency code taken
  from the catalog. Item `amount` is the unit price; `quantity` is separate.
- **Event amounts** for checkout and purchase are the subtotal, excluding tax and shipping.
- **Item IDs** are variant IDs (`NM-RUN-002-COB-M`) that match `item_id` in the product feed.
  `contents_viewed` uses the parent product ID (`NM-RUN-002`, the feed's `group_id`) because no
  size is selected when the page loads.
- **Event IDs** are not set; the SDK generates them. A shared `event_id` is only needed to
  deduplicate against server-side Conversions API events, which this site does not send.

### Duplicate guards

- `order_created` is sent once per order ID. A `sessionStorage` marker stops a reload of the
  confirmation page from resending it.
- `checkout_started` is not resent when checkout is reloaded with the same bag. A changed bag
  sends it again.
- If a marker can't be read or written, the event is skipped rather than risk a duplicate.

### Customer data

Automatic advanced matching is disabled for this Pixel, so the confirmation page supplies
customer data itself:

1. `js/user-data.js` normalizes email, phone, first name, and last name as the
   [docs](https://developers.openai.com/ads/measurement-pixel) specify, then hashes them with
   SHA-256 (`crypto.subtle`, lowercase hex). City, region, postal code, and two-letter country are
   sent unhashed. Empty or invalid fields are omitted.
2. `confirmation.js` calls `oaiq("init", { user })` to add the user data to the already
   initialized Pixel, then sends `order_created`.

Raw email, phone, and names are never passed to the Pixel. If hashing is unavailable, the
purchase is still sent, without user data.

### Debug mode

Add `?debug=1` to any URL to turn on the SDK's console logging. The setting is saved in
`sessionStorage` and carries across pages in the same tab; `?debug=0` turns it off. Debug mode
only adds logging; events are sent either way.

## Verify on the live site

1. In a private Chrome window, open
   https://pstrange612.github.io/nano-motion/index.html?debug=1 and open DevTools.
2. **Console:** include the **Verbose** level and filter by `oaiq` to see `event queued` logs.
3. **Network:** filter by `bzr`, select an `events?pid=...` POST, and open **Payload**. Event
   names are in `events[].type`; payloads are in `events[].data`. One request can carry several
   events.

| Action | Expected |
|---|---|
| **Running** → **AeroLite Run Tee** | `page_viewed`, then `contents_viewed` for `NM-RUN-002`, `4800` USD |
| **Cobalt**, size **M**, quantity 2 → **Add to bag** | `items_added`: `NM-RUN-002-COB-M`, quantity `2`, amount `9600` |
| **View bag** → **Checkout** | `page_viewed` (`cart`), then `checkout_started`, amount `9600` |
| **Fill test details** → **Place order** | `order_created`, amount `9600`, with a `user` object |
| Reload the confirmation page | No new events |

To simulate an ad click, open `index.html?oppref=demo-click-123`. The SDK stores the value in a
first-party `__oppref` cookie and includes `oppref` on later requests. The value is made up, so
this shows the capture only, not a real attributed click.

## Tests

```bash
node --test tests/user-data.test.cjs
```

The tests cover normalization and hashing, phone input handling, checkout and confirmation
reload guards, and storage failures. They don't send Pixel requests.

## Product feed

`catalog/nano-motion-catalog.csv` is an example feed in OpenAI's product file format, one row per
variant, using the same item IDs as the site. Its URLs point to a stand-in domain
(`nanomotion.example`). To regenerate it along with the images:

```bash
python3 tools/build_assets.py
```

## Not implemented

- Consent handling (`oaiq("consent", ...)`). The Pixel runs with its default consent setting.
- Server-side events through the Conversions API.
