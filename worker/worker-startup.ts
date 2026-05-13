import "dotenv/config"
import { connectDB } from "../lib/db/mongoose"
import { startSerpWorker } from "./serp-crawl-worker"

async function main() {
  await connectDB()
  console.log("[Worker] MongoDB connected")
  startSerpWorker()
  console.log("[Worker] SERP crawl worker started, waiting for jobs...")
}

main().catch((err) => {
  console.error("[Worker] Fatal error:", err)
  process.exit(1)
})
