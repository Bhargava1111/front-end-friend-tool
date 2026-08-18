import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Clock, LocateFixed, ShieldCheck, TriangleAlert } from "lucide-react";
import { getMyVerification, submitVerification } from "@/lib/account.functions";
import { useSession } from "@/hooks/use-shop";
import { useStores } from "@/components/location-bar";
import { StoreMap } from "@/components/store-map";
import { addressFromCoords } from "@/lib/geo";
import { getDeviceCoords } from "@/lib/device-location";
import { toLocalPhoneDigits } from "@/lib/phone-utils";
import { PageShell, TopBar } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/verify-account")({
  head: () => ({
    meta: [
      { title: "Verify your account — Sri Mahalakshmi Stores" },
      {
        name: "description",
        content:
          "Share your mobile number, delivery address and exact location so our team can approve your account.",
      },
      { property: "og:title", content: "Verify your account — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "One-time verification before your first order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyAccount,
});

function VerifyAccount() {
  const qc = useQueryClient();
  const { session } = useSession();
  const fetchStatus = useServerFn(getMyVerification);
  const submit = useServerFn(submitVerification);
  const { data: stores = [] } = useStores();

  const { data } = useQuery({
    queryKey: ["my-verification"],
    queryFn: () => fetchStatus(),
    enabled: !!session,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName((v) => v || (data.full_name ?? ""));
    setPhone((v) => v || toLocalPhoneDigits(data.phone ?? ""));
    setAddress((v) => v || (data.address_text ?? ""));
    setPincode((v) => v || (data.pincode ?? ""));
    if (data.latitude != null && data.longitude != null) {
      setCoords((c) =>
        c ?? { lat: data.latitude!, lng: data.longitude!, accuracy: data.location_accuracy_m },
      );
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          full_name: name,
          phone,
          address_text: address,
          pincode,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          location_accuracy_m: coords?.accuracy ?? null,
        },
      }),
    onSuccess: () => {
      toast.success("Details sent for verification");
      qc.invalidateQueries({ queryKey: ["my-verification"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function detect() {
    setLocating(true);
    try {
      const pos = await getDeviceCoords();
      setCoords({
        lat: pos.latitude,
        lng: pos.longitude,
        accuracy: pos.accuracy ?? null,
      });

      const place = await addressFromCoords(pos.latitude, pos.longitude);
      const fullAddress = [place.line1, place.line2, place.city, place.state]
        .filter(Boolean)
        .join(", ");
      setAddress((current) => current || fullAddress);
      setPincode((current) => current || place.pincode);

      toast.success(
        pos.accuracy && pos.accuracy > 150
          ? "Location saved — accuracy is low, try again outdoors"
          : "Location captured and address filled from GPS",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read your location. Enable GPS and try again.");
    } finally {
      setLocating(false);
    }
  }

  const status = data?.verification_status ?? "pending";
  const accuracyPoor = coords?.accuracy != null && coords.accuracy > 150;

  if (status === "verified") {
    return (
      <PageShell withCartBar={false}>
        <TopBar title="Account verified" backTo="/profile" />
        <div className="p-4">
          <div className="rounded-2xl border border-primary/30 bg-primary-soft p-6 text-center">
            <BadgeCheck className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-3 text-base font-bold text-foreground">You're all set</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account is verified. You can place orders right away.
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link to="/">Start shopping</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell withCartBar={false}>
      <TopBar title="Verify your account" subtitle="One-time check before ordering" backTo="/profile" />

      <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0">
        <div className="space-y-4">
          {status === "submitted" && (
            <div className="flex gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Awaiting admin approval</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Our team is checking your address and location. You can update the details below
                  any time before approval.
                </p>
              </div>
            </div>
          )}
          {status === "rejected" && (
            <div className="flex gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-foreground">Verification declined</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data?.rejection_reason ?? "Please recheck your details and submit again."}
                </p>
              </div>
            </div>
          )}
          {status === "pending" && (
            <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Why we verify</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  We deliver from a single store, so we confirm your number and pin before the first
                  order. It takes only a few minutes during store hours.
                </p>
              </div>
            </div>
          )}

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="v-name">Full name</Label>
              <Input id="v-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="v-phone">Mobile number</Label>
                <Input
                  id="v-phone"
                  required
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              <div>
                <Label htmlFor="v-pin">Pincode</Label>
                <Input
                  id="v-pin"
                  required
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="v-address">Delivery address</Label>
              <Textarea
                id="v-address"
                required
                rows={3}
                placeholder="Flat / house, street, area, landmark, city"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2"
              disabled={locating}
              onClick={detect}
            >
              <LocateFixed className="h-4 w-4" />
              {locating ? "Reading GPS…" : coords ? "Recapture my location" : "Capture my location"}
            </Button>

            {coords && (
              <p className="text-xs text-muted-foreground">
                Pin: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                {coords.accuracy != null ? ` · accuracy ±${Math.round(coords.accuracy)} m` : ""}
              </p>
            )}
            {accuracyPoor && (
              <p className="text-xs text-destructive">
                Accuracy is low. Step outdoors and capture again so delivery lands at the right door.
              </p>
            )}

            <Button type="submit" className="h-12 w-full rounded-xl" disabled={mutation.isPending}>
              {mutation.isPending
                ? "Submitting…"
                : status === "submitted"
                  ? "Update my details"
                  : "Send for verification"}
            </Button>
          </form>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confirm the pin
          </p>
          <StoreMap stores={stores} center={coords} className="h-64 lg:h-[26rem]" />
          <p className="text-xs text-muted-foreground">
            Drop the pin exactly at your door. Our team compares it with the address before approving.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
