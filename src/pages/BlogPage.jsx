import MarkdownRenderer from "../blog/MarkdownRenderer";
import { formatPostDate, getPostBySlug, getPosts } from "../blog/posts";
import AppLink from "../components/AppLink";
import SiteTopNav from "../components/SiteTopNav";
import SocialThemeRow from "../components/SocialThemeRow";

function BlogTopBar({ pathname, navigate }) {
  return (
    <header className="blog-topbar">
      <SiteTopNav pathname={pathname} navigate={navigate} />
      <SocialThemeRow />
    </header>
  );
}

function getPostPath(post) {
  const slugPart = encodeURIComponent(post.slug);
  return post.hidden ? `/blog/hidden/${slugPart}` : `/blog/${slugPart}`;
}

export function BlogIndexPage({ pathname, navigate, includeHidden = false }) {
  const indexPosts = getPosts({ includeHidden });
  const [featuredPost, ...olderPosts] = indexPosts;

  return (
    <div className="site-shell blog-shell">
      <BlogTopBar pathname={pathname} navigate={navigate} />
      <main className="blog-main">
        {!featuredPost && (
          <section className="blog-empty-state">
            <h2>No posts yet</h2>
          </section>
        )}

        {featuredPost && (
          <section className="blog-featured-wrapper">
            <h2 className="blog-section-label">Latest</h2>
            <AppLink
              to={getPostPath(featuredPost)}
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
                  to={getPostPath(post)}
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

export function BlogPostPage({ pathname, slug, navigate, allowHidden = false }) {
  const post = getPostBySlug(slug, { includeHidden: allowHidden });
  const backPath = allowHidden ? "/blog/hidden" : "/blog";

  if (!post) {
    return (
      <div className="site-shell blog-shell">
        <BlogTopBar pathname={pathname} navigate={navigate} />
        <main className="blog-main">
          <header className="blog-page-header">
            <h1>Post Not Found</h1>
            <p>That blog URL does not match an existing markdown file.</p>
          </header>
          <AppLink to={backPath} navigate={navigate} className="blog-back-link">
            Back
          </AppLink>
        </main>
      </div>
    );
  }

  return (
    <div className="site-shell blog-shell">
      <BlogTopBar pathname={pathname} navigate={navigate} />
      <main className="blog-main">
        <AppLink to={backPath} navigate={navigate} className="blog-back-link">
          Back
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
