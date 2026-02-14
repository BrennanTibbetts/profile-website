import AppLink from "./AppLink";

function isActive(pathname, target) {
  if (target === "/") {
    return pathname === "/";
  }

  if (target === "/blog") {
    return pathname === "/blog" || pathname.startsWith("/blog/");
  }

  if (target === "/portfolio") {
    return pathname === "/portfolio" || pathname.startsWith("/portfolio/");
  }

  return pathname === target;
}

export default function SiteTopNav({
  pathname,
  navigate,
  showHome = true,
  showPortfolio = true,
  showBlog = true,
  className = "",
}) {
  const navClass = ["site-top-nav", className].filter(Boolean).join(" ");

  return (
    <nav className={navClass} aria-label="Primary navigation">
      {showHome && (
        <AppLink
          to="/"
          navigate={navigate}
          className={`site-nav-btn ${isActive(pathname, "/") ? "is-active" : ""}`.trim()}
        >
          Home
        </AppLink>
      )}
      {showPortfolio && (
        <AppLink
          to="/portfolio"
          navigate={navigate}
          className={`site-nav-btn ${isActive(pathname, "/portfolio") ? "is-active" : ""}`.trim()}
        >
          Portfolio
        </AppLink>
      )}
      {showBlog && (
        <AppLink
          to="/blog"
          navigate={navigate}
          className={`site-nav-btn ${isActive(pathname, "/blog") ? "is-active" : ""}`.trim()}
        >
          Blog
        </AppLink>
      )}
    </nav>
  );
}
