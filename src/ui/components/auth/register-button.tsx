import { Button } from "@/ui/components/button";
import { getTranslations } from "next-intl/server";

export default async function RegisterButton() {
  const t = await getTranslations("auth.register");
  return (
    <Button variant="secondary" redirect="/register">
      <span>{t("registerButton")}</span>
    </Button>
  );
}
