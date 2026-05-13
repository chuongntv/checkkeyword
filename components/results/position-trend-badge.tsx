type Trend = "up" | "down" | "same" | "new" | "lost"

const TREND_CONFIG: Record<Trend, { icon: string; label: string; className: string }> = {
  up: { icon: "↑", label: "", className: "text-green-600 font-bold" },
  down: { icon: "↓", label: "", className: "text-red-600 font-bold" },
  same: { icon: "—", label: "", className: "text-muted-foreground" },
  new: { icon: "★", label: "MỚI", className: "text-blue-600 font-bold" },
  lost: { icon: "✗", label: "MẤT", className: "text-orange-600 font-bold" },
}

export function PositionTrendBadge({ trend, position, previousPosition }: {
  trend: Trend; position: number | null; previousPosition: number | null
}) {
  const config = TREND_CONFIG[trend]
  const posDisplay = position ?? "—"
  const prevDisplay = previousPosition ?? ""

  return (
    <span className="inline-flex items-center gap-1">
      <span className={position !== null ? "font-medium" : "text-muted-foreground"}>{posDisplay}</span>
      {previousPosition !== null && position !== null && trend !== "same" && (
        <span className={`text-xs ${config.className}`}>
          {config.icon}{prevDisplay}
        </span>
      )}
      {(trend === "new" || trend === "lost") && (
        <span className={`text-xs ${config.className}`}>{config.icon} {config.label}</span>
      )}
    </span>
  )
}
