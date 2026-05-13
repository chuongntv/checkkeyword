import mongoose, { Schema, type Model } from "mongoose"

export interface ICrawlerConfig {
  key: string
  value: string
  updatedAt: Date
}

const CrawlerConfigSchema = new Schema<ICrawlerConfig>({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
})

export const CrawlerConfig: Model<ICrawlerConfig> =
  mongoose.models.CrawlerConfig || mongoose.model("CrawlerConfig", CrawlerConfigSchema)

export const DEFAULT_CONFIG: Record<string, string> = {
  maxDomainsTarget: "100",
  registrationEnabled: "true",
  jobTimeoutMinutes: "10",
}
