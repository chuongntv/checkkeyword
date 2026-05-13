import { BaseService } from "@/lib/services/base-service"
import { KeywordList } from "@/models/keyword-list.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { workspaceId: string }
type Output = { id: string; name: string; keywordCount: number; countries: string[]; createdAt: Date }[]

export class GetKeywordListsService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    await connectDB()
    const lists = await KeywordList.find({ workspaceId: input.workspaceId }).sort({ createdAt: -1 }).lean()
    return lists.map((kl) => ({
      id: kl._id.toString(),
      name: kl.name,
      keywordCount: kl.keywords.length,
      countries: kl.countries,
      createdAt: kl.createdAt,
    }))
  }
}
