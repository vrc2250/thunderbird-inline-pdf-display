# ATN submission notes — Inline PDF Display

Notes for addons.thunderbird.net reviewers.

- **Add-on:** Inline PDF Display
- **Version:** 1.0.0
- **Extension ID:** `inline-pdf-display@local.mark`
- **Manifest:** v2 MailExtension
- **Minimum Thunderbird:** 128.0

## What it does

Renders PDF **attachments** of the currently displayed message as images inside
the message body, so the user doesn't have to open each PDF in a separate tab.
Password-protected PDFs get an inline password prompt. A single option controls
whether the rendered PDF appears above or below the message text.

## No remote code / no network / no data collection

- **No remote code.** All scripts are bundled; nothing is fetched or `eval`'d.
  PDF.js is configured with `isEvalSupported: false` and `disableAutoFetch: true`.
- **No network requests.** The add-on never contacts any server. PDFs are read
  from the local message store and rendered locally.
- **No telemetry / analytics / tracking.**
- **No user data leaves the machine.** The only stored data is one preference
  (`placement` = `"before"`/`"after"`) in `storage.local`.

## Permissions — why each is needed

| Permission | Reason |
|-----------|--------|
| `messagesRead` | List the displayed message's attachments and read the PDF bytes (`messages.listAttachments`, `messages.getAttachmentFile`) and resolve the displayed message (`messageDisplay.getDisplayedMessage`). |
| `messagesModify` | Required by `messageDisplayScripts.register`, used to inject the content script that places the rendered pages into the message body. |
| `storage` | Persist the single "placement" preference. |

## Third-party code: PDF.js (bundled)

- **Library:** Mozilla PDF.js (`pdfjs-dist`) **6.4.299**, Apache-2.0.
- **Files:** `pdfjs/pdf.mjs`, `pdfjs/pdf.worker.mjs` — the official,
  **unmodified, non-minified** `legacy` ESM build. License at `pdfjs/LICENSE`,
  provenance at `pdfjs/VERSION.txt`.
- **Reproduce the bundled files exactly:**
  ```bash
  npm pack pdfjs-dist@6.4.299
  tar xzf pdfjs-dist-6.4.299.tgz
  cp package/legacy/build/pdf.mjs        pdfjs/pdf.mjs
  cp package/legacy/build/pdf.worker.mjs pdfjs/pdf.worker.mjs
  cp package/LICENSE                     pdfjs/LICENSE
  ```
- Version chosen to include the fix for CVE-2024-4367 (PDF.js < 4.2.67).

## Build the .xpi (no build tooling required)

The add-on is plain HTML/CSS/JS; the `.xpi` is just a zip of the source files:

```bash
zip -r inline-pdf-display.xpi \
  manifest.json background.html background.js \
  content.js content.css options.html options.js \
  pdfjs icons LICENSE -x '*.map'
```

## Architecture note (why PDF.js runs in the background page)

The message-display document is heavily sandboxed. Running PDF.js directly in a
content script crashes on Xray wrappers; extension iframes and injected
`data:`/`blob:` resources are blocked by the message CSP; and `<canvas>` drawing
from the content-script sandbox does not paint. What does work is `<img>` with a
`data:` URL. So PDF.js runs in the background page (a normal extension context),
renders each page to a PNG, and the content script injects those as
`<img src="data:image/png;base64,…">`. See README.md for the full rationale.

## Known limitations / roadmap

- Pages are rendered eagerly, capped at 50 pages and 75 MB per PDF (guardrails).
  Lazy, render-on-scroll is planned.
- Manifest V2. A Manifest V3 migration is planned as Thunderbird's MV3 support
  matures.
