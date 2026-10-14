// Inline PDF Display — background (module page)
//
// All PDF.js work happens here, in the background page — a normal same-origin
// extension context, so PDF.js and its worker run without the Xray-wrapper
// crash seen in the message document, and without the message-display CSP.
//
// Each PDF page is rendered to a PNG; the base64 bytes are sent to the content
// script, which paints them as <img data:…> in the message body. (Canvas
// drawing and iframes don't work in that sandbox; data: images do.)

import * as pdfjsLib from "./pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  messenger.runtime.getURL("pdfjs/pdf.worker.mjs");

const PDF_MIME = "application/pdf";
const MAX_PAGE_WIDTH = 1100; // rendered pixel width per page
const MAX_PAGES = 50; // guardrail: cap pages rendered per PDF
const MAX_PDF_BYTES = 75 * 1024 * 1024; // guardrail: skip very large attachments

function isPdfAttachment(att) {
  if (!att) return false;
  const type = (att.contentType || "").toLowerCase();
  const name = (att.name || "").toLowerCase();
  return type === PDF_MIME || name.endsWith(".pdf");
}

async function readPartBytes(messageId, partName) {
  const file = await messenger.messages.getAttachmentFile(messageId, partName);
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

// Render a PDF (optionally with a password) to base64 PNG pages.
// Returns one of: { pages, numPages, truncated }, { locked, incorrect }, { error }.
async function renderBytes(bytes, password) {
  if (bytes.length > MAX_PDF_BYTES) {
    return {
      error:
        "PDF is too large to preview inline (" +
        Math.round(bytes.length / (1024 * 1024)) +
        " MB). Open it with the attachment viewer instead.",
    };
  }

  const task = pdfjsLib.getDocument({
    data: bytes,
    password: password || undefined,
    // Don't fetch external fonts/resources for attachment previews.
    disableAutoFetch: true,
    isEvalSupported: false,
  });

  let pdf;
  try {
    pdf = await task.promise;
  } catch (e) {
    if (e && e.name === "PasswordException") {
      return {
        locked: true,
        incorrect: e.code === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD,
      };
    }
    return { error: String(e && e.message ? e.message : e) };
  }

  try {
    const numPages = pdf.numPages;
    const limit = Math.min(numPages, MAX_PAGES);
    const pages = [];
    for (let i = 1; i <= limit; i++) {
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.max(1, MAX_PAGE_WIDTH / base.width));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;

      pages.push(canvas.toDataURL("image/png").split(",", 2)[1]);
      page.cleanup();
    }
    return { pages, numPages, truncated: numPages > limit };
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  } finally {
    try { await pdf.cleanup(); } catch (_) {}
  }
}

async function getDisplayedMessageId(sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  if (tabId === undefined) return null;
  const message = await messenger.messageDisplay.getDisplayedMessage(tabId);
  return message ? message.id : null;
}

messenger.runtime.onMessage.addListener((msg, sender) => {
  if (!msg) return false;

  if (msg.type === "renderPdfs") {
    return (async () => {
      try {
        const messageId = await getDisplayedMessageId(sender);
        if (messageId === null) return { ok: true, pdfs: [] };
        const attachments = (
          await messenger.messages.listAttachments(messageId)
        ).filter(isPdfAttachment);

        const pdfs = [];
        for (const att of attachments) {
          const entry = {
            name: att.name || "document.pdf",
            partName: att.partName,
          };
          try {
            const bytes = await readPartBytes(messageId, att.partName);
            entry.size = bytes.length;
            Object.assign(entry, await renderBytes(bytes, null));
          } catch (e) {
            entry.error = String(e && e.message ? e.message : e);
          }
          pdfs.push(entry);
        }
        return { ok: true, pdfs };
      } catch (e) {
        return { ok: false, error: String(e && e.message ? e.message : e) };
      }
    })();
  }

  if (msg.type === "renderPdf") {
    return (async () => {
      try {
        const messageId = await getDisplayedMessageId(sender);
        if (messageId === null) return { ok: false, error: "No message" };
        const bytes = await readPartBytes(messageId, msg.partName);
        return Object.assign({ ok: true }, await renderBytes(bytes, msg.password));
      } catch (e) {
        return { ok: false, error: String(e && e.message ? e.message : e) };
      }
    })();
  }

  return false;
});

async function registerDisplayScripts() {
  try {
    await messenger.messageDisplayScripts.register({
      css: [{ file: "content.css" }],
      js: [{ file: "content.js" }],
    });
    console.log("[InlinePDF] message display scripts registered; pdf.js " + pdfjsLib.version);
  } catch (e) {
    console.error("[InlinePDF] failed to register display scripts:", e);
  }
}

registerDisplayScripts();
