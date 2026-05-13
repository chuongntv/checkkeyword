import { BaseService, ServiceError } from "@/lib/services/base-service"
import { ProxyModel } from "@/models/proxy.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { raw: string; countries: string[] }
type Output = { imported: number; total: number }

export class BulkImportProxiesService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const lines = input.raw.split("\n").map((l) => l.trim()).filter(Boolean)
      const proxies = lines
        .map((line) => {
          const parts = line.split(":")
          if (parts.length < 2) return null
          return {
            host: parts[0],
            port: parseInt(parts[1], 10),
            username: parts[2] || "",
            password: parts[3] || "",
            countries: input.countries,
            isActive: true,
          }
        })
        .filter(Boolean) as any[]

      if (proxies.length === 0) throw new ServiceError("No valid proxy lines found")

      const result = await ProxyModel.insertMany(proxies, { ordered: false })
      return { imported: result.length, total: lines.length }
    } catch (error) {
      this.handleError(error)
    }
  }
}
