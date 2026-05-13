import { BaseService, ServiceError } from "@/lib/services/base-service"
import { KeywordList } from "@/models/keyword-list.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { workspaceId: string; name: string; keywords: string[]; countries: string[] }
type Output = { id: string; name: string; keywordCount: number; countries: string[] }

export class CreateKeywordListService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const kl = await KeywordList.create({
        workspaceId: input.workspaceId,
        name: input.name,
        keywords: input.keywords.map((k) => k.trim().toLowerCase()),
        countries: input.countries,
      })
      return { id: kl._id.toString(), name: kl.name, keywordCount: kl.keywords.length, countries: kl.countries }
    } catch (error) {
      this.handleError(error)
    }
  }
}
