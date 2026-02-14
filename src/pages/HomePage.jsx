import SiteTopNav from "../components/SiteTopNav";
import SocialThemeRow from "../components/SocialThemeRow";

export default function HomePage({ pathname, navigate, theme, setTheme }) {
  return (
    <div className="site-shell">
      <SiteTopNav pathname={pathname} navigate={navigate} />
      <main className="site-home">
        <h1 className="site-name">Brennan Tibbetts</h1>
        <SocialThemeRow theme={theme} setTheme={setTheme} />
      </main>
    </div>
  );
}
