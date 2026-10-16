import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Frown, Medal, MessageSquareText, Smile, Star, Trophy } from "lucide-react";
import { formatDate, todayInManila } from "@/lib/jobs";
import { periodFrom } from "@/lib/periods";
import { addDays, manilaDate } from "@/lib/workspace";
import { PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { SlidingTabs } from "@/components/sliding-tabs";
import { Stars } from "@/components/stars";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StaffFilter } from "./staff-filter";
import { getNames, getShop, getSupabase, getUser } from "@/lib/session";

// CSAT = satisfied (4–5 stars); DSAT = dissatisfied (1–2); 3 is neutral.
type Mood = "csat" | "neutral" | "dsat";
const moodOf = (rating: number): Mood => (rating >= 4 ? "csat" : rating <= 2 ? "dsat" : "neutral");
const MOODS = [
  { key: "", label: "All" },
  { key: "csat", label: "CSAT (4–5★)" },
  { key: "neutral", label: "Neutral (3★)" },
  { key: "dsat", label: "DSAT (1–2★)" },
] as const;
// You need this many reviews in the period to be ranked, so one lucky
// 5-star can't top the board.
const MIN_TO_RANK = 3;

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * Reviews (ticket 63): customers' ratings of the technicians, as CSAT and
 * DSAT, with a leaderboard of who keeps the best reviews.
 *
 * - Everyone sees the leaderboard: names and scores only, from
 *   shop_review_scores (supabase/sql/029), never anyone else's comments.
 * - The owner sees every review (and can filter by person); staff see
 *   the reviews of their own work. RLS decides which rows come back.
 * - Filters: the period (Today · 7 days · 30 days, or a month), the
 *   rating (All · CSAT · Neutral · DSAT), and for the owner, one person.
 *   They live in the address, so refresh and Back keep them.
 */
export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  // Shared with the layout: fetched once per page load (lib/session.ts).
  const supabase = await getSupabase();
  const user = await getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const period = periodFrom(params.period, todayInManila(), "30d", true);
  // Manila days, as moments: from the first day's midnight to the day
  // after the last.
  const since = `${period.from}T00:00:00+08:00`;
  const until = `${addDays(period.to, 1)}T00:00:00+08:00`;

  const [shop, names, { data: rows }, { data: scoreRows }, { data: memberRows }] = await Promise.all([
    getShop(),
    getNames(),
    supabase
      .from("reviews")
      .select("id, job_id, technician_id, rating, comment, created_at, jobs (device)")
      .gte("created_at", since)
      .lt("created_at", until)
      .order("created_at", { ascending: false }),
    supabase.rpc("shop_review_scores", { since, until }),
    supabase.from("shop_members").select("*").order("joined_at"),
  ]);
  if (!shop) redirect("/setup");
  const owner = shop.role === "owner";

  const people = (memberRows ?? [])
    .filter((m) => !m.removed_at)
    .map((m) => ({ id: m.technician_id as string, name: names[m.technician_id] ?? "Someone" }));
  const mood = MOODS.some((m) => m.key && m.key === params.mood) ? (params.mood as Mood) : "";
  // The owner can look at one person; staff only ever see their own.
  const staff = owner && typeof params.staff === "string" && people.some((p) => p.id === params.staff) ? params.staff : "";

  const all = (rows ?? []).map((r) => ({
    id: r.id as string,
    jobId: r.job_id as string,
    technicianId: r.technician_id as string,
    rating: Number(r.rating),
    comment: (r.comment as string) ?? "",
    createdAt: r.created_at as string,
    device: (r.jobs as unknown as { device: string } | null)?.device ?? "A repair",
  }));
  // The summary counts whoever is chosen (everyone, one person, or for
  // staff, themselves); the list also follows the rating filter.
  const mine = all.filter((r) => !staff || r.technicianId === staff);
  const listed = mine.filter((r) => !mood || moodOf(r.rating) === mood);
  const count = mine.length;
  const satisfied = mine.filter((r) => r.rating >= 4).length;
  const dissatisfied = mine.filter((r) => r.rating <= 2).length;
  const average = count ? mine.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  // The leaderboard: best CSAT first, then fewest DSAT, more reviews, a
  // higher average. Fewer than MIN_TO_RANK reviews: listed, not ranked.
  const scores = ((scoreRows ?? []) as {
    technician_id: string;
    reviews: number;
    satisfied: number;
    neutral: number;
    dissatisfied: number;
    average: number;
  }[])
    .map((s) => ({
      id: s.technician_id,
      name: names[s.technician_id] ?? "Someone",
      reviews: s.reviews,
      csat: pct(s.satisfied, s.reviews),
      dsat: pct(s.dissatisfied, s.reviews),
      average: Number(s.average),
    }))
    .sort((a, b) => b.csat - a.csat || a.dsat - b.dsat || b.reviews - a.reviews || b.average - a.average);
  const ranked = scores.filter((s) => s.reviews >= MIN_TO_RANK);
  const unranked = scores.filter((s) => s.reviews < MIN_TO_RANK);

  // Addresses that keep the other filters.
  const keep = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ period: period.key, ...(mood && { mood }), ...(staff && { staff }), ...extra });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/reviews?${p}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-[120rem] flex-col gap-5 px-4 py-6 md:px-8 md:py-10 2xl:px-12">
      <PageHeader
        eyebrow="Customer feedback"
        icon={MessageSquareText}
        title="Reviews"
        crumbs={[{ label: "Reviews" }]}
        description={
          owner
            ? "What customers say about each technician after pickup. CSAT is the share of 4–5★ reviews; DSAT the share of 1–2★."
            : "What customers say about your repairs, and how the team is doing. CSAT is the share of 4–5★ reviews; DSAT the share of 1–2★."
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <PeriodPicker path="/reviews" current={period.key} allowMonth keep={{ ...(mood && { mood }), ...(staff && { staff }) }} />
        <SlidingTabs
          label="Rating"
          look="raised"
          active={mood}
          items={MOODS.map((m) => ({ key: m.key, href: keep({ mood: m.key }), label: m.label }))}
        />
        {owner && people.length > 1 && (
          <StaffFilter staff={staff} options={people} keep={{ period: period.key, ...(mood && { mood }) }} />
        )}
      </div>

      {/* The numbers for whoever is chosen, in this period. */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Summary">
        <Stat
          icon={Smile}
          tone="text-emerald-700 dark:text-emerald-300"
          label="CSAT"
          value={count ? `${pct(satisfied, count)}%` : "–"}
          note={`${satisfied} of ${count} gave 4–5★`}
        />
        <Stat
          icon={Frown}
          tone="text-destructive"
          label="DSAT"
          value={count ? `${pct(dissatisfied, count)}%` : "–"}
          note={`${dissatisfied} of ${count} gave 1–2★`}
        />
        <Stat
          icon={Star}
          tone="text-amber-500"
          label="Average rating"
          value={count ? average.toFixed(1) : "–"}
          note={count ? <Stars rating={average} /> : "No reviews yet"}
        />
        <Stat
          icon={MessageSquareText}
          tone="text-primary"
          label="Reviews"
          value={String(count)}
          note={`${period.label}${staff ? ` · ${names[staff] ?? ""}` : owner ? " · everyone" : " · yours"}`}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Who keeps the best reviews. */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-tertiary">
              <Trophy className="size-4 text-amber-500" aria-hidden />
              Leaderboard
            </CardTitle>
            <CardDescription>
              Best CSAT first, then lowest DSAT. {MIN_TO_RANK} reviews in the period to be ranked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews in this period yet.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {ranked.map((s, i) => (
                  <Rank key={s.id} place={i + 1} score={s} you={s.id === user.id} />
                ))}
                {unranked.map((s) => (
                  <Rank key={s.id} score={s} you={s.id === user.id} />
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* The reviews themselves. */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-tertiary">
              {owner ? (staff ? `${names[staff] ?? "Their"} reviews` : "All reviews") : "Your reviews"}
            </CardTitle>
            <CardDescription>
              {listed.length} {listed.length === 1 ? "review" : "reviews"}
              {mood && ` · ${MOODS.find((m) => m.key === mood)?.label}`} · {period.label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {count === 0
                  ? "No reviews in this period. Customers can rate their technician on their tracking page once they've picked up their phone."
                  : "No reviews match this filter."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border-t border-border">
                {listed.map((r) => {
                  const m = moodOf(r.rating);
                  return (
                    <li key={r.id} className="flex flex-col gap-1.5 py-3 text-sm">
                      <span className="flex flex-wrap items-center gap-2">
                        <Stars rating={r.rating} />
                        <MoodChip mood={m} />
                        <Link href={`/jobs/${r.jobId}`} className="font-medium underline-offset-4 hover:underline">
                          {r.device}
                        </Link>
                        {owner && (
                          <span className="text-muted-foreground">
                            · {r.technicianId === user.id ? "You" : (names[r.technicianId] ?? "Someone")}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">{formatDate(manilaDate(r.createdAt))}</span>
                      </span>
                      {r.comment ? (
                        <span className="whitespace-pre-line text-muted-foreground">&ldquo;{r.comment}&rdquo;</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No comment.</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  note,
}: {
  icon: typeof Star;
  tone: string;
  label: string;
  value: string;
  note: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4 md:p-5">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className={cn("size-4", tone)} aria-hidden />
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums text-tertiary md:text-3xl">{value}</p>
      <div className="text-xs text-muted-foreground">{note}</div>
    </Card>
  );
}

const MOOD_LOOK: Record<Mood, { label: string; className: string }> = {
  csat: { label: "CSAT", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  neutral: { label: "Neutral", className: "bg-muted text-muted-foreground" },
  dsat: { label: "DSAT", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

function MoodChip({ mood }: { mood: Mood }) {
  const look = MOOD_LOOK[mood];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", look.className)}>{look.label}</span>;
}

// One row of the leaderboard. `place` is missing for people not yet ranked.
function Rank({
  place,
  score,
  you,
}: {
  place?: number;
  score: { name: string; reviews: number; csat: number; dsat: number; average: number };
  you: boolean;
}) {
  const medal = place === 1 ? "text-amber-500" : place === 2 ? "text-slate-400" : place === 3 ? "text-orange-600" : "";
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius)] border p-3",
        you ? "border-primary/40 bg-primary/5" : "border-border",
        !place && "opacity-70",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
        {place && place <= 3 ? (
          place === 1 ? <Award className={cn("size-5", medal)} aria-label="1st" /> : <Medal className={cn("size-5", medal)} aria-label={`${place === 2 ? "2nd" : "3rd"}`} />
        ) : (
          (place ?? "–")
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {score.name}
          {you && <span className="font-normal text-muted-foreground"> (you)</span>}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Stars rating={score.average} />
          {score.average.toFixed(1)} · {score.reviews} review{score.reviews === 1 ? "" : "s"}
          {!place && ` · needs ${MIN_TO_RANK - score.reviews} more to rank`}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end text-xs tabular-nums">
        <span className="font-semibold text-emerald-700 dark:text-emerald-300">CSAT {score.csat}%</span>
        <span className="text-muted-foreground">DSAT {score.dsat}%</span>
      </div>
    </li>
  );
}
