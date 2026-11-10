import { BookOpen, ClipboardList, FileSearch, ListChecks, NotebookPen, PenLine, RotateCcw, Sparkles, TrendingUp } from "lucide-react";
import type { SlotKind } from "@/lib/templates";

const ICONS: Record<SlotKind, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  subject: BookOpen,
  questions: ListChecks,
  review: RotateCcw,
  week_review: Sparkles,
  mock: ClipboardList,
  error_analysis: FileSearch,
  essay: PenLine,
  log: TrendingUp,
  custom: NotebookPen,
};

export function SlotIcon({ kind, color, className = "size-4" }: { kind: SlotKind; color?: string; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon className={`shrink-0 ${color ? "" : "muted"} ${className}`} style={color ? { color } : undefined} />;
}
