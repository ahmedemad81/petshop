import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import User from "./models/userModel.js";
import Product from "./models/productModel.js";
import Order from "./models/orderModel.js";

dotenv.config();

/**
 * Images from your uploads folder (from the screenshot)
 * Adjust the path format if your app serves uploads differently.
 */
const uploadImages = [
  "/uploads/image-1712653333419.jpg",
  "/uploads/image-1712653742263.jpg",
  "/uploads/image-1712655033455.png",
  "/uploads/image-1712657829807.jpg",
  "/uploads/image-1713690432183.jpg",
  "/uploads/image-1713690916717.jpg",
  "/uploads/image-1713759012901.jpg",
  "/uploads/image-1715601878691.jpg",
  "/uploads/image-1715602033126.avif",
  "/uploads/image-1715602050347.webp",
  "/uploads/image-1715602269417.jpg",
  "/uploads/image-1715602383826.jpg",
  "/uploads/image-1715602522640.png",
  "/uploads/image-1715603253557.jpg",
];

const randInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (arr) => arr[randInt(0, arr.length - 1)];

const round2 = (n) => Math.round(n * 100) / 100;

const makeEmail = (name, i) =>
  `${name.toLowerCase().replace(/\s+/g, ".")}${i}@petshop.dev`;

const petProductTemplates = [
  // Dogs
  { name: "Puppy Training Treats", category: "Dog", brand: "PawJoy" },
  { name: "Grain-Free Dog Food", category: "Dog", brand: "KibbleKing" },
  { name: "Durable Chew Toy", category: "Dog", brand: "ChewMaster" },
  { name: "Adjustable Dog Harness", category: "Dog", brand: "WalkWell" },
  // Cats
  { name: "Catnip Mouse Toy", category: "Cat", brand: "MeowMates" },
  { name: "Clumping Cat Litter", category: "Cat", brand: "CleanPaws" },
  { name: "Wet Cat Food Variety Pack", category: "Cat", brand: "WhiskerChef" },
  { name: "Scratch Post Tower", category: "Cat", brand: "ClawCare" },
  // Birds / Small pets / Fish
  { name: "Bird Seed Mix", category: "Bird", brand: "FeatherFuel" },
  { name: "Hamster Bedding Soft", category: "Small Pet", brand: "CozyNest" },
  { name: "Aquarium Water Conditioner", category: "Fish", brand: "AquaPure" },
  { name: "Turtle UVB Lamp", category: "Reptile", brand: "SunScale" },
];

const petDescriptions = [
  "Premium quality and pet-safe materials. Great for daily use.",
  "Vet-inspired formulation designed for comfort and performance.",
  "Highly rated by pet parents. Easy to use and long-lasting.",
  "A must-have essential for healthy, happy pets.",
];

const cities = ["Cairo", "Giza", "Alexandria", "Tanta", "Mansoura", "Zagazig"];
const countries = ["Egypt", "United Arab Emirates", "Saudi Arabia"];
const paymentMethods = ["PayPal", "Credit Card", "Cash On Delivery"];

function buildUsers(count = 10) {
  const firstNames = [
    "Omar",
    "Mariam",
    "Youssef",
    "Nour",
    "Hana",
    "Karim",
    "Salma",
    "Adel",
    "Farah",
    "Mostafa",
    "Nada",
    "Hossam",
  ];
  const lastNames = [
    "Ahmed",
    "Hassan",
    "Mahmoud",
    "Ibrahim",
    "Said",
    "Fouad",
    "Ali",
    "Fathy",
    "Zaki",
    "Rashad",
  ];

  // deterministic-ish plaintexts (you can change)
  const basePasswords = ["Petshop@123", "Welcome@123", "Zootopia@123"];

  const users = [];

  // Admin
  users.push({
    name: "Admin User",
    email: "admin@petshop.dev",
    password: bcrypt.hashSync("Admin@123", 10),
    isAdmin: true,
    shippingAddress: {
      firstName: "Admin",
      lastName: "User",
      address: "1 Admin Street",
      city: "Cairo",
      postalCode: "11511",
      country: "Egypt",
    },
  });

  for (let i = 1; i <= count; i++) {
    const fn = pick(firstNames);
    const ln = pick(lastNames);
    const full = `${fn} ${ln}`;

    users.push({
      name: full,
      email: makeEmail(full, i),
      password: bcrypt.hashSync(pick(basePasswords), 10),
      isAdmin: false,
      shippingAddress: {
        firstName: fn,
        lastName: ln,
        address: `${randInt(10, 250)} Pet Street`,
        city: pick(cities),
        postalCode: `${randInt(10000, 99999)}`,
        country: pick(countries),
      },
    });
  }

  return users;
}

function buildProducts(users, count = 24) {
  const products = [];
  for (let i = 0; i < count; i++) {
    const t = pick(petProductTemplates);
    const price = randInt(50, 1200);
    const isOnSale = Math.random() < 0.35;
    const salePrice = isOnSale ? Math.max(1, price - randInt(10, 200)) : 0;

    // attach a user sometimes, but schema allows null
    const owner = Math.random() < 0.7 ? pick(users)._id : undefined;

    products.push({
      user: owner,
      name: `${t.name} ${randInt(1, 999)}`,
      image: uploadImages[i % uploadImages.length],
      brand: t.brand,
      category: t.category,
      description: pick(petDescriptions),
      reviews: [],
      rating: 5,
      numReviews: 0,
      price,
      countInStock: randInt(0, 60),
      isPublished: Math.random() < 0.9,
      isOnSale,
      salePrice,
      isPopular: Math.random() < 0.25,
    });
  }
  return products;
}

function addReviewsToProducts(products, users) {
  // Add 0-4 reviews per product (random)
  for (const p of products) {
    const howMany = randInt(0, 4);
    if (howMany === 0) continue;

    const reviews = [];
    let sum = 0;

    for (let i = 0; i < howMany; i++) {
      const u = pick(users.filter((x) => !x.isAdmin));
      const rating = randInt(3, 5);
      sum += rating;

      reviews.push({
        name: u.name,
        rating,
        comment: `My pet loved it! (${p.category})`,
        user: u._id,
      });
    }

    p.reviews = reviews;
    p.numReviews = reviews.length;
    p.rating = round2(sum / reviews.length);
  }
}

function buildOrders(users, products, count = 18) {
  const nonAdminUsers = users.filter((u) => !u.isAdmin);

  const orders = [];
  for (let i = 0; i < count; i++) {
    const u = pick(nonAdminUsers);

    const itemsCount = randInt(1, 4);
    const chosen = [];
    for (let k = 0; k < itemsCount; k++) chosen.push(pick(products));

    const orderItems = chosen.map((p) => {
      const qty = randInt(1, 3);
      const unit = p.isOnSale ? (p.salePrice || p.price) : p.price;
      return {
        name: p.name,
        qty,
        image: p.image,
        price: unit,
        isOnSale: !!p.isOnSale,
        salePrice: p.isOnSale ? (p.salePrice || 0) : undefined,
        product: p._id,
      };
    });

    const itemsPrice = round2(
      orderItems.reduce((acc, it) => acc + it.price * it.qty, 0)
    );

    const taxPrice = round2(itemsPrice * 0.14); // 14% example
    const shippingPrice = itemsPrice >= 1000 ? 0 : round2(randInt(25, 80));
    const totalPrice = round2(itemsPrice + taxPrice + shippingPrice);

    const isPaid = Math.random() < 0.7;
    const isDelivered = isPaid && Math.random() < 0.6;

    orders.push({
      user: u._id,
      orderItems,
      shippingAddress: {
        firstName: u.shippingAddress?.firstName || u.name.split(" ")[0],
        lastName:
          u.shippingAddress?.lastName || u.name.split(" ").slice(1).join(" "),
        address: u.shippingAddress?.address || `${randInt(10, 250)} Pet Street`,
        city: u.shippingAddress?.city || pick(cities),
        postalCode: u.shippingAddress?.postalCode || `${randInt(10000, 99999)}`,
        country: u.shippingAddress?.country || pick(countries),
      },
      paymentMethod: pick(paymentMethods),
      paymentResult: isPaid
        ? {
            id: `PAY-${randInt(100000, 999999)}-${randInt(1000, 9999)}`,
            status: "COMPLETED",
            update_time: new Date().toISOString(),
            email_address: u.email,
          }
        : {},
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      isPaid,
      paidAt: isPaid ? new Date(Date.now() - randInt(1, 20) * 86400000) : null,
      isDelivered,
      deliveredAt: isDelivered
        ? new Date(Date.now() - randInt(0, 10) * 86400000)
        : null,
    });
  }

  return orders;
}

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in .env");
  }
  await mongoose.connect(process.env.MONGO_URI);
}

async function destroyData() {
  await connectDB();
  await Order.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();
  console.log("✅ Data destroyed");
  process.exit(0);
}

async function importData() {
  await connectDB();

  // Clear first
  await Order.deleteMany();
  await Product.deleteMany();
  await User.deleteMany();

  // Users
  const usersToInsert = buildUsers(12);
  const createdUsers = await User.insertMany(usersToInsert);

  // Products
  let productsToInsert = buildProducts(createdUsers, 28);
  addReviewsToProducts(productsToInsert, createdUsers);

  const createdProducts = await Product.insertMany(productsToInsert);

  // Orders
  const ordersToInsert = buildOrders(createdUsers, createdProducts, 22);
  await Order.insertMany(ordersToInsert);

  console.log("✅ Seed completed");
  console.log(`Users: ${createdUsers.length}`);
  console.log(`Products: ${createdProducts.length}`);
  console.log(`Orders: ${ordersToInsert.length}`);

  console.log("");
  console.log("Login creds:");
  console.log("Admin -> admin@petshop.dev / Admin@123");
  console.log("Users -> random emails / password is one of: Petshop@123, Welcome@123, Zootopia@123");

  process.exit(0);
}

// CLI
// node backend/seeder.js         -> import
// node backend/seeder.js -d      -> destroy
const arg = process.argv[2];
if (arg === "-d") {
  destroyData().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  importData().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
