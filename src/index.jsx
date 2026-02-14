import { createRoot } from "react-dom/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles/index.css";
import HomePage from "./pages/HomePage";
import PortfolioPage from "./pages/PortfolioPage";
import { BlogIndexPage, BlogPostPage } from "./pages/BlogPage";

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
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
    return { type: "blog-index" };
  }

  if (normalizedPath.startsWith("/blog/")) {
    const slugSegment = normalizedPath.slice("/blog/".length).split("/")[0];

    if (slugSegment) {
      try {
        return { type: "blog-post", slug: decodeURIComponent(slugSegment) };
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
          <button className="site-nav-btn" onClick={() => navigate("/portfolio")}>Portfolio</button>
          <button className="site-nav-btn" onClick={() => navigate("/blog")}>Blog</button>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [theme, setTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem("theme");
    return savedTheme === "light" ? "light" : "dark";
  });

  const route = useMemo(() => parseRoute(pathname), [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("theme", theme);
    document.body.classList.toggle("light", theme === "light");
  }, [theme]);

  const navigate = useCallback((to) => {
    const normalizedTarget = normalizePathname(to);
    const currentPathname = normalizePathname(window.location.pathname);

    if (normalizedTarget === currentPathname) {
      return;
    }

    window.history.pushState({}, "", normalizedTarget);
    setPathname(normalizedTarget);
  }, []);

  if (route.type === "portfolio") {
    return <PortfolioPage theme={theme} setTheme={setTheme} pathname={pathname} navigate={navigate} />;
  }

  if (route.type === "blog-index") {
    return <BlogIndexPage pathname={pathname} navigate={navigate} theme={theme} setTheme={setTheme} />;
  }

  if (route.type === "blog-post") {
    return <BlogPostPage pathname={pathname} slug={route.slug} navigate={navigate} theme={theme} setTheme={setTheme} />;
  }

  if (route.type === "home") {
    return <HomePage pathname={pathname} navigate={navigate} theme={theme} setTheme={setTheme} />;
  }

  return <NotFoundPage pathname={pathname} navigate={navigate} />;
}

createRoot(document.getElementById("root")).render(<App />);
