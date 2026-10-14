// Options page for Inline PDF Display. Stores the PDF placement preference
// ("before" or "after" the email text) in storage.local. Default: "after".

const DEFAULT_PLACEMENT = "after";
const savedEl = document.getElementById("saved");

function flashSaved() {
  savedEl.classList.add("show");
  setTimeout(() => savedEl.classList.remove("show"), 1200);
}

async function restore() {
  let placement = DEFAULT_PLACEMENT;
  try {
    const stored = await messenger.storage.local.get("placement");
    if (stored && stored.placement) placement = stored.placement;
  } catch (e) {
    console.error("[InlinePDF] options load failed:", e);
  }
  const radio = document.querySelector(
    'input[name="placement"][value="' + placement + '"]'
  );
  if (radio) radio.checked = true;
}

for (const input of document.querySelectorAll('input[name="placement"]')) {
  input.addEventListener("change", async (e) => {
    if (!e.target.checked) return;
    try {
      await messenger.storage.local.set({ placement: e.target.value });
      flashSaved();
    } catch (err) {
      console.error("[InlinePDF] options save failed:", err);
    }
  });
}

restore();
