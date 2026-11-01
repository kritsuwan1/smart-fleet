# Dependency security review — Task 2B.1

Date: 2026-11-01. Branch: `dev/smartfleet-batch-1`. Baseline: `98e30cc058fcb73b65bef6fdb478675d9385dbb3`.

## Actual audit results

Read AGENTS.md and the required roadmap/architecture/progress/test-plan documents. Audited the committed baseline lockfile with `npm audit --json --package-lock-only --ignore-scripts`; audited the installed fixed tree with `npm audit --json`. Both audit commands exit 1 when vulnerabilities remain; this is an incomplete security gate, not a build failure.

| Finding | Before | After |
| --- | ---: | ---: |
| Critical affected package nodes | 0 | 0 |
| High affected package nodes | 5 | 3 |
| Moderate affected package nodes | 0 | 0 |
| Low affected package nodes | 1 | 1 |
| Total affected package nodes | 6 | 4 |
| Production-only audit | 0 (prior review) | 0 (fresh installed-tree audit, exit 0) |

These are package-node counts, NOT unique CVE counts. The baseline contains 35 distinct direct GHSA advisories below. Moderate/low advisories inside undici do not appear separately in npm's package-level totals because undici is classified by its highest severity. All affected lockfile entries have `dev: true`.

## Chains, exposure and changes

| Package / dependency chain | Before → after | Impact assessment |
| --- | --- | --- |
| root → esbuild (development) | 0.28.0 → 0.28.1 | Direct build tool patched. Windows development-server file-read issue; SmartFleet build.mjs uses the build API, not serve(). |
| root → wrangler → esbuild | 0.27.3 unchanged | Same Low advisory remains in Wrangler's nested copy. Avoid exposing its local development server to untrusted clients. |
| root → wrangler → miniflare → undici | 7.24.8 → 7.30.1 | TLS verification bypass, cross-user cache/cookie disclosure, header/response injection and DoS in affected client features. Applicable to developer CLI/emulator network operations depending on API usage. |
| root → wrangler → miniflare → ws | 8.18.0 → 8.21.0 | Uninitialized memory disclosure and memory exhaustion with hostile WebSocket peers. Development tooling risk. |
| root → wrangler → miniflare → sharp → bundled native image libraries | 0.34.5 unchanged | High libvips/libheif/librsvg vulnerabilities when processing malicious images in local tooling. SmartFleet does not directly import sharp or expose an image-transformation feature. |
| root → wrangler / miniflare | 4.92.0 / 4.20260515.0 unchanged | High inherited from sharp; neither has a separate direct GHSA in this report. |

Production React/react-dom/lucide-react versions and their lockfile entries remain unchanged. Source inspection found no application imports of undici/ws/sharp/miniflare; the deployed Worker uses native fetch. This narrows the likely exposure to development tooling; it does not prove absence of exploitable paths or imply credentials used by a CLI are safe. No production credentials were used in this review.

Minimal safe changes: patch direct esbuild and add overrides scoped to the existing exact Miniflare release for undici 7.30.1 and ws 8.21.0. No source/business logic/test/config changes; no force fix. Overrides intentionally depart from Miniflare's exact pins and require the offline compatibility smoke plus app tests. Remove/re-evaluate them when the parent dependency supplies safe versions.

## Blocked upgrade: approval required

Do not claim remediation complete. The registry's automatic fix proposes Wrangler 4.156.0, which pulls Miniflare 5.20261023.3-beta (major 4 → 5, prerelease). It was NOT installed. A stable alternative is Wrangler 4.116.0 with Miniflare 4.20260730.0, esbuild 0.28.1, undici 7.28.0, sharp 0.35.2 and ws 8.21.0; it still requires patched undici 7.30.1 and sharp 0.35.5 overrides. Sharp 0.35.0 explicitly introduces breaking changes (Node >=20.9, installation fallback, image limits/AVIF behavior and deprecated API removals), even though the numeric major remains 0. No sharp 0.34.x fix is available in the audit ranges. This transition requires the user's approval under task item 11 and was NOT applied.

Proposed next approved step: prefer the stable Wrangler/Miniflare major-4 path, verify sharp API usage inside that Miniflare version, test native image processing and emulator Worker/D1/R2 behavior on Windows/Linux Node 24, then repeat audit, all 13 suites and Linux CI. No deploy or real resources are needed. Alternatively review the newer Miniflare 5 prerelease separately; do not treat it as automatically safe because Wrangler remains major 4.

Primary release evidence: [esbuild 0.28.1](https://github.com/evanw/esbuild/releases/tag/v0.28.1), [Wrangler 4.116.0](https://github.com/cloudflare/workers-sdk/releases/tag/wrangler@4.116.0), [sharp 0.35.0 breaking changes](https://sharp.pixelplumbing.com/changelog/v0.35.0/), [sharp 0.35.5](https://github.com/lovell/sharp/releases/tag/v0.35.5), [undici 7.30.1 security fixes](https://github.com/nodejs/undici/releases/tag/v7.30.1). Dependency versions were also checked with read-only npm registry metadata.

## Complete baseline advisory inventory

GHSA identifiers are supplied for every direct advisory; the sharp entry includes upstream CVE IDs from npm. Follow each primary advisory for affected features and full CVE mapping. After the partial fix, only the esbuild advisory (nested copy) and all three sharp advisories remain; other rows are resolved in the installed tree.

| Package | Severity | GHSA | Affected range | Advisory |
| --- | --- | --- | --- | --- |
| esbuild | low | [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | >=0.27.3 <0.28.1 | esbuild allows arbitrary file read when running the development server on Windows |
| sharp | high | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | <0.35.0 | sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |
| sharp | high | [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | <0.35.4 | sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 |
| sharp | high | [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | <0.35.5 | sharp : Vulnerability in librsvg dependency CVE-2026-96889 |
| undici | high | [GHSA-vmh5-mc38-953g](https://github.com/advisories/GHSA-vmh5-mc38-953g) | >=7.23.0 <7.28.0 | undici vulnerable to TLS certificate validation bypass via dropped requestTls in SOCKS5 ProxyAgent |
| undici | moderate | [GHSA-p88m-4jfj-68fv](https://github.com/advisories/GHSA-p88m-4jfj-68fv) | >=7.0.0 <7.28.0 | undici vulnerable to HTTP header injection via Set-Cookie percent-decoding |
| undici | high | [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q) | >=7.0.0 <7.28.0 | undici WebSocket client vulnerable to denial of service via fragment count bypass |
| undici | high | [GHSA-hm92-r4w5-c3mj](https://github.com/advisories/GHSA-hm92-r4w5-c3mj) | >=7.23.0 <7.28.0 | undici vulnerable to cross-origin request routing via SOCKS5 proxy pool reuse |
| undici | low | [GHSA-g8m3-5g58-fq7m](https://github.com/advisories/GHSA-g8m3-5g58-fq7m) | >=7.0.0 <7.28.0 | undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching |
| undici | moderate | [GHSA-pr7r-676h-xcf6](https://github.com/advisories/GHSA-pr7r-676h-xcf6) | >=7.0.0 <7.28.0 | undici vulnerable to cross-user information disclosure via shared cache whitespace bypass |
| undici | moderate | [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) | >=7.0.0 <7.29.0 | undici vulnerable to downstream response desynchronization via retry interceptor |
| undici | high | [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272) | >=7.0.0 <7.29.0 | undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives |
| undici | moderate | [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) | >=7.0.0 <7.29.0 | undici vulnerable to CRLF Injection via blob-like body 'type' property |
| undici | moderate | [GHSA-jr45-8vmc-qm54](https://github.com/advisories/GHSA-jr45-8vmc-qm54) | >=7.0.0 <7.29.0 | undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives |
| undici | moderate | [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) | >=7.0.0 <7.29.0 | undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields |
| undici | low | [GHSA-35p6-xmwp-9g52](https://github.com/advisories/GHSA-35p6-xmwp-9g52) | >=7.0.0 <7.28.0 | undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse |
| undici | moderate | [GHSA-pmjh-fq2x-6v4x](https://github.com/advisories/GHSA-pmjh-fq2x-6v4x) | >=7.11.0 <7.29.1 | undici vulnerable to Denial of Service via orphaned RetryHandler response body |
| undici | low | [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) | >=7.0.0 <7.29.1 | undici vulnerable to downstream response splitting via retry interceptor |
| undici | high | [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) | >=7.0.0 <7.29.1 | undici vulnerable to Denial of Service via unrequested WebSocket subprotocol |
| undici | moderate | [GHSA-3xpg-4rpp-hhhm](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm) | >=7.15.0 <7.29.1 | undici vulnerable to Denial of Service via unbounded decompression of compressed responses |
| undici | moderate | [GHSA-2jfj-6hjv-fm6j](https://github.com/advisories/GHSA-2jfj-6hjv-fm6j) | >=7.0.0 <7.29.1 | undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches |
| undici | low | [GHSA-2gqq-gqf2-x968](https://github.com/advisories/GHSA-2gqq-gqf2-x968) | >=7.1.0 <7.29.1 | undici vulnerable to response truncation via oversized chunked responses in the dump interceptor |
| undici | high | [GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3) | >=7.24.1 <7.29.1 | undici vulnerable to TLS certificate validation bypass via dropped connect options in BalancedPool |
| undici | low | [GHSA-8436-99hf-9mmv](https://github.com/advisories/GHSA-8436-99hf-9mmv) | >=7.0.0 <7.29.1 | undici vulnerable to caching and replay of unsafe HTTP method responses |
| undici | moderate | [GHSA-rx4f-c7p8-82vq](https://github.com/advisories/GHSA-rx4f-c7p8-82vq) | >=7.0.0 <7.29.1 | undici vulnerable to Denial of Service via WebSocketStream unclean close |
| undici | moderate | [GHSA-4qv8-2p9j-2685](https://github.com/advisories/GHSA-4qv8-2p9j-2685) | >=7.0.0 <7.30.1 | undici vulnerable to Denial of Service via unbounded memory in the EventSource parser |
| undici | moderate | [GHSA-f72v-6w45-q472](https://github.com/advisories/GHSA-f72v-6w45-q472) | >=7.15.0 <7.30.1 | undici vulnerable to Subresource Integrity bypass via non-lowercase algorithm tokens |
| undici | high | [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) | >=7.18.0 <7.30.1 | undici vulnerable to Denial of Service via unhandled error on excessive content-encodings |
| undici | high | [GHSA-4w7w-5xrc-9h26](https://github.com/advisories/GHSA-4w7w-5xrc-9h26) | >=7.0.0 <7.30.1 | undici vulnerable to cache poisoning and cross-user disclosure via cross-origin redirects |
| undici | high | [GHSA-2m5v-pch6-74hx](https://github.com/advisories/GHSA-2m5v-pch6-74hx) | >=7.0.0 <7.30.1 | undici vulnerable to TLS certificate validation bypass via dropped tls options in Agent |
| undici | high | [GHSA-qrxm-fqhp-jwvm](https://github.com/advisories/GHSA-qrxm-fqhp-jwvm) | >=7.0.0 <7.30.1 | undici vulnerable to Denial of Service via TLS 1.2 certificate-changing renegotiation |
| undici | moderate | [GHSA-9fm3-97px-rjf6](https://github.com/advisories/GHSA-9fm3-97px-rjf6) | >=7.0.0 <7.30.1 | undici WebSocket client vulnerable to Denial of Service via unbounded automatic PONG buffering |
| undici | moderate | [GHSA-55wc-3pg8-jfw6](https://github.com/advisories/GHSA-55wc-3pg8-jfw6) | >=7.15.0 <7.30.1 | undici vulnerable to Denial of Service via unhandled exception in the decompress interceptor |
| ws | moderate | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) | >=8.0.0 <8.20.1 | ws: Uninitialized memory disclosure |
| ws | high | [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) | >=8.0.0 <8.21.0 | ws: Memory exhaustion DoS from tiny fragments and data chunks |

## Validation

Additional local tooling check: Miniflare Worker startup and dispatchFetch PASS with explicit 127.0.0.1. The D1/R2 bridge rehearsal stalled at getD1Database on Windows and was stopped; it did NOT pass. The unchanged baseline (undici 7.24.8) reproduced the same stall at the same step, so it is not evidence of a newly introduced regression. Local D1/R2 emulator compatibility remains unverified; application suites use in-memory SQLite/mocked R2 and do not replace this check. No real resources were used. Require a Linux emulator/staging rehearsal before operational approval.

Windows x64 Node.js v24.22.1: npm ci PASS (44 installed packages); build PASS (Demo 972439 / Production 971063 bytes); typecheck PASS; npm test PASS, all 13 suites. npm was invoked through the host's bundled pnpm dlx npm launcher; npm ci did not run blocked dependency install scripts, and build/tests still succeeded using platform binaries. No approval of install scripts was performed. Linux post-commit results are recorded in PROGRESS.md when available.

The application suites cover worker, import, accounts, roles, reports, system-status, backup-alerts, environments, mobile-ui, history-ui, profile-ui, trip-receipt and automatic-backup. Fixtures/in-memory SQLite only; real staging and production are not tested. No database/schema/environment changes, Cloudflare resource creation, deployment or merge.
