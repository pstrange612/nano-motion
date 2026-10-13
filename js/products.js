// Nano Motion product catalog. Single source of truth for the site and for the
// catalog CSV (tools/build_assets.py reads this file).
// Prices are integers in cents. Everything after the "=" is strict JSON.
window.NM_CATALOG = {
  "brand": "Nano Motion",
  "currency": "USD",
  "categories": [
    { "id": "running", "name": "Running", "tagline": "Light, fast layers for every mile." },
    { "id": "training", "name": "Training", "tagline": "Built to move through every rep." },
    { "id": "outerwear", "name": "Outerwear", "tagline": "Weather protection without the weight." },
    { "id": "accessories", "name": "Accessories", "tagline": "The pieces that carry the rest." },
    { "id": "yoga", "name": "Yoga", "tagline": "Soft, steady essentials for the mat." }
  ],
  "products": [
    {
      "id": "NM-RUN-001",
      "category": "running",
      "name": "Stride Tempo Short 5\"",
      "art": "short",
      "price": 5800,
      "description": "A lightweight running short with a 5-inch inseam, a zip pocket at the back, and a liner-free build for easy layering.",
      "features": ["Quick-dry woven fabric", "Secure zip pocket", "Reflective logo"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" },
        { "code": "FOR", "name": "Forest", "hex": "#2f5d46" },
        { "code": "SLT", "name": "Slate", "hex": "#5f6b78" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-RUN-002",
      "category": "running",
      "name": "AeroLite Run Tee",
      "art": "tee",
      "price": 4800,
      "description": "A breathable short-sleeve tee with mesh ventilation zones and flat seams that stay comfortable over long distances.",
      "features": ["Mesh ventilation", "Flat-lock seams", "Odor-resistant finish"],
      "colors": [
        { "code": "WHT", "name": "White", "hex": "#f7f5ef" },
        { "code": "COB", "name": "Cobalt", "hex": "#2447c9" },
        { "code": "EMB", "name": "Ember", "hex": "#d9502b" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-RUN-003",
      "category": "running",
      "name": "Cadence Run Tight",
      "art": "pants",
      "price": 8800,
      "description": "A supportive full-length tight with a drawcord waist and two drop-in pockets sized for a phone.",
      "features": ["Four-way stretch", "Drop-in phone pockets", "Drawcord waist"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" },
        { "code": "NVY", "name": "Navy", "hex": "#1f2a44" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-TRN-001",
      "category": "training",
      "name": "Forge Training Tee",
      "art": "tee",
      "price": 4400,
      "description": "A durable training tee with a relaxed fit and abrasion-resistant shoulders for barbell work.",
      "features": ["Abrasion-resistant shoulders", "Relaxed fit", "Sweat-wicking knit"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" },
        { "code": "STN", "name": "Stone", "hex": "#b9b1a3" },
        { "code": "RED", "name": "Red", "hex": "#c22d2d" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-TRN-002",
      "category": "training",
      "name": "Core Flex Jogger",
      "art": "jogger",
      "price": 9800,
      "description": "A tapered jogger in a soft stretch knit, with zip hand pockets and ribbed cuffs.",
      "features": ["Tapered leg", "Zip hand pockets", "Ribbed cuffs"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" },
        { "code": "GRA", "name": "Graphite", "hex": "#4a4d53" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-TRN-003",
      "category": "training",
      "name": "Lift Tank",
      "art": "tank",
      "price": 3800,
      "description": "A lightweight tank with deep armholes for full range of motion and a curved hem.",
      "features": ["Deep armholes", "Curved hem", "Featherweight knit"],
      "colors": [
        { "code": "WHT", "name": "White", "hex": "#f7f5ef" },
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-OUT-001",
      "category": "outerwear",
      "name": "Stormshift Shell Jacket",
      "art": "jacket",
      "price": 16800,
      "description": "A waterproof, packable shell with sealed seams, an adjustable hood, and underarm vents.",
      "features": ["Waterproof with sealed seams", "Packs into its own pocket", "Underarm vents"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" },
        { "code": "OLV", "name": "Olive", "hex": "#5d6337" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-OUT-002",
      "category": "outerwear",
      "name": "Loft Insulated Vest",
      "art": "vest",
      "price": 12800,
      "description": "A lightly insulated vest that adds core warmth without bulk, with a soft-lined collar.",
      "features": ["Recycled insulation", "Soft-lined collar", "Two zip pockets"],
      "colors": [
        { "code": "NVY", "name": "Navy", "hex": "#1f2a44" },
        { "code": "SND", "name": "Sand", "hex": "#cdbb9a" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-ACC-001",
      "category": "accessories",
      "name": "Circuit Duffel 30L",
      "art": "duffel",
      "price": 7800,
      "description": "A 30-liter gym duffel with a ventilated shoe compartment and a padded shoulder strap.",
      "features": ["Ventilated shoe compartment", "Padded strap", "Water-resistant base"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" }
      ],
      "sizes": []
    },
    {
      "id": "NM-ACC-002",
      "category": "accessories",
      "name": "Hydra Steel Bottle 24 oz",
      "art": "bottle",
      "price": 3200,
      "description": "A double-wall insulated steel bottle that keeps drinks cold for 24 hours.",
      "features": ["Double-wall insulation", "Leakproof cap", "Fits standard cup holders"],
      "colors": [
        { "code": "STL", "name": "Steel", "hex": "#9aa3ab" },
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" }
      ],
      "sizes": []
    },
    {
      "id": "NM-ACC-003",
      "category": "accessories",
      "name": "Tempo Cap",
      "art": "cap",
      "price": 2800,
      "description": "A lightweight, one-size running cap with a moisture-wicking sweatband and an adjustable back.",
      "features": ["One size, adjustable", "Wicking sweatband", "Laser-cut vents"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" },
        { "code": "WHT", "name": "White", "hex": "#f7f5ef" }
      ],
      "sizes": []
    },
    {
      "id": "NM-YOG-001",
      "category": "yoga",
      "name": "Ground Yoga Mat 5mm",
      "art": "mat",
      "price": 8800,
      "description": "A 5 mm natural rubber mat with a grippy top layer that holds steady through a sweaty practice.",
      "features": ["5 mm cushioning", "Non-slip top layer", "Natural rubber base"],
      "colors": [
        { "code": "SGE", "name": "Sage", "hex": "#8fa58a" }
      ],
      "sizes": []
    },
    {
      "id": "NM-YOG-002",
      "category": "yoga",
      "name": "Flow Legging",
      "art": "pants",
      "price": 9400,
      "description": "A high-rise legging in a buttery, brushed fabric with a seamless waistband.",
      "features": ["High rise", "Brushed, soft-touch fabric", "Hidden waistband pocket"],
      "colors": [
        { "code": "BLK", "name": "Black", "hex": "#1c1c1f" },
        { "code": "PLM", "name": "Plum", "hex": "#5b2e4f" }
      ],
      "sizes": ["S", "M", "L"]
    },
    {
      "id": "NM-YOG-003",
      "category": "yoga",
      "name": "Balance Cork Block",
      "art": "block",
      "price": 2200,
      "description": "A dense, sustainably harvested cork block with rounded edges for a comfortable grip.",
      "features": ["Sustainably harvested cork", "Rounded edges", "Firm, stable support"],
      "colors": [
        { "code": "CRK", "name": "Cork", "hex": "#c69c6d" }
      ],
      "sizes": []
    }
  ]
};
