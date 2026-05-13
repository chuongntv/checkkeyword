import { Schema, model, models, Document, Model, Types } from "mongoose"

export interface IKeywordList extends Document {
  workspaceId: Types.ObjectId
  name: string
  keywords: string[]
  countries: string[]
  createdAt: Date
  updatedAt: Date
}

const KeywordListSchema = new Schema<IKeywordList>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    name: { type: String, required: true },
    keywords: [{ type: String, required: true }],
    countries: [{ type: String, required: true }],
  },
  { timestamps: true }
)

KeywordListSchema.index({ workspaceId: 1 })

export const KeywordList: Model<IKeywordList> =
  (models.KeywordList as Model<IKeywordList>) || model<IKeywordList>("KeywordList", KeywordListSchema)
