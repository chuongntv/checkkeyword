import { BaseService } from "@/lib/services/base-service"
import { ProxyModel } from "@/models/proxy.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { countryCode: string }
type Output = { host: string; port: number; username: string; password: string }[]

export class GetProxiesForCountryService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()
    const proxies = await ProxyModel.find({
      countries: input.countryCode,
      isActive: true,
    }).lean()

    // Shuffle for load balancing
    const shuffled = proxies.sort(() => Math.random() - 0.5)
    return shuffled.map((p) => ({
      host: p.host,
      port: p.port,
      username: p.username,
      password: p.password,
    }))
  }
}
