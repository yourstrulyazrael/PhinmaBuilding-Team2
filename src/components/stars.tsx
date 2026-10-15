import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A 1–5 rating as stars (ticket 62). Whole stars only; an average is
 * rounded for the stars and shown as a number beside them by the caller.
 */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span className={cn("inline-flex", className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={n <= filled ? "size-4 fill-amber-400 text-amber-400" : "size-4 text-muted-foreground/40"}
          aria-hidden
        />
      ))}
    </span>
  );
}
