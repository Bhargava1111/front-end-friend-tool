import type { Order } from "@/lib/types";
import { formatDate } from "@/lib/format";

const GREEN: [number, number, number] = [31, 81, 54];
const GOLD: [number, number, number] = [242, 164, 19];
const CREAM: [number, number, number] = [250, 246, 236];
const DARK: [number, number, number] = [32, 38, 31];
const MUTED: [number, number, number] = [120, 126, 118];

const rupee = (v: number | string) =>
  `Rs. ${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export async function downloadInvoicePdf(order: Order) {
  const { default: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Header band
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 96, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 96, W, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("SRI MAHALAKSHMI STORES", M, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text("Groceries & Pooja Essentials · Doorstep delivery", M, 64);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INVOICE", W - M, 44, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(order.order_number, W - M, 62, { align: "right" });
  doc.text(formatDate(order.created_at), W - M, 78, { align: "right" });

  // Info cards
  let y = 130;
  const cardW = (W - M * 2 - 16) / 2;
  const drawCard = (x: number, title: string, lines: string[]) => {
    const h = 28 + lines.length * 14;
    doc.setFillColor(...CREAM);
    doc.roundedRect(x, y, cardW, h, 8, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text(title.toUpperCase(), x + 12, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    lines.forEach((l, i) => doc.text(doc.splitTextToSize(l, cardW - 24)[0] ?? "", x + 12, y + 34 + i * 14));
    return h;
  };

  const addressLines = doc.splitTextToSize(order.address_text ?? "", cardW - 24) as string[];
  const h1 = drawCard(M, "Deliver to", [order.recipient_name ?? "", ...addressLines.slice(0, 3), order.phone ?? ""]);
  const h2 = drawCard(M + cardW + 16, "Order details", [
    `Status: ${order.status}`,
    order.delivery_date ? `Delivery: ${formatDate(order.delivery_date)}` : "Delivery: to be scheduled",
    order.delivery_slot ? `Slot: ${order.delivery_slot}` : " ",
    `Payment: ${order.payment_method === "cod" ? "Cash on delivery" : (order.payment_method ?? "-")}`,
  ]);
  y += Math.max(h1, h2) + 24;

  // Table header
  const cols = [M, M + 250, M + 320, M + 400];
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
  (order.order_items ?? []).forEach((item, i) => {
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
    if (i % 2 === 0) {
      doc.setFillColor(...CREAM);
      doc.rect(M, y, W - M * 2, 22, "F");
    }
    doc.setTextColor(...DARK);
    const name = `${item.product_name}${item.product_weight ? ` (${item.product_weight})` : ""}`;
    doc.text(doc.splitTextToSize(name, 230)[0] ?? "", cols[0]! + 10, y + 15);
    doc.text(String(item.quantity), cols[1]!, y + 15);
    doc.setTextColor(...MUTED);
    doc.text(rupee(item.unit_price ?? Number(item.line_total) / (item.quantity || 1)), cols[2]!, y + 15);
    doc.setTextColor(...DARK);
    doc.text(rupee(item.line_total), W - M - 10, y + 15, { align: "right" });
    y += 22;
  });

  // Totals
  y += 18;
  const boxX = W - M - 240;
  const rows: Array<[string, string, boolean]> = [
    ["Subtotal", rupee(order.subtotal), false],
  ];
  if (Number(order.discount ?? 0) > 0)
    rows.push([`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${rupee(order.discount!)}`, false]);
  rows.push(["Delivery", Number(order.delivery_fee) === 0 ? "FREE" : rupee(order.delivery_fee), false]);
  if (Number(order.tax ?? 0) > 0) rows.push(["Taxes & charges", rupee(order.tax!), false]);

  doc.setFillColor(...CREAM);
  doc.roundedRect(boxX, y, 240, rows.length * 20 + 46, 8, 8, "F");
  let ty = y + 22;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(label, boxX + 14, ty);
    doc.setTextColor(...DARK);
    doc.text(value, boxX + 226, ty, { align: "right" });
    ty += 20;
  });
  doc.setFillColor(...GOLD);
  doc.roundedRect(boxX, ty - 8, 240, 32, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("TOTAL", boxX + 14, ty + 13);
  doc.text(rupee(order.total), boxX + 226, ty + 13, { align: "right" });

  // Footer
  const fy = doc.internal.pageSize.getHeight() - 56;
  doc.setFillColor(...GREEN);
  doc.rect(0, fy, W, 56, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("Thank you for shopping with Sri Mahalakshmi Stores!", M, fy + 24);
  doc.setTextColor(...GOLD);
  doc.text("This is a computer generated invoice.", M, fy + 40);

  doc.save(`${order.order_number}-invoice.pdf`);
}
