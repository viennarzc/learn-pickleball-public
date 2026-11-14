# Sensitive Information and Credential Audit

This report records audit observations through 13 November 2026. Historical file paths and deployment results refer to the state at the time of each check; see the repository README for current documentation paths.

## Follow-up audit — 13 November 2026

This section supersedes the earlier status where it conflicts. The audit used the JavaScript frontend security guidance, inspected the static app, SEO functions, middleware, deployment settings, working-tree filenames, and reachable Git objects. The prior 12 November pattern scan and the 13 November follow-up found no recognizable credential patterns; neither is an exhaustive secret scan. Binary image contents, deleted or unreachable Git objects, hosted scanner settings, and current production headers were not independently verified in this follow-up.

### High — SEC-002: vulnerable transitive dependency (remediated locally)

- **Evidence:** `npm audit --omit=dev` reported GHSA-mrhx-c7xc-m3w5 in Zod through `@vercel/functions` → `@vercel/oidc` → `@vercel/cli-config`. The advisory describes memory exhaustion while validating oversized constrained collections; this project does not directly expose a Zod validation endpoint, so practical exploitability here has not been established.
- **Remedy:** Updated the lockfile to `@vercel/functions` 3.11.2 and a patched transitive Zod version using `npm audit fix --omit=dev --ignore-scripts`. The subsequent audit reported zero known vulnerabilities. Review runtime behavior in an authorized preview before release.

### Low — SEC-003: malformed host can break SEO endpoints (remediated locally)

- **Location:** `api/seo-pages.js:10-25`; `scripts/check-seo.mjs`.
- **Evidence and impact:** A host with an invalid port passed the original character check and could throw during `new URL` construction in the robots or sitemap handler, producing a failed request.
- **Remedy:** Validate the parsed origin and fall back to localhost on invalid inputs. Regression checks cover malformed hosts and ensure both generators accept the fallback. Forwarded-host trust and cache behavior remain deployment-specific and should be checked at the edge.

### Low — SEC-004: local paths and commit email metadata (partially remediated)

- **Location:** `design-qa.md:5-18,86` and reachable Git history.
- **Evidence and impact:** The tracked QA document previously contained absolute user-specific paths. Historical versions still contain those paths; two distinct commit email addresses are not GitHub noreply addresses. A public clone exposes reachable history and metadata even after current files are sanitized.
- **Remedy:** Replaced the current document's paths with generic artifact references. History and commit metadata were deliberately not rewritten; decide whether to preserve them or prepare a separately sanitized repository before publication. Review untracked `design-review/` screenshots and assets before adding them.
- **Snapshot check:** In the separate history-free local snapshot, a structural scan of all 33 PNG and 15 WebP assets found no EXIF, XMP, or PNG text metadata chunks. This is not a visual inspection or a complete scan of proprietary metadata, fonts, compressed image pixels, or asset rights.

### Operational checks still open

- On 13 November, the public root returned HTTP 200 without the configured CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy headers. Vercel's latest READY production deployment is still `main` at `c43f759`; the local fixes and configured headers are not deployed there. Verify headers after an authorized release.
- Requests on that production hostname for `design-qa.md`, `security_best_practices_report.md`, and `docs/ARCHITECTURE.md` returned 404. This checks only those paths on the older deployment and does not establish the contents or exclusions of a future deployment.
- GitHub connector requests for the branch commit's workflow runs and combined status returned 404. That response does not establish whether the workflow ran; verify hosted secret scanning with an account that has repository access.
- Confirm the Vercel deployment input and output exclude local review materials and other private files; `outputDirectory: "."` and Git ignore rules alone do not establish that boundary for every deployment method.
- The frontend uses HTML template rendering via `innerHTML`; its values need continued context-sensitive escaping and source URL review. The observed use of CSP and escaped dynamic content provides defense in depth, not a complete security proof.
- The 24 current source records use HTTPS URLs without embedded credentials. `scripts/check-curriculum.mjs` now checks those properties to guard against introducing executable URL schemes or credentials in source links.
- Consider a dedicated history secret scanner and review repository/commit metadata and asset rights before opening the repository. No deployment, Git history rewrite, or external publication was performed by this audit.

## Executive summary

No passwords, API keys, access tokens, private keys, OAuth secrets, cookies, or credential files were found in the tracked source, configuration, documentation, or Git history scan performed on 12 November 2026. This pattern-based scan is not exhaustive. The repository is a static client-side app; its browser storage contains learning progress only, not authentication or identity data.

The local environment-file ignore issue has been addressed. The public production response lacks several configured security headers; the latest production deployment predates the current branch. Automated secret scanning remains unverified.

## Scope and method

- Scanned tracked files and the working tree, excluding dependency internals and binary artwork from text-pattern matching.
- Checked filenames for `.env`, credential, secret, token, private-key, certificate, and key material.
- Checked current Git content and reachable history for common secret signatures and credential assignment patterns.
- Reviewed browser storage and deployment configuration for sensitive values and security headers.

## Findings

### SEC-001 — Add default ignores for local environment and credential files

- **Severity:** Low (preventative)
- **Location:** `.gitignore:1-4`
- **Evidence:** The file ignores QA images, `.vercel`, and `node_modules`, but has no `.env*`, credential, certificate, or local secrets patterns.
- **Impact:** A future developer could accidentally stage a local `.env` or credential file. This is not evidence that a secret is currently exposed; the audit found no such file.
- **Fix:** Add conservative ignores such as `.env`, `.env.*`, `!.env.example`, and local certificate/key patterns if the project ever uses them. Keep an example file with placeholders only.
- **Mitigation:** Add a pre-commit secret scanner and enable repository secret scanning on the Git host.
- **False-positive notes:** Do not ignore real application configuration that is intentionally public; review any new ignored file before committing.

## Confirmed safe observations

- `content/progress.js:1-18,54-74` stores only lesson state, practice logs, route IDs, and sticker IDs under `learn-pickleball:v2`; no account, contact, or credential fields are present.
- `vercel.json:16-51` defines a restrictive same-origin CSP and defensive response headers (`X-Content-Type-Options`, `X-Frame-Options`, referrer and permissions policies).
- No `Authorization: Bearer`, cloud access-key, private-key block, password assignment, OAuth client secret, or token-shaped credential was found in tracked content or reachable Git history.
- `design-review/` is currently untracked and contains design screenshots/notes, not credential files. Review screenshots manually before sharing if browser chrome or other personal context has been added to any capture.

## Follow-up recommendations

1. SEC-001's environment and key-file ignore rules were added by 12 November and expanded in the 14 November maintenance update below.
2. Run a repository-host secret scan in CI/pre-commit (for example, a vetted scanner with baseline review).
3. Verify that the production edge actually serves the headers in `vercel.json`; this audit confirms the repository configuration, not a deployed response.

## Remediation and production check — 12 November 2026

- SEC-001 addressed locally: `.gitignore` now excludes local environment files and common private-key formats while allowing `.env.example`. Git ignore checks and `npm run check` passed.
- A request to the public root returned HTTP 200 but did not include the configured CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers. The repository configuration alone therefore does not establish that the live site is protected by them. Verify the deployed project and deployment revision, then deploy the intended configuration and retest.
- Automated secret scanning remains recommended; no hosted scanner or repository setting was enabled during this local change.
- Vercel deployment records show the latest ready deployment of commit `2d0210d` is a preview, while the latest production-target deployment is from `main` at `c43f759`. Thus the production header check does not verify this branch's configuration. Promoting or merging this branch would change the live application and requires a separate release decision.
- The GitHub repository is private; the repository API did not return secret-scanning settings, so their status could not be established from that response.
- Added `.github/workflows/secret-scan.yml` locally to run Gitleaks on pushes, pull requests, and manual requests with full checkout history and immutable action pins. Comments and artifact uploads are disabled to reduce unintended disclosure. The workflow must be committed and run on GitHub before its operation can be verified.
- An authenticated Vercel fetch of preview commit `2d0210d` returned HTTP 200 with the configured CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, Referrer-Policy, and Permissions-Policy. This confirms those headers on the preview, not the older production deployment. The fetch used a temporary Vercel share link, which expires automatically.

## Ignore-rule maintenance — 14 November 2026

- `.gitignore` now also covers common local build outputs, framework and bundler caches, editor and assistant settings, scratch files, npm configuration, and local AWS/SSH directories. It preserves `.env.example`, `.npmrc.example`, and shared VS Code extension recommendations.
- These rules reduce accidental staging of local state; they are not a substitute for reviewing staged files or scanning repository history for secrets.

