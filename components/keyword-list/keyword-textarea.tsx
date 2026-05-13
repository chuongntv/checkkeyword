"use client"

interface KeywordTextareaProps {
  value: string
  onChange: (value: string) => void
}

export function KeywordTextarea({ value, onChange }: KeywordTextareaProps) {
  const keywords = [...new Set(value.split("\n").map((k) => k.trim()).filter(Boolean))]
  const count = keywords.length
  const overLimit = count > 500

  return (
    <div className="space-y-2">
      <textarea
        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        placeholder="seo tools&#10;rank tracker&#10;google ranking"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex justify-between text-sm">
        <span className={overLimit ? "text-destructive" : "text-muted-foreground"}>
          {count} keyword{count !== 1 ? "s" : ""} detected
        </span>
        {overLimit && <span className="text-destructive">Max 500 keywords</span>}
      </div>
    </div>
  )
}
