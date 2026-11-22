import { createRoot } from "react-dom/client";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import "./styles/index.css";
import ScrollPortfolioPage from "./pages/ScrollPortfolioPage";
import { posts } from "./blog/posts";

// The blog is rarely visited, so its code (and the Markdown renderer) loads
// only when a blog route is opened.
const BlogIndexPage = lazy(() => import("./pages/BlogPage").then((module) => ({ default: module.BlogIndexPage })));
const BlogPostPage = lazy(() => import("./pages/BlogPage").then((module) => ({ default: module.BlogPostPage })));
// The block game behind the faint arrow in the intro's corner.
const PlayPage = lazy(() => import("./pages/PlayPage"));

function normalizePathname(pathname) {
  if (!pathname) {
    return "/";
  }
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function blogPostRoute(path, prefix, allowHidden) {
  const slugSegment = path.slice(prefix.length).split("/")[0];
  if (!slugSegment) {
    return null;
  }
  try {
    return { type: "blog-post", slug: decodeURIComponent(slugSegment), allowHidden };
  } catch {
    return { type: "not-found" };
  }
}

function parseRoute(pathname) {
  const path = normalizePathname(pathname);

  // Home and /portfolio (where the résumé links) are the same scroll page.
  if (path === "/" || path === "/portfolio" || path.startsWith("/portfolio/")) {
    return { type: "home" };
  }
  if (path === "/play") {
    return { type: "play" };
  }
  if (path === "/blog") {
    return { type: "blog-index", includeHidden: false };
  }
  if (path === "/blog/hidden") {
    return { type: "blog-index", includeHidden: true };
  }
  if (path.startsWith("/blog/hidden/")) {
    return blogPostRoute(path, "/blog/hidden/", true) ?? { type: "not-found" };
  }
  if (path.startsWith("/blog/")) {
    return blogPostRoute(path, "/blog/", false) ?? { type: "not-found" };
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
          <button className="site-nav-btn" onClick={() => navigate("/")}>
            Home
          </button>
          {posts.length > 0 ? (
            <button className="site-nav-btn" onClick={() => navigate("/blog")}>
              Posts
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const route = useMemo(() => parseRoute(pathname), [pathname]);

  useEffect(() => {
    const handlePopState = () => setPathname(normalizePathname(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to) => {
    const target = normalizePathname(to);
    if (target === normalizePathname(window.location.pathname)) {
      return;
    }
    window.history.pushState({}, "", target);
    setPathname(target);
  }, []);

  if (route.type === "home") {
    return <ScrollPortfolioPage pathname={pathname} navigate={navigate} />;
  }

  if (route.type === "play") {
    return (
      <Suspense fallback={null}>
        <PlayPage navigate={navigate} />
      </Suspense>
    );
  }

  if (route.type === "blog-index") {
    return (
      <Suspense fallback={null}>
        <BlogIndexPage pathname={pathname} navigate={navigate} includeHidden={route.includeHidden} />
      </Suspense>
    );
  }

  if (route.type === "blog-post") {
    return (
      <Suspense fallback={null}>
        <BlogPostPage pathname={pathname} slug={route.slug} navigate={navigate} allowHidden={route.allowHidden} />
      </Suspense>
    );
  }

  return <NotFoundPage pathname={pathname} navigate={navigate} />;
}

createRoot(document.getElementById("root")).render(<App />);
