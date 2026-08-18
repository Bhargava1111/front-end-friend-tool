export const STORE_BRAND = {
  name: "SRI MAHALAKSHMI STORES",
  tagline: "Groceries & Pooja Essentials · Doorstep delivery",
} as const;

export const INVOICE_COMPANY = {
  legalName: "SREE MAHALAKSHMI AGENCIES - (25-26)",
  addressLines: ["3-3-134 Aryanagar Zaheerabad", "Dist Sangareddy - 502220"],
  state: "Telangana",
  stateCode: "36",
  phones: "9866900005, 9170256789, 9120756789",
  email: "Sreemahalakshmiagencieszhb@gmail.com",
  gstin: "36AJAPA6782A1ZO",
  banks: [
    {
      name: "BANK OF BARODA",
      account: "49660200000099",
      branchIfsc: "Zaheerabad & BARB0ZAHEER",
    },
    {
      name: "BOB OD 49660400000337",
      account: "49660400000337",
      branchIfsc: "ZAHEERABAD & BARB0ZAHEER",
    },
  ],
  defaultHsn: "2106",
  defaultGstPercent: 5,
} as const;

export type InvoiceApiPayload = {
  invoice_number: string;
  order_number: string;
  date: string;
  customer: { name: string; phone: string; address: string; gstin?: string | null };
  items: Array<{
    name: string;
    qty: number;
    unit?: string | null;
    unit_price: number;
    line_total: number;
    hsn: string;
    gst_percent?: number;
    discount_percent?: number;
  }>;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  cgst: number;
  sgst: number;
  tax: number;
  total: number;
  payment_method?: string | null;
  payment_status?: string | null;
  company?: Partial<typeof INVOICE_COMPANY>;
};
