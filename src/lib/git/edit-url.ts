import { githubBlobUrl, githubEditUrl } from "./github-url";
import { codebergEditUrl, codebergSourceUrl } from "./codeberg-url";

// Provider-aware "edit this file on the forge" URL. Host-sniffs the stored
// repo URL instead of threading the provider column through every viewer
// payload: the canonical repo URL is already in each surface that links out,
// and its host IS the provider. Client-safe (no env imports).
export function forgeEditUrl(repoUrl: string, branch: string, path: string): string {
  if (repoUrl.startsWith("https://codeberg.org/")) {
    return codebergEditUrl(repoUrl, branch, path);
  }
  return githubEditUrl(repoUrl, branch, path);
}

// A file revision on the forge: a living branch or a pinned commit. Forgejo
// routes the two differently, so the distinction must survive to the builder.
export type ForgeRef = { branch: string } | { commit: string };

// Read-only file view on the forge: the original source before docolin's
// sync pipeline canonicalized it, for readers who want to see (not edit) it.
// Pass the version's commit when known, so the view shows the revision the
// reader is actually looking at, not whatever the branch has moved on to.
export function forgeSourceUrl(repoUrl: string, ref: ForgeRef, path: string): string {
  if (repoUrl.startsWith("https://codeberg.org/")) {
    return codebergSourceUrl(repoUrl, ref, path);
  }
  return githubBlobUrl(repoUrl, "commit" in ref ? ref.commit : ref.branch, path);
}

/** Human-readable forge name for labels like "View source on GitHub". */
export function forgeName(repoUrl: string): string {
  return repoUrl.startsWith("https://codeberg.org/") ? "Codeberg" : "GitHub";
}
