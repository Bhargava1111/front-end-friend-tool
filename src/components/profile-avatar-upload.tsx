import { useRef, useState } from "react";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { ensureValidAccessToken } from "@/lib/auth-session";
import { getApiBase } from "@/lib/api";
import { validateImageFile } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (url: string) => void;
  initials?: string;
};

/** Profile photo uploader — uses POST/DELETE /me/avatar/ (not admin /media/). */
export function ProfileAvatarUpload({ value, onChange, initials = "?" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const token = await ensureValidAccessToken();
      if (!token) throw new Error("Sign in to upload a profile photo.");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${getApiBase()}/me/avatar/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Upload failed.");
      }
      const data = (await res.json()) as { url: string; avatar_url: string };
      const url = data.avatar_url || data.url;
      onChange(url);
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!value) return;
    if (!confirm("Remove your profile photo?")) return;
    setBusy(true);
    try {
      const token = await ensureValidAccessToken();
      if (!token) throw new Error("Sign in to remove your photo.");
      const res = await fetch(`${getApiBase()}/me/avatar/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail ?? "Could not remove photo.");
      }
      onChange("");
      toast.success("Profile photo removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative mx-auto max-w-sm overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          drag ? "border-primary bg-primary/5" : "border-border bg-secondary/40",
        )}
      >
        {value ? (
          <div className="relative aspect-square w-full">
            <img src={value} alt="Profile" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-foreground/70 to-transparent p-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="rounded-lg bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={busy}
                aria-label="Remove profile photo"
                className="grid h-8 w-8 place-items-center rounded-lg bg-destructive text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center"
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {busy ? <Loader2 className="h-8 w-8 animate-spin" /> : initials}
            </div>
            {!busy && <UploadCloud className="h-6 w-6 text-primary" />}
            <span className="text-sm font-semibold text-foreground">
              {busy ? "Uploading…" : "Drop a photo or click to upload"}
            </span>
            <span className="text-xs text-muted-foreground">PNG, JPG or WEBP · up to 8 MB</span>
          </button>
        )}
        {busy && value && (
          <div className="absolute inset-0 grid place-items-center bg-background/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {value && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" className="text-destructive" disabled={busy} onClick={() => void remove()}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete photo
          </Button>
        </div>
      )}
    </div>
  );
}
