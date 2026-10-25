import type { Metadata } from "next";
import { Instrument_Serif, Sora } from "next/font/google";
import { SITE } from "@/config/site";
import "./globals.css";

// Display face for headings, self-hosted by next/font at build time.
const display = Instrument_Serif({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-display" });
// Bold geometric sans for the Regentic wordmark, per the brand guidelines poster.
const brand = Sora({ weight: "700", subsets: ["latin"], display: "swap", variable: "--font-brand" });

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
};

// Runs before paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="bright"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}
if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion")`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${display.variable} ${brand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
