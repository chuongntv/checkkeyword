import { Schema, model, models, Document, Model, Types } from "mongoose"

export type CrawlJobStatus = "pending" | "running" | "done" | "failed"

export interface ICrawlJob extends Document {
  keywordListId: Types.ObjectId
  workspaceId: Types.ObjectId
  triggeredBy: Types.ObjectId
  status: CrawlJobStatus
  queueJobId: string
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const CrawlJobSchema = new Schema<ICrawlJob>(
  {
    keywordListId: { type: Schema.Types.ObjectId, ref: "KeywordList", required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    triggeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "running", "done", "failed"], default: "pending" },
    queueJobId: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
)

CrawlJobSchema.index({ keywordListId: 1, status: 1 })
CrawlJobSchema.index({ workspaceId: 1, createdAt: -1 })

export const CrawlJob: Model<ICrawlJob> =
  (models.CrawlJob as Model<ICrawlJob>) || model<ICrawlJob>("CrawlJob", CrawlJobSchema)
