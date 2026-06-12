"use client";

import { useEffect, useState } from "react";

/** True on phones, tablets, and other coarse-pointer touch devices */
export function useTouchLayout() {
  const [touchLayout, setTouchLayout] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: none), (pointer: coarse)");
    const update = () => setTouchLayout(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return touchLayout;
}
