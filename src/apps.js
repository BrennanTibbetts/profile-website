import { IOS_ROLE_START_DATE, yearsSince } from "./utils/yearsSince";

// Apps shown on the scroll portfolio, in page order. `video` is a silent,
// looping H.264 MP4 under public/assets/videos, with its first frame saved
// beside it as a JPEG of the same name (shown until the video plays; null
// shows the default lock screen). `accent` tints the section's labels.
// `companion` (optional) names a 3D object floating by the phone; see
// COMPANIONS in components/ShowcasePhone.jsx.
export const apps = [
  {
    id: "waypoint",
    name: "Waypoint",
    tagline: "The app NetJets pilots fly with.",
    meta: "NetJets · Deployed to ~12,000 devices",
    accent: "#7fa3e8",
    video: "/assets/videos/waypoint.mp4",
    paragraphs: [
      `For the past ${yearsSince(IOS_ROLE_START_DATE)}, I’ve worked on Waypoint, the pilot-facing iOS app at NetJets, deployed to roughly 12,000 devices. I’ve helped lead its move from Objective-C and UIKit to modern Swift, working extensively with SwiftUI, SwiftData and Core Data.`,
      "I design in Figma and build features end to end against microservice-backed REST APIs, maintain the app, support crew members in the field, and ship releases through mobile device management.",
    ],
    tech: ["Swift", "SwiftUI", "SwiftData", "Core Data", "Objective-C", "UIKit"],
  },
  {
    id: "cadence",
    name: "Cadence",
    tagline: "Routines that keep their own time.",
    meta: "Personal app · iPhone + Apple Watch",
    accent: "#e0a45c",
    video: "/assets/videos/cadence.mp4",
    companion: "coffee-cup",
    paragraphs: [
      "Cadence turns a routine into a timeline. Each step gets a duration, and the whole morning lays itself out from the time you start. Run it and it steps you through each item, with a timer, on your iPhone, Apple Watch, Lock Screen and Dynamic Island.",
      "It’s built in SwiftUI with a watchOS companion kept in sync over WatchConnectivity, Live Activities, home screen widgets, App Intents for Siri and Shortcuts, and scheduled reminders.",
    ],
    tech: ["SwiftUI", "watchOS", "ActivityKit", "WidgetKit", "App Intents", "WatchConnectivity"],
  },
  {
    id: "angulo",
    name: "Angulo",
    tagline: "Joint angles, measured from a photo.",
    meta: "Built solo · Sold to an athletic training company in 2026",
    accent: "#34d3b4",
    video: "/assets/videos/angulo.mp4",
    companion: "goniometer",
    paragraphs: [
      "Angulo is an iPhone and iPad app I designed and built on my own, then sold to an athletic training company. Users take or import a photo, measure joint angles with a three-point goniometer tool, and annotate it with labels and pinned comments.",
      "It includes REBA and WEAR ergonomic assessments scored against the published tables, and exports results as images, PDF, CSV or editable session files. Everything stays on the device: no accounts, no backend, no tracking, and no third-party dependencies.",
    ],
    tech: ["SwiftUI", "SwiftData", "Core Graphics", "PDF export", "Swift Testing"],
  },
  {
    id: "chalkmark",
    name: "Chalkmark",
    tagline: "Recognizing boulder problems by their holds.",
    meta: "Proof of concept · ARKit",
    accent: "#a3e635",
    video: "/assets/videos/chalkmark.mp4",
    companion: "climbing-shoe",
    paragraphs: [
      "Tap one hold to pick a problem’s color, then sweep the phone across the wall. Chalkmark finds holds of that color in every frame, follows them as you move, and triangulates each one into 3D from the phone’s tracked position, with no LiDAR needed.",
      "Logging a climb runs the same sweep and matches what it sees against the problems already saved. Every scan keeps its raw frames, poses and detections, so recognition accuracy can be measured and tuned offline.",
    ],
    tech: ["ARKit", "Computer vision", "3D triangulation", "SwiftUI"],
  },
];
