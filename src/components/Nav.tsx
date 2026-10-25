import { SITE } from "@/config/site";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  return (
    <header className="nav">
      <div className="container">
        <a href="#top" className="wordmark">
          {SITE.name}
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#drive">The drive</a>
          <a href="#conditions">Conditions</a>
        </nav>
        <div className="nav-right">
          <ThemeToggle />
          <a href={SITE.appUrl} className="btn btn-primary">Try a drive</a>
        </div>
      </div>
    </header>
  );
}
