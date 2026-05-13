import { Schema, model, models, Document, Model, Types } from "mongoose"

export interface ISerpResult extends Document {
  crawlJobId: Types.ObjectId
  workspaceId: Types.ObjectId
  keywordListId: Types.ObjectId
  keyword: string
  domain: string
  position: number | null
  previousPosition: number | null
  links: string[]
  domains: string[]
  googleUrl: string
  crawledAt: Date
}

const SerpResultSchema = new Schema<ISerpResult>(
  {
    crawlJobId: { type: Schema.Types.ObjectId, ref: "CrawlJob", required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    keywordListId: { type: Schema.Types.ObjectId, ref: "KeywordList", required: true },
    keyword: { type: String, required: true },
    domain: { type: String, required: true },
    position: { type: Number, default: null },
    previousPosition: { type: Number, default: null },
    links: [{ type: String }],
    domains: [{ type: String }],
    googleUrl: { type: String },
    crawledAt: { type: Date, default: () => new Date() },
  }
)

SerpResultSchema.index({ crawlJobId: 1 })
SerpResultSchema.index({ workspaceId: 1, keyword: 1, crawledAt: -1 })

export const SerpResult: Model<ISerpResult> =
  (models.SerpResult as Model<ISerpResult>) || model<ISerpResult>("SerpResult", SerpResultSchema)
