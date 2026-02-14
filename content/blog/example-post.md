---
title: "Example Post"
date: "2026-02-14"
hidden: true
---

This is a sample markdown post so you can see exactly how blog parsing works.

## Frontmatter Fields

- `title`: Display title
- `date`: Used for sorting (newest first)
- `hidden`: Set to `true` to hide from `/blog` index

## Hidden Post Example

To make a post hidden, change frontmatter to:

```md
---
title: "My Private Draft"
date: "2026-02-15"
hidden: true
---
```

That post will only be available at the hidden route format you set up (not on the public list).

