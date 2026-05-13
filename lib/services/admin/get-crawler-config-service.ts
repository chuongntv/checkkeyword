import { connectDB } from "@/lib/db/mongoose"
import { CrawlerConfig, DEFAULT_CONFIG } from "@/models/crawler-config.model"

export async function getCrawlerConfigs(): Promise<Record<string, string>> {
  await connectDB()
  const configs = await CrawlerConfig.find().lean()
  const result: Record<string, string> = { ...DEFAULT_CONFIG }
  for (const c of configs) {
    result[c.key] = c.value
  }
  return result
}

export async function getCrawlerConfig(key: string): Promise<string> {
  await connectDB()
  const config = await CrawlerConfig.findOne({ key }).lean()
  return config?.value ?? DEFAULT_CONFIG[key] ?? ""
}
