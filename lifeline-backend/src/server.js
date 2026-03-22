const app = require("./app");
const env = require("./config/env");
const db = require("./db");
const { seedDatabase } = require("./services/seedService");

async function start() {
  await db.connect();
  await seedDatabase();

  app.listen(env.PORT, () => {
    console.log(`Backend running on port ${env.PORT} using ${db.provider}`);
  });
}

start().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await db.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await db.disconnect();
  process.exit(0);
});
