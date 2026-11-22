# brennantibbetts.online

Brennan Tibbetts's portfolio: one scrolling page of the apps he's built, each on a 3D iPhone playing a screen recording, with a pinned scene that turns Waypoint into a diagram of its AWS backend.

React 18 and Vite 6, with three.js through React Three Fiber and drei. Hosted on Vercel.

## Develop

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

This builds and deploys production with the Vercel CLI. Pushing to `main` deploys production too.

## Where things are

- `src/apps.js`: the apps, in page order (copy, tech, accent colour, screen recording, companion model).
- `src/pages/ScrollPortfolioPage.jsx`: the page. The 3D views (`src/components/SceneViews.jsx`) load separately so the text paints first.
- `src/components/ShowcasePhone.jsx`: an app's phone and the model floating beside it.
- `src/components/WaypointJourney.jsx`: the Waypoint-to-backend diagram scene.
- `src/pages/PlayPage.jsx` and `src/play/blocks.js`: the block game at `/play`, behind the "psst" arrow in the intro's corner.
- `public/assets/videos/`: screen recordings (silent, looping H.264 MP4).
- `public/assets/Resume_Brennan_Tibbetts.pdf`: the résumé.
- `content/blog/`: Markdown posts. Posts with `hidden: true` only show under `/blog/hidden`; the Posts tab appears once a post is public.
- `public/fonts/fraunces/`: subsets of Fraunces (SIL OFL), built by `scripts/subset-fonts.py`.

## Credits

“Coffee Cup” by AK STUDIO and “Climbing Shoe Scan LOWPOLY” by EvanLegrand, both CC BY 4.0, credited in the page footer.
