// Start of the pilot-facing iOS role. The iOS slide's "For the past N years"
// is worked out from this when the page loads, rounded down to the half year.
const IOS_ROLE_START_DATE = new Date(2024, 6, 15); // July 15, 2024

function yearsSince(startDate, now = new Date()) {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const halfYears = Math.floor(((now - startDate) / msPerYear) * 2);
  const years = Math.max(halfYears, 1) / 2;
  return `${years} ${years === 1 ? "year" : "years"}`;
}

export const projects = [
  {
    id: 0,
    title: "iOS Development",
    subject: "MY IOS EXPERIENCE",
    description: `For the past ${yearsSince(IOS_ROLE_START_DATE)}, I’ve been working on a pilot-facing iOS application deployed to roughly 12,000 devices. I’ve helped lead the transition from =y=Objective-C=y= and =p=UIKit=p= to modern Swift-based development, working extensively with =p=SwiftUI=p=, =p=SwiftData=p=, and =p=Core Data=p=. I actively maintain the application, support crew members in the field, and manage deployments through a mobile device management platform to ensure reliable, secure releases at scale.

  My work spans both design and engineering. I create designs in =y=Figma=y= and implement fully featured solutions backed by microservice architectures, RESTful APIs, and modern =y=iOS=y= frameworks. In addition to my professional work, I’m currently developing a personal =y=iOS=y= application and look forward to sharing more about it soon.`
  },
  {
    id: 1,
    title: "AWS Full Stack Development",
    subject: "MY AWS EXPERIENCE",
    description: `I work extensively with =y=AWS=y= to design, build, and deploy microservice-based systems. My experience includes developing and maintaining services backed by =p=AWS Lambda=p=, =p=API Gateway=p=, and =p=DynamoDB=p=, with a strong emphasis on scalability, reliability, and clean service boundaries. I regularly deploy and operate these microservices as part of an agile Scrum team, contributing across planning, implementation, and iteration.

  I’ve built end-to-end applications with microservice backends, primarily using =p=Node.js=p= and =y=TypeScript=y=, and have experience delivering frontend components with =p=React=p= when needed. My work focuses on creating well-structured, production-ready systems that integrate cleanly across the stack.`
  },
  {
    id: 2,
    title: "3D Web Development",
    subject: "MY WEB DEV EXPERIENCE",
    description: `I build interactive, real-time 3D experiences for the web using =p=Three.js=p= and =p=React Three Fiber=p=, structuring scenes and logic with =p=React=p= (TSX and JSX). I’ve completed Bruno Simon’s =y=Three.js Journey course=y=, which gave me a strong foundation in modern =y=WebGL=y= workflows, performance considerations, and scene composition.

  I model assets in =y=Blender=y= and have a solid understanding of the graphics pipeline, including vertex and fragment shaders written in =y=GLSL=y=. I’m comfortable working close to the metal when needed, whether that’s custom shaders, low-level rendering decisions, or wiring everything together with =p=Node.js=p= tooling and build systems to ship interactive projects that actually feel responsive and intentional.`
  },
  {
    id: 3,
    title: "Angulo",
    subject: "AN APP I BUILT AND SOLD",
    description: `Angulo is an =y=iPhone=y= and =y=iPad=y= app I designed and built on my own, then sold to an athletic training company in 2026. Users take or import a photo, measure joint angles with a three-point goniometer tool, and annotate it with labels and pinned comments.

  It’s built entirely in =p=SwiftUI=p= and =p=SwiftData=p= with no third-party dependencies. It includes =y=REBA=y= and =y=WEAR=y= ergonomic assessments scored against the published tables, and exports results as images, =p=PDF=p=, =p=CSV=p=, or editable session files. Everything stays on the device: no accounts, no backend, no tracking.`
  }
];
