// hooks/useNavbarSticky.ts
import { useEffect, useState } from "react";

export function useNavbarSticky(threshold = 120) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsSticky(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return isSticky;
}
