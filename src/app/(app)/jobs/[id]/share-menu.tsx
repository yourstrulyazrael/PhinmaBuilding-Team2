"use client";

import { ChevronDown, ExternalLink, Link2, MessageSquareText, Share2 } from "lucide-react";
import { Menu } from "@/components/menu";
import { useCopy } from "@/components/copy-button";
import { buttonVariants } from "@/components/ui/button";

/**
 * One "Share" button on the repair page instead of three: copy the update
 * message, copy the tracking link, or open the customer's page in a new
 * tab. Copies confirm with a toast.
 */
export function ShareMenu({ message, url, trackingPath }: { message: string; url: string; trackingPath: string }) {
  const copy = useCopy();
  return (
    <Menu
      label="Share with the customer"
      align="end"
      triggerClassName={buttonVariants({ variant: "secondary", size: "sm" })}
      trigger={
        <>
          <Share2 className="size-4" aria-hidden />
          Share
          <ChevronDown className="size-4 opacity-60" aria-hidden />
        </>
      }
      items={[
        { label: "Copy update message", icon: MessageSquareText, onSelect: () => void copy(message, "Message") },
        { label: "Copy tracking link", icon: Link2, onSelect: () => void copy(url, "Tracking link") },
        { label: "Open customer view", icon: ExternalLink, onSelect: () => window.open(trackingPath, "_blank", "noopener") },
      ]}
    />
  );
}
