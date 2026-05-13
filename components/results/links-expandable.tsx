"use client"

import { useState } from "react"

export function LinksExpandable({ domains }: { domains: string[] }) {
  const [expanded, setExpanded] = useState(false)
  const preview = domains.slice(0, 3)

  if (domains.length === 0) return <span className="text-muted-foreground">—</span>

  return (
    <div>
      <span className="text-sm">{preview.join(", ")}</span>
      {domains.length > 3 && !expanded && (
        <button onClick={() => setExpanded(true)} className="ml-1 text-xs text-primary underline">
          +{domains.length - 3} more
        </button>
      )}
      {expanded && (
        <div className="mt-1 text-xs text-muted-foreground max-h-32 overflow-y-auto">
          {domains.map((d, i) => <div key={i}>{d}</div>)}
          <button onClick={() => setExpanded(false)} className="text-primary underline mt-1">Show less</button>
        </div>
      )}
    </div>
  )
}
