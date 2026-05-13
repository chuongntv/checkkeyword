import { Schema, model, models, Document, Model } from "mongoose"

export interface IProxy extends Document {
  host: string
  port: number
  username: string
  password: string
  countries: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const ProxySchema = new Schema<IProxy>(
  {
    host: { type: String, required: true },
    port: { type: Number, required: true },
    username: { type: String, default: "" },
    password: { type: String, default: "" },
    countries: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export const ProxyModel: Model<IProxy> =
  (models.Proxy as Model<IProxy>) || model<IProxy>("Proxy", ProxySchema)
