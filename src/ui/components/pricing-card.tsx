import { getTranslations } from "next-intl/server";
import { getCurrencySymbol } from "@/lib/utils";
import { Button } from "./button";
import { ThumbsUp } from "lucide-react";

type Plan = {
  id: string;
  label: string;
  title: string;
  price: number;
  period: string;
  features: string[];
};

export default async function PricingCard({
  plan,
  countryCode,
  locale,
}: Readonly<{ plan: Plan; countryCode: string; locale?: string }>) {
  const t = await getTranslations("ui.pricing-card");
  const currencySymbol = getCurrencySymbol(countryCode, locale);

  return (
    <div
      className="flex flex-col min-w-[280px] max-w-[320px]
                    rounded-2xl border border-[color:var(--color-border)]
                    bg-surface shadow-sm p-6 md:p-8"
    >
      {/* Badge */}
      <div className="flex justify-start">
        <span
          className="rounded-full bg-primary text-[color:var(--color-primary-foreground)]
                        px-3 py-1 text-sm border border-[color:var(--color-border)]"
        >
          {plan.label}
        </span>
      </div>

      {/* Title */}
      <h2 className="mt-4 text-xl font-bold text-[color:var(--color-foreground)] text-center">
        {plan.title}
      </h2>

      {/* Price */}
      <p className="mt-2 text-4xl font-extrabold text-center text-[color:var(--color-foreground)]">
        <span className="text-lg font-normal align-text-top">
          {currencySymbol}
        </span>
        {plan.price}
        <span className="ml-1 text-base font-medium text-[color:var(--color-muted-fg)]">
          {plan.period}
        </span>
      </p>

      {/* Features */}
      <ul className="mt-4 space-y-2 text-sm text-[color:var(--color-muted-fg)] list-disc list-inside">
        {plan.features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>

      {/* Button */}
      <div className="mt-6 w-full flex justify-center">
        <Button className="bg-primary  hover:opacity-90">
          <ThumbsUp size={20} className="mr-2" />
          {t("subscribeButton")}
        </Button>
      </div>
    </div>
  );
}
