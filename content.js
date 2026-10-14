// Inline PDF Display — content script (runs inside the displayed message)
//
// The background page renders PDF pages to PNG bytes. Here we paint those onto
// <canvas> elements inserted at the top of the message body. We deliberately
// avoid <img src=...>, iframes, and blob:/data: URLs because Thunderbird's
// message CSP blocks add-on-injected resource loads. Canvas painting via
// createImageBitmap()/drawImage() is pure JS and is not affected by CSP.

(() => {
  "use strict";

  const CONTAINER_ID = "inline-pdf-display-root";
  if (document.getElementById(CONTAINER_ID)) return;

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const c of [].concat(children)) {
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  function formatBytes(n) {
    if (!n && n !== 0) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function notice(body, text, kind) {
    body.textContent = "";
    body.append(el("div", { className: "ipdf-notice ipdf-" + kind, textContent: text }));
  }

  // Render PDF pages as <img> elements with data: URLs. Canvas drawing is inert
  // in the message pane and iframes are CSP-blocked, but data: images in <img>
  // display fine, so this is the rendering path.
  function paintPages(body, pages, noteText) {
    body.textContent = "";
    if (noteText) {
      body.append(el("div", { className: "ipdf-notice ipdf-info", textContent: noteText }));
    }
    for (const b64 of pages) {
      const img = el("img", { className: "ipdf-page", alt: "PDF page" });
      img.src = "data:image/png;base64," + b64;
      body.append(img);
    }
  }

  // Build a "showing first N of M pages" note when the render was capped.
  function truncNote(obj) {
    if (!obj || !obj.truncated) return null;
    const shown = obj.pages ? obj.pages.length : 0;
    return (
      "Showing the first " + shown + " of " + obj.numPages +
      " pages. Open the attachment to see the rest."
    );
  }

  function promptPassword(body, att, incorrect) {
    body.textContent = "";
    const input = el("input", {
      type: "password",
      className: "ipdf-pass-input",
      placeholder: "PDF password",
    });
    const btn = el("button", { className: "ipdf-pass-btn", textContent: "Unlock" });
    const submit = async () => {
      if (!input.value) return;
      notice(body, "Unlocking…", "info");
      let resp;
      try {
        resp = await messenger.runtime.sendMessage({
          type: "renderPdf",
          partName: att.partName,
          password: input.value,
        });
      } catch (e) {
        notice(body, "Error: " + (e && e.message ? e.message : e), "error");
        return;
      }
      if (!resp || !resp.ok) {
        notice(body, "Error: " + ((resp && resp.error) || "unknown"), "error");
      } else if (resp.locked) {
        promptPassword(body, att, true);
      } else if (resp.error) {
        notice(body, "Could not display PDF: " + resp.error, "error");
      } else if (resp.pages) {
        paintPages(body, resp.pages, truncNote(resp));
      }
    };
    btn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    const text = incorrect
      ? "Incorrect password — try again."
      : "This PDF is password protected. Enter the password to view it.";
    body.append(
      el("div", { className: "ipdf-notice ipdf-lock" }, [
        el("div", { textContent: "🔒 " + text }),
        el("div", { className: "ipdf-pass-row" }, [input, btn]),
      ])
    );
    input.focus();
  }

  function buildPanel(att) {
    const panel = el("div", { className: "ipdf-panel" });
    panel.append(
      el("div", { className: "ipdf-header" }, [
        el("span", { className: "ipdf-title", textContent: "📄 " + att.name }),
        el("span", { className: "ipdf-meta", textContent: formatBytes(att.size) }),
      ])
    );
    const body = el("div", { className: "ipdf-body" });
    panel.append(body);

    if (att.error) notice(body, "Could not read PDF: " + att.error, "error");
    else if (att.locked) promptPassword(body, att, false);
    else if (att.pages) paintPages(body, att.pages, truncNote(att));
    else notice(body, "No displayable content.", "error");

    return panel;
  }

  async function getPlacement() {
    try {
      const stored = await messenger.storage.local.get("placement");
      if (stored && stored.placement) return stored.placement;
    } catch (e) {
      console.error("[InlinePDF] placement load failed:", e);
    }
    return "after"; // default
  }

  function placeRoot(root, placement) {
    if (placement === "before") {
      document.body.insertBefore(root, document.body.firstChild);
    } else {
      document.body.appendChild(root);
    }
  }

  // Re-position live if the preference changes while a message is open.
  messenger.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.placement) return;
    const root = document.getElementById(CONTAINER_ID);
    if (root) placeRoot(root, changes.placement.newValue);
  });

  async function main() {
    let resp;
    try {
      resp = await messenger.runtime.sendMessage({ type: "renderPdfs" });
    } catch (e) {
      console.error("[InlinePDF] request failed:", e);
      return;
    }
    if (!resp || !resp.ok) {
      if (resp && resp.error) console.error("[InlinePDF]", resp.error);
      return;
    }
    const pdfs = resp.pdfs || [];
    if (pdfs.length === 0) return;

    const root = el("div", { id: CONTAINER_ID });
    for (const att of pdfs) root.append(buildPanel(att));
    placeRoot(root, await getPlacement());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main, { once: true });
  } else {
    main();
  }
})();
