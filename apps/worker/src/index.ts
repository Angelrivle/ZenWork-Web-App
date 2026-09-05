// ZenWork Worker - Procesa eventos en segundo plano
import { prisma } from "@zenwork/db/adapter";
import { cleanupStaleJobs, retryPendingWebhookDeliveries } from "@zenwork/integrations";

async function main() {
  console.log("🚀 ZenWork Worker starting...");

  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }

  // Tarea periódica de limpieza
  setInterval(async () => {
    try {
      await cleanupStaleJobs();
      console.log("🧹 Stale jobs cleaned up");
    } catch (error) {
      console.error("Error cleaning stale jobs:", error);
    }
  }, 60 * 60 * 1000);

  // Reintenta webhooks salientes fallidos cuyo backoff ya venció (el primer
  // escalón es 1 minuto, así que se revisa con esa cadencia).
  setInterval(async () => {
    try {
      await retryPendingWebhookDeliveries();
    } catch (error) {
      console.error("Error retrying webhook deliveries:", error);
    }
  }, 60 * 1000);

  console.log("✅ ZenWork Worker ready");

  process.on("SIGTERM", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
