import { connectDB } from "@/lib/db/mongoose"
import { CrawlerConfig, DEFAULT_CONFIG } from "@/models/crawler-config.model"

export async function upsertCrawlerConfig(key: string, value: string) {
  await connectDB()
  return CrawlerConfig.findOneAndUpdate(
    { key },
    { value, updatedAt: new Date() },
    { upsert: true, new: true }
  )
}

export async function seedDefaultConfigs() {
  await connectDB()
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await CrawlerConfig.updateOne(
      { key },
      { $setOnInsert: { key, value, updatedAt: new Date() } },
      { upsert: true }
    )
  }
}
