import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { isFilter, NotificationsList } from "./notifications-list";
import { getNames, getNotifications, getUser } from "@/lib/session";

/**
 * The notification center (tickets 38, 73), opened from the bell in the
 * top bar. Same reminders the bell counts: getNotifications is shared
 * with the layout, so they are worked out once per page load. ?show=
 * picks one group (Needs action, Repairs, Stock, Updates).
 */
export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const user = await getUser();
  if (!user) redirect("/login");
  const [{ alerts, lowStock, requests, proposals, answers, reviews }, names, { show }] = await Promise.all([
    getNotifications(),
    getNames(),
    searchParams,
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 md:px-8 md:py-10">
      <PageHeader
        crumbs={[{ label: "Notifications" }]}
        eyebrow="Inbox"
        icon={Bell}
        title="Notifications"
        description="What needs you right now, grouped so the urgent things come first."
      />
      <NotificationsList
        show={isFilter(show) ? show : "all"}
        alerts={alerts}
        me={user.id}
        names={names}
        lowStock={lowStock}
        requests={requests}
        proposals={proposals}
        answers={answers}
        reviews={reviews}
      />
    </main>
  );
}
