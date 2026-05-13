import { Badge } from "@/components/ui/badge"

type Status = "pending" | "running" | "done" | "failed"

const statusConfig: Record<Status, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Queued", variant: "secondary" },
  running: { label: "Running...", variant: "default" },
  done: { label: "Done", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
}

export function CrawlStatusBadge({ status }: { status: Status | null }) {
  if (!status) return <span className="text-sm text-muted-foreground">No runs</span>
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
