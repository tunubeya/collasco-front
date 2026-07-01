"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const STRUCTURE_TAB_STORAGE_KEY = "project-structure-active-tab";
const STRUCTURE_TAB_EVENT = "project-structure-active-tab-change";

type StructureTabEvent = CustomEvent<{ tab: string }>;

export function useStructureSessionTab<T extends string>(
  availableTabs: readonly T[],
  defaultTab: T,
) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTabState] = useState<T>(() =>
    resolveInitialTab(availableTabs, defaultTab, searchParams.get("tab")),
  );

  const setActiveTab = useCallback(
    (tab: T) => {
      setActiveTabState(tab);
      if (typeof window === "undefined") return;
      window.sessionStorage.setItem(STRUCTURE_TAB_STORAGE_KEY, tab);
      window.dispatchEvent(
        new CustomEvent(STRUCTURE_TAB_EVENT, { detail: { tab } }),
      );
    },
    [],
  );

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (!tabFromUrl || !availableTabs.includes(tabFromUrl as T)) return;
    setActiveTab(tabFromUrl as T);
  }, [availableTabs, searchParams, setActiveTab]);

  useEffect(() => {
    if (availableTabs.includes(activeTab)) return;
    setActiveTab(availableTabs[0] ?? defaultTab);
  }, [activeTab, availableTabs, defaultTab, setActiveTab]);

  return [activeTab, setActiveTab] as const;
}

export function readStoredStructureTab() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(STRUCTURE_TAB_STORAGE_KEY);
}

export function subscribeToStructureTabChange(callback: (tab: string) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    callback((event as StructureTabEvent).detail.tab);
  };
  window.addEventListener(STRUCTURE_TAB_EVENT, handler);
  return () => window.removeEventListener(STRUCTURE_TAB_EVENT, handler);
}

function resolveInitialTab<T extends string>(
  availableTabs: readonly T[],
  defaultTab: T,
  tabFromUrl: string | null,
) {
  if (tabFromUrl && availableTabs.includes(tabFromUrl as T)) {
    return tabFromUrl as T;
  }

  const storedTab = readStoredStructureTab();
  if (storedTab && availableTabs.includes(storedTab as T)) {
    return storedTab as T;
  }

  return availableTabs[0] ?? defaultTab;
}
