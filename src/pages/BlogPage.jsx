import MarkdownRenderer from "../blog/MarkdownRenderer";
import { formatPostDate, getPostBySlug, posts } from "../blog/posts";
import AppLink from "../components/AppLink";
import SiteTopNav from "../components/SiteTopNav";
import SocialThemeRow from "../components/SocialThemeRow";

export function BlogIndexPage({ pathname, navigate, theme, setTheme }) {
  const [featuredPost, ...olderPosts] = posts;

  return (
    <div className="site-shell blog-shell">
      <SiteTopNav pathname={pathname} navigate={navigate} showHome />
      <main className="blog-main">
        <header className="blog-page-header">
          <h1>Blog</h1>
          <p>Markdown posts from `/content/blog`.</p>
        </header>
        <SocialThemeRow theme={theme} setTheme={setTheme} className="blog-social-row" />

        {!featuredPost && (
          <section className="blog-empty-state">
            <h2>No posts yet</h2>
            <p>Add a `.md` file to `content/blog` with `title` and `date` frontmatter.</p>
          </section>
        )}

        {featuredPost && (
          <section className="blog-featured-wrapper">
            <h2 className="blog-section-label">Latest</h2>
            <AppLink
              to={`/blog/${encodeURIComponent(featuredPost.slug)}`}
              navigate={navigate}
              className="blog-featured-card"
            >
              <h3>{featuredPost.title}</h3>
              <p className="blog-date">{formatPostDate(featuredPost.dateISO)}</p>
              {featuredPost.excerpt && <p className="blog-excerpt">{featuredPost.excerpt}</p>}
              <span className="blog-read-more">Read post</span>
            </AppLink>
          </section>
        )}

        {olderPosts.length > 0 && (
          <section className="blog-list-wrapper">
            <h2 className="blog-section-label">Earlier Posts</h2>
            <div className="blog-list">
              {olderPosts.map((post) => (
                <AppLink
                  key={post.slug}
                  to={`/blog/${encodeURIComponent(post.slug)}`}
                  navigate={navigate}
                  className="blog-list-item"
                >
                  <div>
                    <h3>{post.title}</h3>
                    <p className="blog-date">{formatPostDate(post.dateISO)}</p>
                  </div>
                  <span className="blog-read-more">Open</span>
                </AppLink>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export function BlogPostPage({ pathname, slug, navigate, theme, setTheme }) {
  const post = getPostBySlug(slug);

  if (!post) {
    return (
      <div className="site-shell blog-shell">
        <SiteTopNav pathname={pathname} navigate={navigate} showHome />
        <main className="blog-main">
          <header className="blog-page-header">
            <h1>Post Not Found</h1>
            <p>That blog URL does not match an existing markdown file.</p>
          </header>
          <SocialThemeRow theme={theme} setTheme={setTheme} className="blog-social-row" />
          <AppLink to="/blog" navigate={navigate} className="blog-back-link">
            Back to Blog
          </AppLink>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell blog-shell">
      <SiteTopNav pathname={pathname} navigate={navigate} showHome />
      <main className="blog-main">
        <SocialThemeRow theme={theme} setTheme={setTheme} className="blog-social-row" />
        <AppLink to="/blog" navigate={navigate} className="blog-back-link">
          Back to Blog
        </AppLink>

        <article className="blog-post">
          <header className="blog-post-header">
            <h1>{post.title}</h1>
            <p className="blog-date">{formatPostDate(post.dateISO)}</p>
          </header>
          <MarkdownRenderer markdown={post.content} />
        </article>
      </main>
    </div>
  );
}
