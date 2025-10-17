"use client";
import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import ProfileMenuClient from "@/ui/components/navbar/profile-menu-client";
import { Session } from "@/lib/definitions";
import { useTranslations } from "next-intl";

export default function MobileMenuDrawer({
  isOpen,
  onClose,
  session,
}: {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
}) {
  const t = useTranslations("ui.navbar.mobile-menu-drawer");
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Fondo oscuro */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        {/* Drawer lateral izquierdo */}
        <div className="fixed inset-0 flex justify-start">
          <TransitionChild
            as={Fragment}
            enter="transform transition duration-300 ease-out"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition duration-200 ease-in"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <DialogPanel className="w-72 max-w-full h-full bg-background shadow-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{t("menu")}</h2>
                <button onClick={onClose} aria-label={t("close")}>
                  <X size={24} />
                </button>
              </div>

              {/* Aquí puedes ir agregando más ítems al menú */}
              <div className="flex flex-col gap-3">
                {session?.token ? (
                  <ProfileMenuClient session={session} />
                ) : (
                  <span className="text-sm text-[color:var(--color-muted-fg)]">
                    {t("notLoggedIn")}
                  </span>
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
