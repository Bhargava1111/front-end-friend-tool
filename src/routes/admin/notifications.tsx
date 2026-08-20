import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useAdminFn } from "@/hooks/use-admin-fn";
import { adminBroadcastNotificationClient } from "@/lib/admin-client.functions";

import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { adminBroadcastNotification } from "@/lib/admin-extra.functions";
import { ImageUploadField } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notifications")({
  component: AdminNotificationsPage,
});

const TEMPLATES = [
  { title: "Weekend offer", body: "Flat 15% off on all pooja essentials this weekend. Use code POOJA15." },
  { title: "Festival hours", body: "Our outlets stay open until midnight through the festival week." },
  { title: "Fresh stock", body: "New harvest sona masoori rice is in stock. Order before it sells out." },
];

function AdminNotificationsPage() {
  const send = useAdminFn(adminBroadcastNotification, adminBroadcastNotificationClient);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState<"all" | "admins">("all");

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          title: title.trim(),
          body: body.trim(),
          audience,
          image_url: imageUrl.trim() || undefined,
        },
      }),
    onSuccess: (res: { sent: number }) => {
      toast.success(`Sent to ${res.sent} ${res.sent === 1 ? "person" : "people"}`);
      setTitle("");
      setBody("");
      setImageUrl("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-bold text-foreground">Notifications</h1>
      <p className="mb-4 text-xs text-muted-foreground">
        Push an announcement to the notification centre of every customer
      </p>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 card-elevated">
        <div>
          <Label className="text-xs">Audience</Label>
          <div className="mt-2 flex gap-2">
            {(["all", "admins"] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={audience === a}
                onClick={() => setAudience(a)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-medium capitalize transition-colors",
                  audience === a ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {a === "all" ? "All customers" : "Admins only"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="n-title">Title</Label>
          <Input
            id="n-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Weekend offer"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-body">Message</Label>
          <Textarea
            id="n-body"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-28 rounded-xl"
            placeholder="Flat 15% off on all pooja essentials this weekend."
          />
        </div>

        <ImageUploadField
          label="Banner image (optional)"
          folder="banners"
          value={imageUrl}
          onChange={setImageUrl}
          aspect="aspect-[16/7]"
          hint="Wide promo image shown at the top of the notification. Leave empty for text-only."
        />

        <Button
          className="h-11 w-full rounded-xl"
          disabled={!title.trim() || !body.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Send className="mr-2 h-4 w-4" /> Send notification
        </Button>
      </div>

      <h2 className="mb-2 mt-6 flex items-center gap-1.5 text-sm font-bold">
        <Megaphone className="h-4 w-4 text-primary" /> Quick templates
      </h2>
      <div className="space-y-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={() => {
              setTitle(t.title);
              setBody(t.body);
              setImageUrl("");
            }}
            className="block w-full rounded-2xl border border-border bg-card p-4 text-left card-elevated"
          >
            <p className="text-sm font-semibold">{t.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
