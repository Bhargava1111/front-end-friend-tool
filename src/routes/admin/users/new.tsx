import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createAdminUser } from "@/lib/admin-ops.functions";
import { AdminFormShell } from "@/components/admin-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/users/new")({
  component: NewUser,
});

function NewUser() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createAdminUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<"customer" | "admin">("customer");

  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          email,
          password,
          full_name: name,
          phone,
          address_text: address || undefined,
          role,
          verified: true,
        },
      }),
    onSuccess: () => {
      toast.success("User created and verified");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      navigate({ to: "/admin/users" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminFormShell backTo="/admin/users" backLabel="Back to users" title="Add user">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="u-email">Email</Label>
          <Input
            id="u-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="u-password">Temporary password</Label>
          <Input
            id="u-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="u-name">Full name</Label>
            <Input id="u-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="u-phone">Phone</Label>
            <Input
              id="u-phone"
              required
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="u-address">Address</Label>
          <Textarea
            id="u-address"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "customer" | "admin")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating…" : "Create user"}
        </Button>
      </form>
    </AdminFormShell>
  );
}
