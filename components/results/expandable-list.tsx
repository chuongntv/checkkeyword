"use client"

import { useState } from "react"

export function ExpandableList({ items, maxPreview = 3 }: { items: string[]; maxPreview?: number }) {
  const [expanded, setExpanded] = useState(false)
  const preview = items.slice(0, maxPreview)

  if (items.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div>
      <span className="text-sm">{preview.join(", ")}</span>
      {items.length > maxPreview && !expanded && (
        <button onClick={() => setExpanded(true)} className="ml-1 text-xs text-primary underline">
          +{items.length - maxPreview} khác
        </button>
      )}
      {expanded && (
        <div className="mt-1 text-xs text-muted-foreground max-h-32 overflow-y-auto">
          {items.map((item, i) => <div key={i}>{item}</div>)}
          <button onClick={() => setExpanded(false)} className="text-primary underline mt-1">Thu gọn</button>
        </div>
      )}
    </div>
  )
}
