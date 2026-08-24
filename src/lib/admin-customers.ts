export type AdminCustomerRow = {
  full_name?: string | null;
  email?: string | null;
  is_active?: boolean;
};

export function isDeletedCustomer(c: AdminCustomerRow) {
  if ((c.full_name ?? "").trim() === "Deleted User") return true;
  const email = (c.email ?? "").trim().toLowerCase();
  return c.is_active === false && email.endsWith("@deleted.local");
}

export function withoutDeletedCustomers<T extends AdminCustomerRow>(rows: T[]) {
  return rows.filter((c) => !isDeletedCustomer(c));
}
