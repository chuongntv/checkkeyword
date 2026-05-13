import { BaseService, ServiceError } from "@/lib/services/base-service"
import { KeywordList } from "@/models/keyword-list.model"
import { connectDB } from "@/lib/db/mongoose"

type Input = { listId: string; name?: string; rawKeywords?: string; countries?: string[] }
type Output = { id: string; name: string; keywordCount: number; countries: string[] }

function parseKeywords(raw: string): string[] {
  return [...new Set(raw.split(",").map((k) => k.trim()).filter(Boolean))]
}

export class UpdateKeywordListService extends BaseService<Input, Output> {
  async call(input: Input): Promise<Output> {
    try {
      await connectDB()
      const updates: Partial<{ name: string; keywords: string[]; countries: string[] }> = {}
      if (input.name) updates.name = input.name
      if (input.rawKeywords !== undefined) {
        const keywords = parseKeywords(input.rawKeywords)
        if (keywords.length > 500) throw new ServiceError("Max 500 keywords per list", undefined, "LIMIT_EXCEEDED")
        updates.keywords = keywords
      }
      if (input.countries) updates.countries = input.countries

      const list = await KeywordList.findByIdAndUpdate(input.listId, updates, { new: true })
      if (!list) throw new ServiceError("Keyword list not found")

      return {
        id: list._id.toString(),
        name: list.name,
        keywordCount: list.keywords.length,
        countries: list.countries,
      }
    } catch (error) {
      this.handleError(error)
    }
  }
}
