import { SITE } from "@/config/site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <span>
          © {new Date().getFullYear()} {SITE.name}. All drivers and drives are simulated, and every number is an estimate. Not a
          Toyota product or offer.
        </span>
        <span>{SITE.tagline}</span>
      </div>
    </footer>
  );
}
