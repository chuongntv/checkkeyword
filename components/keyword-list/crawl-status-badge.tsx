import { Badge } from "@/components/ui/badge"

type Status = "pending" | "running" | "done" | "failed"

const statusConfig: Record<Status, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Đang chờ", variant: "secondary" },
  running: { label: "Đang chạy...", variant: "default" },
  done: { label: "Hoàn thành", variant: "outline" },
  failed: { label: "Thất bại", variant: "destructive" },
}

export function CrawlStatusBadge({ status }: { status: Status | null }) {
  if (!status) return <span className="text-sm text-muted-foreground">Chưa chạy</span>
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
