import { Schema, model, models, Document, Model, Types } from "mongoose"

export type MemberRole = "viewer" | "editor"

export interface IWorkspaceMember {
  userId: Types.ObjectId
  role: MemberRole
}

export interface IWorkspace extends Document {
  name: string
  domain: string
  ownerId: Types.ObjectId
  members: IWorkspaceMember[]
  createdAt: Date
  updatedAt: Date
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true },
    domain: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
      },
    ],
  },
  { timestamps: true }
)

WorkspaceSchema.index({ ownerId: 1 })
WorkspaceSchema.index({ "members.userId": 1 })

export const Workspace: Model<IWorkspace> =
  (models.Workspace as Model<IWorkspace>) || model<IWorkspace>("Workspace", WorkspaceSchema)
