import type { Order } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { INVOICE_COMPANY, STORE_BRAND, type InvoiceApiPayload } from "@/lib/invoice-config";

const GREEN: [number, number, number] = [31, 81, 54];
const GOLD: [number, number, number] = [242, 164, 19];
const CREAM: [number, number, number] = [250, 246, 236];
const DARK: [number, number, number] = [32, 38, 31];
const MUTED: [number, number, number] = [120, 126, 118];

const rupee = (v: number | string) =>
  `Rs. ${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t] ?? ""}${o ? ` ${ONES[o]}` : ""}`.trim();
}

function threeDigits(n: number): string {
  if (n < 100) return twoDigits(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${ONES[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ""}`;
}

export function amountInWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "INR Zero Only";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return `INR ${parts.join(" ")} Only`;
}

function invoiceNumberFromOrder(orderNumber: string, existing?: string) {
  if (existing && existing.includes("/")) return existing;
  const num = orderNumber.replace(/^MNX-/, "");
  return `SMA/${num}/25-26`;
}

function labelStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelPayment(method?: string | null) {
  if (!method) return "-";
  if (method === "cod") return "Cash on delivery";
  if (method === "upi") return "UPI";
  if (method === "card") return "Card";
  return method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildInvoicePayload(order: Order, api?: InvoiceApiPayload | null): InvoiceApiPayload {
  const company = { ...INVOICE_COMPANY, ...api?.company };
  const gstPercent = company.defaultGstPercent;
  const halfGst = gstPercent / 2;

  const items =
    api?.items ??
    (order.order_items ?? []).map((item) => ({
      name: `${item.product_name}${item.product_weight ? ` (${item.product_weight})` : ""}`,
      qty: item.quantity,
      unit: "Pcs",
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
      hsn: company.defaultHsn,
      gst_percent: gstPercent,
      discount_percent: 0,
    }));

  const subtotal = api?.subtotal ?? Number(order.subtotal);
  const discount = api?.discount ?? Number(order.discount ?? 0);
  const deliveryFee = api?.delivery_fee ?? Number(order.delivery_fee ?? 0);
  const taxableBase = Math.max(0, subtotal - discount);
  const cgst = api?.cgst ?? taxableBase * (halfGst / 100);
  const sgst = api?.sgst ?? taxableBase * (halfGst / 100);
  const tax = api?.tax ?? Number(order.tax ?? cgst + sgst);
  const total = api?.total ?? Number(order.total);

  return {
    invoice_number: api?.invoice_number ?? invoiceNumberFromOrder(order.order_number),
    order_number: order.order_number,
    date: api?.date ?? order.created_at,
    customer: api?.customer ?? {
      name: order.recipient_name,
      phone: order.phone,
      address: order.address_text,
      gstin: null,
    },
    items,
    subtotal,
    discount,
    delivery_fee: deliveryFee,
    cgst,
    sgst,
    tax,
    total,
    payment_method: api?.payment_method ?? order.payment_method,
    payment_status: api?.payment_status,
    company,
  };
}

export async function downloadInvoicePdf(order: Order, api?: InvoiceApiPayload | null) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const data = buildInvoicePayload(order, api);
  const company = { ...INVOICE_COMPANY, ...data.company };

  // Header band
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 96, W, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(STORE_BRAND.name, M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text(STORE_BRAND.tagline, M, 64);
  doc.setTextColor(255, 255, 255);
  doc.text(`GSTIN: ${company.gstin}`, M, 80);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INVOICE", W - M, 40, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.invoice_number, W - M, 56, { align: "right" });
  doc.text(`Order ${data.order_number}`, W - M, 70, { align: "right" });
  doc.text(formatDate(data.date), W - M, 84, { align: "right" });

  // Info cards
  let y = 130;
  const cardW = (W - M * 2 - 16) / 2;
  const drawCard = (x: number, title: string, lines: string[]) => {
    const filtered = lines.filter((l) => l.trim());
    const h = 28 + filtered.length * 14;
    doc.setFillColor(...CREAM);
    doc.roundedRect(x, y, cardW, h, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text(title.toUpperCase(), x + 12, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    filtered.forEach((l, i) => {
      doc.text(doc.splitTextToSize(l, cardW - 24)[0] ?? "", x + 12, y + 34 + i * 14);
    });
    return h;
  };

  const addressLines = doc.splitTextToSize(data.customer.address ?? order.address_text ?? "", cardW - 24) as string[];
  const h1 = drawCard(M, "Deliver to", [
    data.customer.name,
    ...addressLines.slice(0, 3),
    data.customer.phone,
    data.customer.gstin ? `GSTIN: ${data.customer.gstin}` : "",
  ]);
  const h2 = drawCard(M + cardW + 16, "Order details", [
    `Status: ${labelStatus(order.status)}`,
    order.delivery_date ? `Delivery: ${formatDate(order.delivery_date)}` : "Delivery: to be scheduled",
    order.delivery_slot ? `Slot: ${order.delivery_slot}` : "",
    `Payment: ${labelPayment(data.payment_method)}`,
    data.payment_status ? `Payment status: ${labelStatus(data.payment_status)}` : "",
  ]);
  y += Math.max(h1, h2) + 24;

  // Table header
  const cols = [M, M + 230, M + 300, M + 370];
  doc.setFillColor(...GREEN);
  doc.roundedRect(M, y, W - M * 2, 26, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ITEM", cols[0]! + 10, y + 17);
  doc.text("QTY", cols[1]!, y + 17);
  doc.text("RATE", cols[2]!, y + 17);
  doc.text("AMOUNT", W - M - 10, y + 17, { align: "right" });
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  data.items.forEach((item, i) => {
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    if (i % 2 === 0) {
      doc.setFillColor(...CREAM);
      doc.rect(M, y, W - M * 2, 24, "F");
    }
    doc.setTextColor(...DARK);
    const name = `${item.name}${item.hsn ? ` · HSN ${item.hsn}` : ""}`;
    doc.text(doc.splitTextToSize(name, 210)[0] ?? "", cols[0]! + 10, y + 16);
    doc.text(`${item.qty}${item.unit ? ` ${item.unit}` : ""}`, cols[1]!, y + 16);
    doc.setTextColor(...MUTED);
    doc.text(rupee(item.unit_price), cols[2]!, y + 16);
    doc.setTextColor(...DARK);
    doc.text(rupee(item.line_total), W - M - 10, y + 16, { align: "right" });
    y += 24;
  });

  // Totals
  y += 18;
  const boxX = W - M - 260;
  const rows: Array<[string, string]> = [["Subtotal", rupee(data.subtotal)]];
  if (Number(data.discount) > 0) {
    rows.push([
      `Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`,
      `- ${rupee(data.discount)}`,
    ]);
  }
  rows.push([
    "Delivery",
    Number(data.delivery_fee) === 0 ? "FREE" : rupee(data.delivery_fee),
  ]);
  if (Number(data.cgst) > 0) rows.push(["CGST", rupee(data.cgst)]);
  if (Number(data.sgst) > 0) rows.push(["SGST", rupee(data.sgst)]);
  if (Number(data.tax) > 0 && Number(data.cgst) === 0 && Number(data.sgst) === 0) {
    rows.push(["Taxes & charges", rupee(data.tax)]);
  }

  doc.setFillColor(...CREAM);
  doc.roundedRect(boxX, y, 260, rows.length * 20 + 58, 8, 8, "F");
  let ty = y + 22;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(label, boxX + 14, ty);
    doc.setTextColor(...DARK);
    doc.text(value, boxX + 246, ty, { align: "right" });
    ty += 20;
  });

  doc.setFillColor(...GOLD);
  doc.roundedRect(boxX, ty - 8, 260, 32, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("TOTAL", boxX + 14, ty + 13);
  doc.text(rupee(data.total), boxX + 246, ty + 13, { align: "right" });
  ty += 36;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const words = doc.splitTextToSize(amountInWords(data.total), 250) as string[];
  doc.text(words, boxX + 14, ty);

  // Legal footer
  const fy = doc.internal.pageSize.getHeight() - 72;
  doc.setFillColor(...GREEN);
  doc.rect(0, fy, W, 72, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Thank you for shopping with Sri Mahalakshmi Stores!", M, fy + 20);
  doc.setTextColor(...GOLD);
  doc.text(
    `${company.legalName} · ${company.addressLines.join(", ")} · ${company.email}`,
    M,
    fy + 36,
  );
  doc.text("This is a computer generated tax invoice.", M, fy + 52);
  doc.text(`Authorised signatory — ${company.legalName}`, W - M, fy + 52, { align: "right" });

  const fileName = `${data.invoice_number.replace(/\//g, "-")}-${data.order_number}-invoice.pdf`;
  doc.save(fileName);
}
