// Everything that can be reported or taken down. The two *_edit kinds are
// individual edit-history versions (a leak can sit in a prior body the author
// already edited out of the live one). Client-safe so dialogs can type targets.
export type ModerationTargetType =
  | "discussion"
  | "discussion_reply"
  | "version"
  | "discussion_edit"
  | "discussion_reply_edit";

// User-facing report reasons, in picker order. Client-safe (no server imports)
// so dialogs can render the picker and the server can validate against the same
// list. Internal-only reasons (author_request, court_order, ...) are not here;
// they never appear in the user picker. Mirrors the taxonomy in
// schema/moderation.ts and docs/moderation-policy.md.
export const REPORT_REASONS = [
  "csam",
  "ncii",
  "threat_violence",
  "self_harm",
  "doxxing",
  "leaked_secret",
  "harassment",
  "hate_speech",
  "defamation",
  "impersonation",
  "nsfw_shock",
  "spam",
  "dangerous_content",
  "embargo_violation",
  "copyright",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

// The one reason that requires free-text details before it can be submitted.
export const REASON_REQUIRING_DETAILS: ReportReason = "other";

// Picker grouping. 16 flat options is too long to scan (CLAUDE 10.7), so the
// dialog renders these labelled groups. Order is rough severity, most serious
// first, so the gravest categories surface at the top of the list.
export type ReasonGroupKey = "safety" | "privacy" | "abuse" | "harmful" | "legal" | "other";

export const REPORT_REASON_GROUPS: { key: ReasonGroupKey; reasons: ReportReason[] }[] = [
  { key: "safety", reasons: ["csam", "ncii", "threat_violence", "self_harm"] },
  { key: "privacy", reasons: ["doxxing", "leaked_secret"] },
  { key: "abuse", reasons: ["harassment", "hate_speech", "impersonation", "defamation"] },
  { key: "harmful", reasons: ["dangerous_content", "nsfw_shock", "spam"] },
  { key: "legal", reasons: ["copyright", "embargo_violation"] },
  { key: "other", reasons: ["other"] },
];

// Triage tier for a reason, used to route attention in the admin queue:
//   urgent - time-sensitive harm / privacy; platform staff act now (red)
//   admin  - legal / identity review; platform staff judgment, not panic (amber)
//   mod    - the org moderator's job; admins only act if it escalates (muted)
// Mirrors the "Initial routing" column in the moderation spec section 4.1.
export type ReasonTier = "urgent" | "admin" | "mod";

export const REASON_TIER: Record<ReportReason, ReasonTier> = {
  csam: "urgent",
  ncii: "urgent",
  threat_violence: "urgent",
  self_harm: "urgent",
  doxxing: "urgent",
  leaked_secret: "urgent",
  defamation: "admin",
  impersonation: "admin",
  embargo_violation: "admin",
  copyright: "admin",
  harassment: "mod",
  hate_speech: "mod",
  nsfw_shock: "mod",
  spam: "mod",
  dangerous_content: "mod",
  other: "mod",
};

export function reasonTier(reason: string): ReasonTier {
  // `in` guard keeps the runtime fallback for unknown codes; the cast alone
  // would let an out-of-taxonomy string read as undefined.
  return reason in REASON_TIER ? REASON_TIER[reason as ReportReason] : "mod";
}

// The genuinely time-sensitive reasons, for the in-app urgent count surfaced on
// the admin hub.
export const URGENT_REASONS: ReportReason[] = REPORT_REASONS.filter(
  (r) => REASON_TIER[r] === "urgent",
);

// Most severe tier across a set of reasons (a target reported for several things
// is triaged by its worst one).
export function tierForReasons(reasons: string[]): ReasonTier {
  if (reasons.some((r) => reasonTier(r) === "urgent")) return "urgent";
  if (reasons.some((r) => reasonTier(r) === "admin")) return "admin";
  return "mod";
}

// Sort rank, lower = more urgent.
export const TIER_RANK: Record<ReasonTier, number> = { urgent: 0, admin: 1, mod: 2 };

// Severity order (gravest first) for defaulting an admin action's reason to the
// most serious among a target's reports.
export const REASON_SEVERITY_ORDER: ReportReason[] = [
  "csam",
  "ncii",
  "threat_violence",
  "self_harm",
  "doxxing",
  "leaked_secret",
  "defamation",
  "impersonation",
  "hate_speech",
  "harassment",
  "dangerous_content",
  "nsfw_shock",
  "embargo_violation",
  "copyright",
  "spam",
  "other",
];
