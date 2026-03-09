import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles/index.css";
import HomePage from "./pages/HomePage";
import PortfolioPage from "./pages/PortfolioPage";
import { BlogIndexPage, BlogPostPage } from "./pages/BlogPage";
import { preloadPortfolioAssets } from "./utils/preloadPortfolioAssets";

const MOBILE_BREAKPOINT = 768;

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function normalizePathnameForViewport(pathname, isMobileViewport) {
  const normalizedPath = normalizePathname(pathname);

  if (isMobileViewport && normalizedPath === "/") {
    return "/portfolio";
  }

  return normalizedPath;
}

function parseRoute(pathname) {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === "/") {
    return { type: "home" };
  }

  if (normalizedPath === "/portfolio" || normalizedPath.startsWith("/portfolio/")) {
    return { type: "portfolio" };
  }

  if (normalizedPath === "/blog") {
    return { type: "blog-index", includeHidden: false };
  }

  if (normalizedPath === "/blog/hidden") {
    return { type: "blog-index", includeHidden: true };
  }

  if (normalizedPath.startsWith("/blog/hidden/")) {
    const slugSegment = normalizedPath.slice("/blog/hidden/".length).split("/")[0];

    if (slugSegment) {
      try {
        return { type: "blog-post", slug: decodeURIComponent(slugSegment), allowHidden: true };
      } catch {
        return { type: "not-found" };
      }
    }
  }

  if (normalizedPath.startsWith("/blog/")) {
    const slugSegment = normalizedPath.slice("/blog/".length).split("/")[0];

    if (slugSegment) {
      try {
        return { type: "blog-post", slug: decodeURIComponent(slugSegment), allowHidden: false };
      } catch {
        return { type: "not-found" };
      }
    }
  }

  return { type: "not-found" };
}

function NotFoundPage({ pathname, navigate }) {
  return (
    <div className="site-shell">
      <main className="site-home">
        <h1 className="site-name">404</h1>
        <p className="site-subtitle">
          No page exists at <code>{pathname}</code>.
        </p>
        <div className="site-action-row">
          <button className="site-nav-btn" onClick={() => navigate("/")}>Home</button>
          <button className="site-nav-btn" onClick={() => navigate("/portfolio")}>Profile</button>
          <button className="site-nav-btn" onClick={() => navigate("/blog")}>Posts</button>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [pathname, setPathname] = useState(() =>
    normalizePathnameForViewport(window.location.pathname, window.innerWidth <= MOBILE_BREAKPOINT)
  );

  const route = useMemo(() => parseRoute(pathname), [pathname]);

  useEffect(() => {
    preloadPortfolioAssets({ mode: "eager" });
  }, []);

  useEffect(() => {
    const initialIsMobileViewport = window.innerWidth <= MOBILE_BREAKPOINT;
    const initialNormalizedPath = normalizePathnameForViewport(window.location.pathname, initialIsMobileViewport);
    if (initialNormalizedPath !== normalizePathname(window.location.pathname)) {
      window.history.replaceState(window.history.state, "", initialNormalizedPath);
      setPathname(initialNormalizedPath);
    }

    const handlePopState = () => {
      const isMobileViewport = window.innerWidth <= MOBILE_BREAKPOINT;
      const normalizedPath = normalizePathnameForViewport(window.location.pathname, isMobileViewport);
      if (normalizedPath !== normalizePathname(window.location.pathname)) {
        window.history.replaceState(window.history.state, "", normalizedPath);
      }
      setPathname(normalizedPath);
    };

    const handleResize = () => {
      const isMobileViewport = window.innerWidth <= MOBILE_BREAKPOINT;
      const normalizedPath = normalizePathnameForViewport(window.location.pathname, isMobileViewport);
      if (normalizedPath !== normalizePathname(window.location.pathname)) {
        window.history.replaceState(window.history.state, "", normalizedPath);
      }
      setPathname(normalizedPath);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const navigate = useCallback((to) => {
    const isMobileViewport = window.innerWidth <= MOBILE_BREAKPOINT;
    const normalizedTarget = normalizePathnameForViewport(to, isMobileViewport);
    const currentPathname = normalizePathnameForViewport(window.location.pathname, isMobileViewport);

    if (normalizedTarget === currentPathname) {
      return;
    }

    window.history.pushState({}, "", normalizedTarget);
    setPathname(normalizedTarget);
  }, []);

  if (route.type === "portfolio") {
    return <PortfolioPage pathname={pathname} navigate={navigate} />;
  }

  if (route.type === "blog-index") {
    return (
      <BlogIndexPage
        pathname={pathname}
        navigate={navigate}
        includeHidden={route.includeHidden}
      />
    );
  }

  if (route.type === "blog-post") {
    return (
      <BlogPostPage
        pathname={pathname}
        slug={route.slug}
        navigate={navigate}
        allowHidden={route.allowHidden}
      />
    );
  }

  if (route.type === "home") {
    return <HomePage pathname={pathname} navigate={navigate} />;
  }

  return <NotFoundPage pathname={pathname} navigate={navigate} />;
}

createRoot(document.getElementById("root")).render(<App />);
