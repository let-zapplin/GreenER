import { useEffect, useState } from "react";

// Reacts to changes such as attaching a mouse or rotating a tablet.
export function useChartTouch() {
  const [isTouch, setIsTouch] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isTouch;
}
