"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";

export type JobPhoto = { path: string; url: string; kind: "before" | "after" };

const BUCKET = "job-photos";
const MAX_PER_SIDE = 4;
const MAX_EDGE = 1600; // px: plenty for checking scratches, small to upload

/**
 * Before-and-after photos of the device (ticket 64): up to four each.
 * Stored privately in Supabase Storage (supabase/sql/030); only the shop
 * sees them, through short-lived links. On a phone "Add photo" offers the
 * camera or the photo library. Photos are shrunk in the browser before
 * uploading (~300 KB), so they go up quickly on mobile data.
 */
export function JobPhotos({
  shopId,
  jobId,
  photos,
  editable,
}: {
  shopId: string;
  jobId: string;
  photos: JobPhoto[];
  editable: boolean;
}) {
  const [viewing, setViewing] = useState<JobPhoto | null>(null);
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {(["before", "after"] as const).map((kind) => (
        <Side
          key={kind}
          kind={kind}
          shopId={shopId}
          jobId={jobId}
          photos={photos.filter((p) => p.kind === kind)}
          editable={editable}
          onView={setViewing}
        />
      ))}
      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.kind === "after" ? "After the repair" : "Before the repair"}
        wide
      >
        {viewing && (
          // eslint-disable-next-line @next/next/no-img-element -- a private, signed link; next/image can't optimise it
          <img src={viewing.url} alt="" className="max-h-[75dvh] w-full rounded-[var(--radius)] object-contain" />
        )}
      </Modal>
    </div>
  );
}

function Side({
  kind,
  shopId,
  jobId,
  photos,
  editable,
  onView,
}: {
  kind: "before" | "after";
  shopId: string;
  jobId: string;
  photos: JobPhoto[];
  editable: boolean;
  onView: (p: JobPhoto) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState<string | null>(null);
  const full = photos.length >= MAX_PER_SIDE;

  // Uploads the photos one by one. If one fails (say, the signal drops),
  // a toast offers "Try again", which carries on from that photo (ticket 67).
  function upload(files: FileList | File[] | null) {
    const list = [...(files ?? [])].slice(0, MAX_PER_SIDE - photos.length);
    if (list.length === 0) return;
    setError(undefined);
    startTransition(async () => {
      const supabase = createClient();
      for (const [i, file] of list.entries()) {
        let blob: Blob;
        try {
          blob = await shrink(file);
        } catch {
          setError("That file isn't a photo we can read. Try a JPEG or PNG.");
          return;
        }
        const path = `${shopId}/${jobId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upError } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
        if (upError) {
          setError(/bucket not found/i.test(upError.message) ? "Run 030 in Supabase first." : upError.message);
          if (i > 0) router.refresh();
          const rest = list.slice(i);
          toast({
            kind: "error",
            title: rest.length > 1 ? `${rest.length} photos didn't upload` : "A photo didn't upload",
            description: "Check the connection, then try again.",
            action: { label: "Try again", onClick: () => upload(rest) },
          });
          return;
        }
      }
      router.refresh();
      toast({ title: list.length > 1 ? `${list.length} photos added` : "Photo added" });
    });
  }

  function remove(path: string) {
    setError(undefined);
    startTransition(async () => {
      const { error: delError } = await createClient().storage.from(BUCKET).remove([path]);
      if (delError) {
        setError(delError.message);
        toast({ kind: "error", title: "Couldn't delete the photo", action: { label: "Try again", onClick: () => remove(path) } });
      } else toast({ title: "Photo deleted" });
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-2" aria-label={kind === "before" ? "Before" : "After"}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{kind === "before" ? "Before" : "After"}</h3>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{MAX_PER_SIDE}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {photos.map((p) => (
          <div key={p.path} className="group/photo relative aspect-square overflow-hidden rounded-[var(--radius)] border border-border bg-muted">
            <button type="button" onClick={() => onView(p)} className="size-full" aria-label="View larger">
              {/* eslint-disable-next-line @next/next/no-img-element -- a private, signed link */}
              <img src={p.url} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover/photo:scale-[1.03]" />
            </button>
            {editable &&
              (deleting === p.path ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-2 text-center text-xs text-white">
                  Delete this photo?
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" variant="destructive" className="h-7 px-2" disabled={pending} onClick={() => remove(p.path)}>
                      Yes
                    </Button>
                    <Button type="button" size="sm" variant="secondary" className="h-7 px-2" disabled={pending} onClick={() => setDeleting(null)}>
                      No
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleting(p.path)}
                  aria-label="Delete photo"
                  className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-90 hover:bg-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              ))}
          </div>
        ))}

        {editable && !full && (
          <button
            type="button"
            disabled={pending}
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[var(--radius)] border border-dashed border-input text-xs text-muted-foreground hover:border-ring hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            {pending ? (
              "Uploading…"
            ) : (
              <>
                <span className="flex gap-1">
                  <Camera className="size-5" aria-hidden />
                  <ImagePlus className="size-5" aria-hidden />
                </span>
                Add photo
              </>
            )}
          </button>
        )}
        {!editable && photos.length === 0 && <p className="col-span-2 text-xs text-muted-foreground">No photos.</p>}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          upload(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

// Shrinks a photo to at most MAX_EDGE px on its longest side and saves it
// as a JPEG, the right way up (phones store some photos sideways).
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the photo"))), "image/jpeg", 0.8),
  );
}
