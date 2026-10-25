import { SITE } from "@/config/site";

export default function Nav() {
  return (
    <header className="nav">
      <div className="container">
        <a href="#top" className="wordmark" aria-label={`${SITE.name} home`}>
          <span className="wordmark-mark" aria-hidden />
          <span className="wordmark-name">{SITE.name}</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#calculator">Savings</a>
          <a href="#next-move">Next Move</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nav-right">
          <a href={SITE.appUrl} className="btn btn-primary">Open the app</a>
        </div>
      </div>
    </header>
  );
}
