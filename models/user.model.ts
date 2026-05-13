import { Schema, model, models, Document, Model } from "mongoose"

export interface IUser extends Document {
  email: string
  name: string
  password: string
  disabled: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String, required: true, select: false },
    disabled: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const User: Model<IUser> = models.User as Model<IUser> || model<IUser>("User", UserSchema)
