const BUILD_FALLBACK_DATE =
  typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : new Date().toISOString();

const markdownFiles = import.meta.glob("../../content/blog/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

function parseFrontmatter(rawFile) {
  const normalized = rawFile.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);

  if (!match) {
    return { frontmatter: {}, content: normalized.trim() };
  }

  const frontmatterText = match[1];
  const content = normalized.slice(match[0].length).trim();
  const frontmatter = {};

  frontmatterText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      frontmatter[key] = rawValue.replace(/^['\"]|['\"]$/g, "");
    });

  return { frontmatter, content };
}

function parseBoolean(value) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function toSlug(filePath) {
  const fileName = filePath.split("/").pop() ?? "";
  return fileName.replace(/\.md$/i, "");
}

function slugToTitle(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDateISOString(dateText) {
  const parsedDate = dateText ? new Date(dateText) : new Date(BUILD_FALLBACK_DATE);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date(BUILD_FALLBACK_DATE).toISOString();
  }

  return parsedDate.toISOString();
}

function createExcerpt(markdownContent) {
  const plainText = markdownContent
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= 220) {
    return plainText;
  }

  return `${plainText.slice(0, 220).trimEnd()}...`;
}

const allPosts = Object.entries(markdownFiles)
  .map(([filePath, rawFile]) => {
    const { frontmatter, content } = parseFrontmatter(rawFile);
    const slug = toSlug(filePath);
    const dateISO = toDateISOString(frontmatter.date);

    return {
      slug,
      title: frontmatter.title || slugToTitle(slug),
      dateISO,
      content,
      excerpt: createExcerpt(content),
      hidden: parseBoolean(frontmatter.hidden),
    };
  })
  .sort((left, right) => new Date(right.dateISO).getTime() - new Date(left.dateISO).getTime());

export const posts = allPosts.filter((post) => !post.hidden);

export function getPosts({ includeHidden = false } = {}) {
  return includeHidden ? allPosts : posts;
}

export function getPostBySlug(slug, { includeHidden = false } = {}) {
  return allPosts.find((post) => post.slug === slug && (includeHidden || !post.hidden));
}

export function formatPostDate(dateISO) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateISO));
}
