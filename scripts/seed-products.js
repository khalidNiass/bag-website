const { MongoClient } = require("mongodb");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "bag-website";
const MONGODB_DIRECT_HOSTS = process.env.MONGODB_DIRECT_HOSTS || "";
const MONGODB_REPLICA_SET = process.env.MONGODB_REPLICA_SET || "";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

function buildMongoUri() {
  if (!MONGODB_DIRECT_HOSTS || !MONGODB_URI.startsWith("mongodb+srv://")) {
    return MONGODB_URI;
  }

  const srvUrl = new URL(MONGODB_URI);
  const params = new URLSearchParams(srvUrl.search);
  params.set("tls", "true");
  params.set("authSource", params.get("authSource") || "admin");
  if (MONGODB_REPLICA_SET) {
    params.set("replicaSet", MONGODB_REPLICA_SET);
  }

  const credentials = srvUrl.username
    ? `${srvUrl.username}${srvUrl.password ? `:${srvUrl.password}` : ""}@`
    : "";
  const dbPath = srvUrl.pathname && srvUrl.pathname !== "/" ? srvUrl.pathname : `/${MONGODB_DB_NAME}`;

  return `mongodb://${credentials}${MONGODB_DIRECT_HOSTS}${dbPath}?${params.toString()}`;
}

function image(label, bg = "111827", fg = "f8fafc") {
  return `https://placehold.co/900x1100/${bg}/${fg}.png?text=${encodeURIComponent(label)}`;
}

const now = new Date();

const products = [
  {
    id: "hh-monogram-tote",
    name: "Monogram City Tote",
    price: 82000,
    category: "bags",
    gender: "women",
    badge: "NEW",
    colors: ["Black", "Brown", "Cream"],
    images: [image("Monogram City Tote", "1f2937", "f3d08a")],
    description: "Structured daily tote with a polished finish, roomy interior, and refined gold-tone details.",
  },
  {
    id: "hh-aurora-heel",
    name: "Aurora Satin Heel",
    price: 64000,
    category: "shoes",
    gender: "women",
    badge: "HOT",
    colors: ["Black", "Gold", "Red"],
    images: [image("Aurora Satin Heel", "3b0a24", "fde68a")],
    description: "Elegant evening heel with a sculpted silhouette and soft satin-inspired finish.",
  },
  {
    id: "hh-heritage-watch",
    name: "Heritage Steel Watch",
    price: 95000,
    category: "watches",
    gender: "men",
    badge: "HOT",
    colors: ["Silver", "Black", "Gold"],
    images: [image("Heritage Steel Watch", "0f172a", "e5e7eb")],
    description: "Clean stainless-style timepiece with a confident profile for everyday wear.",
  },
  {
    id: "hh-velvet-crossbody",
    name: "Velvet Crossbody Bag",
    price: 56000,
    category: "bags",
    gender: "women",
    badge: "NEW",
    colors: ["Green", "Black", "Burgundy"],
    images: [image("Velvet Crossbody Bag", "064e3b", "fef3c7")],
    description: "Compact crossbody bag with a soft luxe feel, chain detail, and secure flap closure.",
  },
  {
    id: "hh-court-sneaker",
    name: "Court Luxe Sneaker",
    price: 72000,
    category: "shoes",
    gender: "men",
    badge: "NEW",
    colors: ["White", "Black", "Navy"],
    images: [image("Court Luxe Sneaker", "f8fafc", "111827")],
    description: "Premium low-top sneaker built for clean styling, comfort, and repeat wear.",
  },
  {
    id: "hh-signature-bomber",
    name: "Signature Bomber Jacket",
    price: 118000,
    category: "clothes",
    gender: "men",
    badge: "HOT",
    colors: ["Black", "Olive", "Navy"],
    images: [image("Signature Bomber Jacket", "111827", "c5a059")],
    description: "Modern bomber jacket with crisp ribbed trims and a sharp street-luxury profile.",
  },
  {
    id: "hh-pearl-bracelet",
    name: "Pearl Accent Bracelet",
    price: 38000,
    category: "accessories",
    gender: "women",
    badge: "NEW",
    colors: ["Gold", "Silver"],
    images: [image("Pearl Accent Bracelet", "faf7ef", "111827")],
    description: "Minimal bracelet with pearl-inspired accents for a subtle finishing touch.",
  },
  {
    id: "hh-nova-shades",
    name: "Nova Frame Sunglasses",
    price: 42000,
    category: "accessories",
    gender: "unisex",
    badge: "HOT",
    colors: ["Black", "Tortoise", "Gold"],
    images: [image("Nova Frame Sunglasses", "111111", "f8fafc")],
    description: "Bold sunglasses with a flattering frame shape and polished everyday attitude.",
  },
  {
    id: "hh-minimalist-watch",
    name: "Minimalist Leather Watch",
    price: 76000,
    category: "watches",
    gender: "unisex",
    badge: "NEW",
    colors: ["Brown", "Black"],
    images: [image("Minimalist Leather Watch", "422006", "fef3c7")],
    description: "Slim watch with a leather-style strap and understated face for clean styling.",
  },
  {
    id: "hh-evening-clutch",
    name: "Evening Crystal Clutch",
    price: 68000,
    category: "bags",
    gender: "women",
    badge: "HOT",
    colors: ["Silver", "Gold", "Black"],
    images: [image("Evening Crystal Clutch", "27272a", "e5e7eb")],
    description: "Statement clutch designed for occasions, with a compact shape and luminous finish.",
  },
  {
    id: "hh-tailored-shirt",
    name: "Tailored Resort Shirt",
    price: 45000,
    category: "clothes",
    gender: "men",
    badge: "",
    colors: ["White", "Blue", "Black"],
    images: [image("Tailored Resort Shirt", "dbeafe", "111827")],
    description: "Lightweight tailored shirt with relaxed polish for warm days and sharp evenings.",
  },
  {
    id: "hh-classic-loafer",
    name: "Classic Penny Loafer",
    price: 88000,
    category: "shoes",
    gender: "men",
    badge: "HOT",
    colors: ["Black", "Brown"],
    images: [image("Classic Penny Loafer", "292524", "fde68a")],
    description: "Timeless loafer with a refined finish, made for smart casual and formal looks.",
  },
].map((product) => ({
  ...product,
  updatedAt: now,
}));

async function main() {
  if (process.argv.includes("--dry-run")) {
    console.log(`Dry run: ${products.length} products ready to seed.`);
    console.log(products.map((product) => `${product.id}: ${product.name}`).join("\n"));
    return;
  }

  const client = new MongoClient(buildMongoUri());
  await client.connect();
  const collection = client.db(MONGODB_DB_NAME).collection("products");

  const operations = products.map((product) => ({
    updateOne: {
      filter: { id: product.id },
      update: {
        $set: product,
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(operations);
  const total = await collection.countDocuments({});

  console.log(`Seeded ${products.length} products.`);
  console.log(`Inserted: ${result.upsertedCount}, updated: ${result.modifiedCount}.`);
  console.log(`Products in database: ${total}.`);

  await client.close();
}

main().catch((err) => {
  console.error("Product seed failed:", err);
  process.exit(1);
});
