import { BaseService, ServiceError } from "@/lib/services/base-service"
import { User } from "@/models/user.model"
import { connectDB } from "@/lib/db/mongoose"
import bcrypt from "bcryptjs"

type Input = { name: string; email: string; password: string }
type Output = { id: string; email: string }

export class SignupService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const exists = await User.findOne({ email: input.email.toLowerCase() })
      if (exists) throw new ServiceError("Email already registered", undefined, "EMAIL_EXISTS")

      const hashed = await bcrypt.hash(input.password, 12)
      const user = await User.create({
        name: input.name,
        email: input.email.toLowerCase(),
        password: hashed,
      })
      return { id: user._id.toString(), email: user.email }
    } catch (error) {
      this.handleError(error)
    }
  }
}
