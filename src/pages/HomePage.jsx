import { useEffect } from "react";
import SiteTopNav from "../components/SiteTopNav";
import SocialThemeRow from "../components/SocialThemeRow";
import NameAsciiScene from "../components/NameAsciiScene";
import { preloadPortfolioAssets } from "../utils/preloadPortfolioAssets";

export default function HomePage({ pathname, navigate }) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const preload = () => {
      preloadPortfolioAssets();
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 2000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(preload, 350);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="site-shell">
      <header className="home-topbar">
        <SiteTopNav pathname={pathname} navigate={navigate} className="home-nav" />
        <SocialThemeRow className="home-social" />
      </header>
      <main className="site-home site-home-scene">
        <NameAsciiScene />
      </main>
    </div>
  );
}
