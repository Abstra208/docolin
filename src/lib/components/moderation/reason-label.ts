import { m } from "$paraglide/messages";
import { REPORT_REASONS, type ReasonGroupKey, type ReportReason } from "$lib/moderation-reasons";

const REPORT_REASON_SET = new Set<string>(REPORT_REASONS);

// Localized heading for a reason group in the picker.
export function reasonGroupLabel(key: ReasonGroupKey): string {
  switch (key) {
    case "safety":
      return m.moderation_reason_group_safety();
    case "privacy":
      return m.moderation_reason_group_privacy();
    case "abuse":
      return m.moderation_reason_group_abuse();
    case "harmful":
      return m.moderation_reason_group_harmful();
    case "legal":
      return m.moderation_reason_group_legal();
    case "other":
      return m.moderation_reason_group_other();
  }
}

// Localized label for a report reason code. Kept in one place so the picker, the
// admin queue, and any future surface render reasons identically.
export function reasonLabel(reason: ReportReason): string {
  switch (reason) {
    case "csam":
      return m.moderation_reason_csam();
    case "ncii":
      return m.moderation_reason_ncii();
    case "threat_violence":
      return m.moderation_reason_threat_violence();
    case "self_harm":
      return m.moderation_reason_self_harm();
    case "doxxing":
      return m.moderation_reason_doxxing();
    case "leaked_secret":
      return m.moderation_reason_leaked_secret();
    case "harassment":
      return m.moderation_reason_harassment();
    case "hate_speech":
      return m.moderation_reason_hate_speech();
    case "defamation":
      return m.moderation_reason_defamation();
    case "impersonation":
      return m.moderation_reason_impersonation();
    case "nsfw_shock":
      return m.moderation_reason_nsfw_shock();
    case "spam":
      return m.moderation_reason_spam();
    case "dangerous_content":
      return m.moderation_reason_dangerous_content();
    case "embargo_violation":
      return m.moderation_reason_embargo_violation();
    case "copyright":
      return m.moderation_reason_copyright();
    case "other":
      return m.moderation_reason_other();
  }
}

// Past-tense label for a moderation_actions action type, for the history log.
export function actionTypeLabel(actionType: string): string {
  switch (actionType) {
    case "requested_deletion":
      return m.admin_moderation_log_requested_deletion();
    case "approved_deletion":
      return m.admin_moderation_log_approved_deletion();
    case "denied_deletion":
      return m.admin_moderation_log_denied_deletion();
    case "hidden":
      return m.admin_moderation_log_hidden();
    case "unhidden":
      return m.admin_moderation_log_unhidden();
    case "redacted":
      return m.admin_moderation_log_redacted();
    case "dismissed_report":
      return m.admin_moderation_log_dismissed();
    case "escalated_to_deletion":
      return m.admin_moderation_log_escalated();
    case "hard_deleted":
      return m.admin_moderation_log_hard_deleted();
    default:
      return actionType;
  }
}

// Reason-code label that tolerates unknown / internal codes (e.g. author_request
// shown in the admin queue), falling back to the raw code.
export function reasonLabelLoose(reason: string): string {
  if (reason === "author_request") return m.moderation_reason_author_request();
  if (REPORT_REASON_SET.has(reason)) return reasonLabel(reason as ReportReason);
  return reason;
}
