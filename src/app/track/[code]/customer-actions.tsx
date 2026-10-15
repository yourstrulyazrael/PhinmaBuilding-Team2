"use client";

import { useMoney } from "@/components/currency";

import { useState, useTransition } from "react";
import { Ban, Check, Star, X } from "lucide-react";
import { answerEstimate, requestCancellation, submitReview } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Approve or Decline a revised estimate (ticket 17). Decline confirms
// and asks why first (ticket 41).
export function EstimateQuestion({
  code,
  initial,
  revised,
  parts = 0,
}: {
  code: string;
  initial: number;
  revised: number;
  parts?: number; // parts used so far, charged on top of labour (ticket 47)
}) {
  const { money } = useMoney();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  // Decline asks "are you sure, and why?" first (ticket 41).
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  function answer(approve: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await answerEstimate(code, approve, approve ? "" : reason);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
      <div>
        <p className="font-medium text-tertiary">Please approve the revised quote</p>
        <p className="text-sm text-muted-foreground">
          After checking your phone, the quote changed from {money(initial)} to{" "}
          <span className="font-semibold text-foreground">{money(revised)}</span>
          {Number(parts) > 0 ? (
            <>
              . With the parts ({money(parts)}), your total would be{" "}
              <span className="font-semibold text-foreground">{money(Number(revised) + Number(parts))}</span>
            </>
          ) : null}
          . Work continues once you approve.
        </p>
      </div>

      {declining ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            answer(false);
          }}
          className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3"
        >
          <div>
            <p className="font-medium text-tertiary">Decline the revised quote?</p>
            <p className="text-sm text-muted-foreground">
              The shop won&apos;t continue at {money(revised)} and will contact you about what to do next.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="decline-reason">Why are you declining?</Label>
            <Textarea
              id="decline-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={300}
              required
              autoFocus
              placeholder="e.g. It's more than I can spend right now. Please just fix the screen."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" variant="destructive" disabled={pending || !reason.trim()}>
              {pending ? "Sending…" : "Yes, decline"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setDeclining(false);
                setError(undefined);
              }}
            >
              Go back
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => answer(true)}>
            <Check className="size-4" aria-hidden />
            {pending ? "Sending…" : "Approve"}
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => setDeclining(true)}>
            <X className="size-4" aria-hidden />
            Decline
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// "Request cancellation", with an optional reason (ticket 18). Opens a
// small form first so a stray tap can't send it.
export function CancelRequestForm({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
      >
        <Ban className="size-3.5" aria-hidden />
        Request cancellation
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
        setError(undefined);
        startTransition(async () => {
          const result = await requestCancellation(code, reason);
          if (result.error) setError(result.error);
        });
      }}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4"
    >
      <div>
        <p className="font-medium text-tertiary">Request cancellation</p>
        <p className="text-sm text-muted-foreground">
          The shop will contact you to confirm. Any work already done may still need to be paid for.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea id="reason" name="reason" rows={3} maxLength={300} placeholder="e.g. I found a cheaper replacement" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Never mind
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

const STAR_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// Rate the technician after pickup (ticket 62): 1 to 5 stars (tap or use
// the arrow keys) and an optional comment. Only the shop sees it.
export function ReviewForm({ code, technician }: { code: string; technician: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const shown = hover || rating;

  function send() {
    setError(undefined);
    startTransition(async () => {
      // On success the action shows the thank-you page.
      const result = await submitReview(code, rating, comment);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (rating) send();
      }}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4 shadow-card"
    >
      <div>
        <p className="font-medium text-tertiary">How did {technician || "your technician"} do?</p>
        <p className="text-sm text-muted-foreground">Your review goes to the shop only.</p>
      </div>

      <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Rating" className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}: ${STAR_WORDS[n]}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowUp") setRating(Math.min(5, (rating || 0) + 1));
                if (e.key === "ArrowLeft" || e.key === "ArrowDown") setRating(Math.max(1, (rating || 2) - 1));
              }}
              className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100"
            >
              <Star
                className={n <= shown ? "size-8 fill-amber-400 text-amber-400" : "size-8 text-muted-foreground/40"}
                aria-hidden
              />
            </button>
          ))}
        </div>
        <span className="text-sm font-medium text-muted-foreground" aria-live="polite">
          {STAR_WORDS[shown]}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="review-comment">Anything to add? (optional)</Label>
        <Textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Quick and friendly. The screen looks brand new."
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending || !rating} className="w-fit">
        {pending ? "Sending…" : "Send review"}
      </Button>
    </form>
  );
}
