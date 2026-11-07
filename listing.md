# ATN listing copy

Paste these into the corresponding fields when creating the listing on
addons.thunderbird.net. Edit the author/support/homepage details as you like.

---

## Name
Inline PDF Display

## Summary (short, ~250 chars)
View PDF attachments right inside the email — no extra tab, no double-clicking.
PDFs render in the message body automatically, including password-protected
files. Choose whether they appear above or below the message text.

## Categories / Tags
pdf, attachments, viewer, preview, message display, productivity

## Description (full)
Tired of double-clicking every PDF attachment just to glance at it in a separate
tab? Inline PDF Display renders PDF attachments directly in the body of the
email, so you see them the moment you open the message.

Features
• Automatic — PDF attachments render inline as soon as you view the message.
• Save button — each inline PDF has a Save button in its header that saves the
  attachment to disk via a normal save dialog.
• Password-protected PDFs — if a PDF needs a password, you get a prompt right in
  the message; enter it and the pages appear. (Files with only owner/permissions
  restrictions open with no prompt.)
• Placement option — show PDFs above or below the message text (Add-ons →
  Inline PDF Display → Manage → Options).
• Private and offline — everything is rendered locally with Mozilla's PDF.js.
  The add-on makes no network connections, collects no data, and sends nothing
  anywhere.

How to use
1. Open any email that has a PDF attachment. There is nothing to click — the PDF
   renders automatically inside the message, as a bordered panel. By default the
   panel appears below the message text.
2. Each panel has a header showing the file name and size, with a Save button on
   the right. Click Save to write the PDF to disk (a save dialog lets you choose
   the location).
3. If a PDF is password-protected, the panel shows a password field instead of
   the pages — type the password and click Unlock to reveal them.
4. To move the panels above the message text instead of below, go to Add-ons and
   Themes → Inline PDF Display → three-dot menu → Options and choose "Before the
   email text".

After installing
Thunderbird gates message-viewing add-ons behind a permission. If PDFs don't
appear, open Add-ons and Themes → Inline PDF Display → Manage, and set
"Run on sites with restrictions" to Allow.

Notes
• Large PDFs are capped at the first 50 pages inline (open the attachment for
  the rest); very large files (75 MB+) are skipped to keep Thunderbird snappy.
• Open source (MIT). Uses Mozilla PDF.js (Apache-2.0).

## Author
Mark LeBlanc

## Support email
vrc2250@gmail.com

## Homepage / Support site (optional)
https://github.com/vrc2250/thunderbird-inline-pdf-display

## License
MIT
