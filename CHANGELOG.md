# Changelog

## 1.0.0
- Initial release.
- Renders PDF attachments inline in the message body (no separate tab).
- Inline password prompt for password-protected PDFs.
- Option to place PDFs before or after the message text.
- Bundles Mozilla PDF.js 6.4.299 (non-minified legacy ESM build).
- Guardrails: first 50 pages rendered inline; PDFs over 75 MB skipped.
- No network access, no telemetry, all rendering done locally.
