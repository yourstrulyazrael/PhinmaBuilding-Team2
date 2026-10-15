import { cn } from "@/lib/utils";
import { STATUS_STYLES, statusLabel, type Status } from "@/lib/jobs";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current opacity-70" />
      {statusLabel(status)}
    </span>
  );
}
