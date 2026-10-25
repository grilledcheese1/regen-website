import { SITE } from "@/config/site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span>© {new Date().getFullYear()} {SITE.name}. Simulated data for demonstration.</span>
        <span>{SITE.tagline}</span>
      </div>
    </footer>
  );
}
