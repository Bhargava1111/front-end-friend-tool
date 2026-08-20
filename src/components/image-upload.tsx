import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { uploadMedia, type MediaFolder } from "@/lib/media";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function useUploader(folder: MediaFolder, onDone: (urls: string[]) => void, onBusyChange?: (busy: boolean) => void) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const { url } = await uploadMedia(file, folder);
        urls.push(url);
      }
      onDone(urls);
      toast.success(urls.length > 1 ? `${urls.length} images uploaded` : "Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  return { busy, handleFiles };
}

/** Drag-and-drop single image uploader with a URL fallback field. */
export function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  aspect = "aspect-[16/7]",
  required,
  hint,
  onBusyChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: MediaFolder;
  aspect?: string;
  required?: boolean;
  hint?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const { busy, handleFiles } = useUploader(
    folder,
    (urls) => urls[0] && onChange(urls[0]),
    onBusyChange,
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          drag ? "border-primary bg-primary/5" : "border-border bg-secondary/40",
        )}
      >
        {value ? (
          <div className={cn("relative w-full", aspect)}>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-foreground/70 to-transparent p-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-background/90 px-2.5 py-1.5 text-[11px] font-semibold text-foreground"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label="Remove image"
                className="grid h-7 w-7 place-items-center rounded-lg bg-destructive text-destructive-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 px-4 py-8 text-center",
              aspect,
            )}
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <UploadCloud className="h-6 w-6 text-primary" />
            )}
            <span className="text-xs font-semibold text-foreground">
              {busy ? "Uploading…" : "Drop an image or click to upload"}
            </span>
            <span className="text-[11px] text-muted-foreground">PNG, JPG or WEBP · up to 8 MB</span>
          </button>
        )}
        {busy && value && (
          <div className="absolute inset-0 grid place-items-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Input
        value={value}
        required={required && !busy}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…or paste an image URL"
        className="h-9 text-xs"
        aria-invalid={required && !busy && !value ? true : undefined}
      />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Multi-image uploader used for product galleries; supports reordering. */
export function MultiImageUpload({
  label,
  values,
  onChange,
  folder,
}: {
  label: string;
  values: string[];
  onChange: (urls: string[]) => void;
  folder: MediaFolder;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const { busy, handleFiles } = useUploader(folder, (urls) => onChange([...values, ...urls]));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= values.length) return;
    const next = [...values];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {values.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
          >
            <img src={url} alt={`${label} ${i + 1}`} className="h-full w-full object-cover" />
            <span className="absolute left-1 top-1 rounded bg-foreground/70 px-1.5 py-0.5 text-[10px] font-bold text-background">
              {i === 0 ? "Main" : i + 1}
            </span>
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-foreground/60 px-1 py-1">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Move left"
                  onClick={() => move(i, i - 1)}
                  className="rounded bg-background/90 px-1 text-[10px] font-bold text-foreground"
                >
                  ‹
                </button>
                <GripVertical className="h-3 w-3 text-background/70" />
                <button
                  type="button"
                  aria-label="Move right"
                  onClick={() => move(i, i + 1)}
                  className="rounded bg-background/90 px-1 text-[10px] font-bold text-foreground"
                >
                  ›
                </button>
              </div>
              <button
                type="button"
                aria-label={`Remove image ${i + 1}`}
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                className="grid h-5 w-5 place-items-center rounded bg-destructive text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={cn(
            "grid aspect-square place-items-center rounded-xl border-2 border-dashed text-center transition-colors",
            drag ? "border-primary bg-primary/5" : "border-border bg-secondary/40",
          )}
        >
          <span className="flex flex-col items-center gap-1 px-1">
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <ImagePlus className="h-5 w-5 text-primary" />
            )}
            <span className="text-[10px] font-semibold text-foreground">
              {busy ? "Uploading" : "Add images"}
            </span>
          </span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-[11px] text-muted-foreground">
        First image is the main product photo. Upload as many as you like.
      </p>
    </div>
  );
}
