import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";

const ACTIVITIES = [
  { name: "Priya", area: "T. Nagar", item: "Sona Masoori Rice 5kg" },
  { name: "Ramesh", area: "Adyar", item: "Cow Ghee 500ml" },
  { name: "Lakshmi", area: "Velachery", item: "Pooja Combo Kit" },
  { name: "Arun", area: "Anna Nagar", item: "Cold-Pressed Coconut Oil" },
  { name: "Meena", area: "Mylapore", item: "Agarbatti Premium Pack" },
  { name: "Karthik", area: "Nungambakkam", item: "Cashew W320 500g" },
  { name: "Divya", area: "Tambaram", item: "Turmeric Powder 200g" },
  { name: "Suresh", area: "Chromepet", item: "Sambrani Cups" },
];

export function LiveActivityTicker() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ACTIVITIES.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activity = ACTIVITIES[index];

  return (
    <div className="mx-4 flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 lg:mx-0">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-primary" />
      <p
        className={`min-w-0 flex-1 truncate text-[11px] text-muted-foreground transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <span className="font-semibold text-foreground">{activity.name}</span> from{" "}
        <span className="font-medium text-foreground">{activity.area}</span> just ordered{" "}
        <span className="font-medium text-primary">{activity.item}</span>
      </p>
    </div>
  );
}
