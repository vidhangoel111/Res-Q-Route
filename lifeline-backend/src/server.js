const http = require("http");
const app = require("./app");
const env = require("./config/env");
const db = require("./db");
const { seedDatabase } = require("./services/seedService");
const { initSocket } = require("./config/socket");

async function start() {
  try {
    console.log("🔌 Connecting to database...");
    await db.connect();
    console.log("✓ Database connected");
    
    console.log("🌱 Seeding database...");
    await seedDatabase();
    console.log("✓ Database seeded");

    const server = http.createServer(app);
    console.log("📡 Initializing Socket.io...");
    initSocket(server);
    console.log("✓ Socket.io initialized");

    server.listen(env.PORT, () => {
      console.log(`✅ Backend running on port ${env.PORT} using ${db.provider}`);
    });
  } catch (error) {
    console.error("❌ Failed to start backend:", error);
    process.exit(1);
  }
}

start();

process.on("SIGINT", async () => {
  await db.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await db.disconnect();
  process.exit(0);
});

