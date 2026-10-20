# Changelog

## 1.0.0
- First release of Inline PDF Display.
- Renders PDF attachments inline in the message body — no separate tab, no double-clicking.
- Inline password prompt for password-protected PDFs.
- Option to place rendered PDFs above or below the message text (Manage → Options).
- Private and offline: all rendering is local via Mozilla PDF.js 6.4.299 (non-minified legacy ESM build); no network access and no telemetry.
- Performance guardrails: first 50 pages rendered inline; PDFs over 75 MB are skipped.
