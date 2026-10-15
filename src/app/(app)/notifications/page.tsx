import { redirect } from "next/navigation";
import { NotificationsList } from "./notifications-list";
import { getNames, getNotifications, getUser } from "@/lib/session";

/**
 * Notifications (ticket 38; was a Workspace tab), opened from the bell
 * in the top bar. Same reminders the bell counts: getNotifications is
 * shared with the layout, so they are worked out once per page load.
 * Old /workspace?tab=notifications links redirect here.
 */
export default async function NotificationsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const [{ alerts, lowStock, requests, proposals, answers }, names] = await Promise.all([getNotifications(), getNames()]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-tertiary md:text-3xl">Notifications</h1>
        <p className="text-sm text-muted-foreground">What needs you right now, in your shop.</p>
      </header>
      <NotificationsList
        alerts={alerts}
        me={user.id}
        names={names}
        lowStock={lowStock}
        requests={requests}
        proposals={proposals}
        answers={answers}
      />
    </main>
  );
}
