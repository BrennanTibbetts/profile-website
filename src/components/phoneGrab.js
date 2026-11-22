// Whether a finger (or the mouse) is holding a phone right now. Set when a
// press lands on a draggable phone; the page stops scrolling only then, so a
// touch anywhere else still scrolls (see SceneCanvas).
export const phoneGrab = { active: false };

export function grabPhone() {
  phoneGrab.active = true;
}
