import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminListReviews,
  adminSetReviewApproval,
  adminDeleteReview,
} from "@/lib/admin-extra.functions";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/star-rating";
import { Skeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/state-blocks";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsPage,
});

type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string | null;
  is_approved: boolean;
  created_at: string;
  product: { name: string; slug: string } | null;
};

function AdminReviewsPage() {
  const list = useServerFn(adminListReviews);
  const setApproval = useServerFn(adminSetReviewApproval);
  const remove = useServerFn(adminDeleteReview);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => list() as Promise<ReviewRow[]>,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });

  const approveMutation = useMutation({
    mutationFn: (v: { id: string; approved: boolean }) => setApproval({ data: v }),
    onSuccess: (_r, v) => {
      invalidate();
      toast.success(v.approved ? "Review published" : "Review hidden");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Review deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="text-lg font-bold text-foreground">Reviews</h1>
      <p className="mb-4 text-xs text-muted-foreground">Publish, hide or remove customer reviews</p>

      {isError ? (
        <ErrorState description="Could not load reviews." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No reviews yet.
        </p>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((r) => (
            <article key={r.id} className="rounded-2xl border border-border bg-card p-4 card-elevated">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.product?.name ?? "Removed product"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StarRating value={r.rating} />
                    <span className="text-[11px] text-muted-foreground">{formatDate(r.created_at)}</span>
                    {!r.is_approved && (
                      <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={r.is_approved ? "Hide review" : "Publish review"}
                  onClick={() => approveMutation.mutate({ id: r.id, approved: !r.is_approved })}
                >
                  {r.is_approved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete review"
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {r.title && <h2 className="mt-2 text-sm font-semibold">{r.title}</h2>}
              {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
              <p className="mt-2 text-[11px] text-muted-foreground">— {r.author_name ?? "Customer"}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
