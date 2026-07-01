import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type AuthSplitLayoutProps = {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthSplitLayout({
  children,
  footer,
  className,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-white">
      <div
        className={cn(
          "grid min-h-[calc(100vh-64px)] w-full overflow-hidden md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]",
          className,
        )}
      >
        <section className="flex min-h-[42rem] flex-col px-6 py-8 md:px-12 lg:px-16">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
              C
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-950">
              Collasco
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-sm">{children}</div>
          </div>

          {footer ? <div className="text-center">{footer}</div> : null}
        </section>

        <aside className="relative hidden min-h-[42rem] overflow-hidden md:block">
          <Image
            src="/Images/Reciprocity.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/15" aria-hidden />
          <div
            className="absolute left-[13%] top-[23%] h-28 w-28 border border-white/35 bg-white/10 backdrop-blur-[2px]"
            aria-hidden
          />
          <div
            className="absolute right-[12%] top-[10%] h-24 w-24 border border-white/35 bg-white/10 backdrop-blur-[2px]"
            aria-hidden
          />
          <div
            className="absolute bottom-[21%] right-[18%] h-36 w-36 border border-white/35 bg-white/10 backdrop-blur-[2px]"
            aria-hidden
          />
          <div
            className="absolute bottom-10 left-10 right-10 border border-white/35 bg-slate-950/25 p-6 text-white shadow-sm backdrop-blur-md"
            aria-hidden
          >
            <div className="h-3 w-2/3 rounded-full bg-white/80" />
            <div className="mt-3 h-3 w-5/6 rounded-full bg-white/55" />
            <div className="mt-5 h-2 w-1/3 rounded-full bg-white/70" />
          </div>
        </aside>
      </div>
    </div>
  );
}
