import { redirect } from "next/navigation";

// "My details" became Account (ticket 34). Old links land there.
export default function DetailsPage() {
  redirect("/account");
}
