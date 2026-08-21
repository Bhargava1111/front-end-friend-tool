import { Link } from "@tanstack/react-router";
import { Clock, Leaf, MapPin, Phone, ShieldCheck, Truck } from "lucide-react";

const PROMISES = [
  { icon: Truck, title: "Same-day delivery", copy: "Orders placed before 4 pm reach you today." },
  { icon: Leaf, title: "Fresh & authentic", copy: "Cold-pressed oils and temple-grade pooja items." },
  { icon: ShieldCheck, title: "Verified shoppers", copy: "Every address is checked before dispatch." },
  { icon: Clock, title: "Open 7 days", copy: "7 am – 9.30 pm, including festival days." },
];

const LINKS = [
  { to: "/sale", label: "Mega Sale" },
  { to: "/festival-store", label: "Festival Store" },
  { to: "/new-arrivals", label: "New Arrivals" },
  { to: "/bulk-order", label: "Bulk Orders" },
  { to: "/compare", label: "Compare" },
  { to: "/categories", label: "Categories" },
  { to: "/deals", label: "Deals" },
  { to: "/offers", label: "Offers" },
  { to: "/membership", label: "Membership" },
  { to: "/gift-cards", label: "Gift Cards" },
  { to: "/coupons", label: "Coupons" },
  { to: "/brands", label: "Brands" },
  { to: "/track-order", label: "Track Order" },
  { to: "/blogs", label: "Journal" },
  { to: "/stores", label: "Store locator" },
  { to: "/about", label: "About us" },
  { to: "/contact", label: "Contact" },
  { to: "/faq", label: "FAQ" },
  { to: "/help", label: "Help" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

/** Landing-style closing block shown at the bottom of every storefront page. */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border bg-secondary/30 px-4 pb-10 pt-8 lg:rounded-t-3xl lg:px-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISES.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-4">
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="text-base font-bold text-foreground">Sri Mahalakshmi Stores</p>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
            A family-run grocery and pooja essentials store serving Chennai homes since 1994 — now
            delivering staples, oils, dry fruits and ritual supplies to your door.
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" /> T. Nagar, Chennai 600017
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-primary" /> +91 90000 12345
          </p>
        </div>

        <nav className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mt-8 border-t border-border pt-4 text-center text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} Sri Mahalakshmi Stores. All prices include applicable taxes.
      </p>
    </footer>
  );
}
