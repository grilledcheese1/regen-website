"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/config/site";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "bright" ? "bright" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "bright" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button className="theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "bright" : "dark"} mode`}>
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
