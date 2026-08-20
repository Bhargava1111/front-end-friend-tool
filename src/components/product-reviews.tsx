import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getProductReviews } from "@/lib/storefront.functions";
import { submitReview } from "@/lib/engage.functions";
import { useSession } from "@/hooks/use-shop";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "./skeletons";
import { formatDate } from "@/lib/format";

export function ProductReviews({ productId }: { productId: string }) {
  const send = useServerFn(submitReview);
  const queryClient = useQueryClient();
  const { session, user } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => getProductReviews({ data: { productId } }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          authorName: user?.email?.split("@")[0],
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
      toast.success("Thanks — your review is live");
      setOpen(false);
      setTitle("");
      setBody("");
      setRating(5);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-7 px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Ratings &amp; reviews</h2>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            if (!session) {
              toast.info("Please sign in to write a review");
              navigate({ to: "/auth" });
              return;
            }
            setOpen((o) => !o);
          }}
        >
          <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" /> Write
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="mt-3 h-24 w-full" />
      ) : (
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          {data && data.total > 0 ? (
            <div className="flex items-center gap-5">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{data.average}</p>
                <StarRating value={data.average} className="mt-1 justify-center" />
                <p className="mt-1 text-[11px] text-muted-foreground">{data.total} reviews</p>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                {data.distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-2">
                    <span className="w-3 text-[11px] text-muted-foreground">{d.star}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${data.total ? (d.count / data.total) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="w-4 text-right text-[11px] text-muted-foreground">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reviews yet — be the first to rate this product.
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4 card-elevated">
          <div>
            <Label className="text-xs">Your rating</Label>
            <StarRating value={rating} onChange={setRating} size={16} className="mt-1 -ml-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-title" className="text-xs">
              Headline
            </Label>
            <Input
              id="review-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fresh and well packed"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-body" className="text-xs">
              Your review
            </Label>
            <Textarea
              id="review-body"
              value={body}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you think of the quality, quantity and packaging?"
              className="rounded-xl"
            />
          </div>
          <Button
            className="w-full rounded-xl"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Post review
          </Button>
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        {(data?.reviews ?? []).map((r) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-4 card-elevated">
            <div className="flex items-center justify-between gap-3">
              <StarRating value={r.rating} />
              <span className="text-[11px] text-muted-foreground">{formatDate(r.created_at)}</span>
            </div>
            {r.title && <h3 className="mt-2 text-sm font-semibold">{r.title}</h3>}
            {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
            <p className="mt-2 text-[11px] text-muted-foreground">— {r.author_name ?? "Verified buyer"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
