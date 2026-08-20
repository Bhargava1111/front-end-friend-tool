import { useSession } from "@/hooks/use-shop";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LocateFixed, MapPin, Pencil, Plus, Trash2, Home, Briefcase, MapPinned } from "lucide-react";
import { toast } from "sonner";
import { getAddresses, saveAddress, deleteAddress } from "@/lib/shop.functions";
import { detectCurrentAddress } from "@/lib/geo";
import { PageShell, TopBar, EmptyState } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Address } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/addresses")({
  head: () => ({
    meta: [
      { title: "Saved Addresses — Sri Mahalakshmi Stores" },
      { name: "description", content: "Add and manage your delivery addresses." },
      { property: "og:title", content: "Saved Addresses — Sri Mahalakshmi Stores" },
      { property: "og:description", content: "Manage delivery addresses for faster checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddressesPage,
});

type FormState = {
  id?: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default: boolean;
};

function newAddressForm(user?: { full_name?: string | null; phone?: string | null } | null): FormState {
  return {
    label: "Home",
    recipient_name: user?.full_name ?? "",
    phone: user?.phone ?? "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
    is_default: false,
  };
}

function AddressesPage() {
  const queryClient = useQueryClient();
  const { session, user } = useSession();
  const fetchAddresses = getAddresses;
  const save = saveAddress;
  const remove = deleteAddress;
  const [form, setForm] = useState<FormState | null>(null);
  const autoFilled = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => fetchAddresses() as Promise<Address[]>,
    enabled: !!session,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["addresses"] });

  const saveMutation = useMutation({
    mutationFn: (values: FormState) => save({ data: { ...values, line2: values.line2 || undefined } }),
    onSuccess: () => {
      invalidate();
      setForm(null);
      toast.success("Address saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Address removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addresses = data ?? [];

  function openNewForm() {
    autoFilled.current = false;
    setForm(newAddressForm(user));
  }

  return (
    <PageShell>
      <TopBar
        title="Saved Addresses"
        subtitle={`${addresses.length} saved`}
        action={
          <button
            type="button"
            aria-label="Add address"
            onClick={openNewForm}
            className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        }
      />

      {form && (
        <AddressForm
          form={form}
          setForm={setForm}
          autoFillOnMount={!form.id && !autoFilled.current}
          onAutoFilled={() => {
            autoFilled.current = true;
          }}
          onCancel={() => setForm(null)}
          onSave={(values) => saveMutation.mutate(values)}
          saving={saveMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : addresses.length === 0 && !form ? (
        <EmptyState
          icon={<MapPin className="h-8 w-8" />}
          title="No addresses yet"
          description="Add a delivery address for faster checkout."
          action={
            <Button className="rounded-xl" onClick={openNewForm}>
              Add address
            </Button>
          }
        />
      ) : (
        <div className="space-y-3 p-4">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4 card-elevated">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {a.label}
                </span>
                {a.is_default && (
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Default
                  </span>
                )}
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    aria-label="Edit address"
                    onClick={() =>
                      setForm({
                        ...a,
                        line2: a.line2 ?? "",
                        landmark: a.landmark ?? "",
                        latitude: a.latitude ?? null,
                        longitude: a.longitude ?? null,
                      })
                    }
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete address"
                    onClick={() => deleteMutation.mutate(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{a.recipient_name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.phone}</p>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function AddressForm({
  form,
  setForm,
  autoFillOnMount,
  onAutoFilled,
  onCancel,
  onSave,
  saving,
}: {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  autoFillOnMount: boolean;
  onAutoFilled: () => void;
  onCancel: () => void;
  onSave: (values: FormState) => void;
  saving: boolean;
}) {
  const [locating, setLocating] = useState(false);

  async function fillFromGps() {
    setLocating(true);
    try {
      const parsed = await detectCurrentAddress();
      setForm((current) => ({
        ...current,
        line1: parsed.line1,
        line2: parsed.line2 || parsed.landmark || current.line2,
        city: parsed.city || current.city,
        state: parsed.state || current.state,
        pincode: parsed.pincode || current.pincode,
        landmark: parsed.landmark,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      }));
      onAutoFilled();
      toast.success("Address filled from your location");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't detect address");
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (!autoFillOnMount) return;
    void fillFromGps();
  }, [autoFillOnMount]);

  return (
    <form
      className="m-4 space-y-3 rounded-2xl border border-border bg-card p-4 card-elevated"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{form.id ? "Edit address" : "New address"}</h2>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 text-xs"
          disabled={locating}
          onClick={() => void fillFromGps()}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {locating ? "Detecting…" : "Use my location"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs font-semibold">Address label</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { label: "Home", icon: Home },
              { label: "Work", icon: Briefcase },
              { label: "Other", icon: MapPinned },
            ].map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => setForm({ ...form, label })}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  form.label === label
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Recipient"
          value={form.recipient_name}
          onChange={(v) => setForm({ ...form, recipient_name: v })}
          required
        />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
      </div>
      <Field
        label="House no. & floor"
        value={form.line1}
        onChange={(v) => setForm({ ...form, line1: v })}
        required
        placeholder="House No. & Floor"
      />
      <Field
        label="Building & block (optional)"
        value={form.line2}
        onChange={(v) => setForm({ ...form, line2: v })}
        placeholder="Building & Block No."
      />
      <Field
        label="Landmark & area (optional)"
        value={form.landmark ?? ""}
        onChange={(v) => setForm({ ...form, landmark: v })}
        placeholder="Landmark & Area Name"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
        <Field
          label="State"
          value={form.state}
          onChange={(v) => setForm({ ...form, state: v })}
          required
        />
      </div>
      <Field
        label="Pincode"
        value={form.pincode}
        onChange={(v) => setForm({ ...form, pincode: v.replace(/\D/g, "").slice(0, 6) })}
        required
      />
      <div className="flex items-center justify-between pt-1">
        <Label htmlFor="default">Set as default</Label>
        <Switch
          id="default"
          checked={form.is_default}
          onCheckedChange={(v) => setForm({ ...form, is_default: v })}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1 rounded-xl" disabled={saving || locating}>
          Save
        </Button>
        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
