// Start of the pilot-facing iOS role at NetJets. Copy that says "for the past
// N years" is worked out from this when the page loads.
export const IOS_ROLE_START_DATE = new Date(2024, 6, 15); // July 15, 2024

// Whole and half years since `startDate`, rounded down: "2 years", "2.5 years".
export function yearsSince(startDate, now = new Date()) {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const halfYears = Math.floor(((now - startDate) / msPerYear) * 2);
  const years = Math.max(halfYears, 1) / 2;
  return `${years} ${years === 1 ? "year" : "years"}`;
}
