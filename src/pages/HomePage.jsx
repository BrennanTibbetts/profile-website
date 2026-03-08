import SiteTopNav from "../components/SiteTopNav";
import SocialThemeRow from "../components/SocialThemeRow";
import NameAsciiScene from "../components/NameAsciiScene";

export default function HomePage({ pathname, navigate }) {
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
