const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const printDocument = (title: string, body: string) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      html, body { margin: 0; padding: 0; background: #fff; color: #000; }
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
      pre { margin: 0; padding: 4px 6px; font-size: 10px; line-height: 1.15; white-space: pre-wrap; }
      .status { padding: 16px; font-size: 13px; }
    </style>
  </head>
  <body>${body}</body>
</html>`;

export const openReceiptPrintWindow = (title = "Bileta") => {
  const printWindow = window.open("", "_blank", "width=380,height=650");
  if (!printWindow) return null;
  printWindow.document.open();
  printWindow.document.write(printDocument(title, `<div class="status">Duke përgatitur printimin...</div>`));
  printWindow.document.close();
  return printWindow;
};

export const writeReceiptAndPrint = (printWindow: Window | null, receiptText: string, title = "Bileta") => {
  if (!printWindow || printWindow.closed) {
    // Fallback for mobile / popup-blocked: print inline in the current document.
    printReceiptInline(receiptText, title);
    return true;
  }
  printWindow.document.open();
  printWindow.document.write(
    printDocument(
      title,
      `<pre>${escapeHtml(receiptText)}</pre><script>setTimeout(function(){ window.focus(); window.print(); }, 250);<\/script>`,
    ),
  );
  printWindow.document.close();
  return true;
};

export const closePrintWindow = (printWindow: Window | null) => {
  if (printWindow && !printWindow.closed) printWindow.close();
};

/**
 * Inline printing — works on mobile (no popup required).
 * Mounts a hidden print area, calls window.print(), then cleans up.
 * Requires the global `@media print` rules in src/index.css.
 */
export const printReceiptInline = (receiptText: string, _title = "Bileta") => {
  const existing = document.getElementById("boulevard-print-area");
  if (existing) existing.remove();

  const wrap = document.createElement("div");
  wrap.id = "boulevard-print-area";
  const pre = document.createElement("pre");
  pre.textContent = receiptText;
  wrap.appendChild(pre);
  document.body.appendChild(wrap);

  const cleanup = () => {
    setTimeout(() => wrap.remove(), 500);
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  setTimeout(() => {
    try { window.print(); } finally { setTimeout(cleanup, 3000); }
  }, 100);
};

/**
 * Preferred entry point — tries popup first (best on desktop, keeps the
 * app UI usable), falls back to inline printing on mobile / blocked popups.
 */
export const printReceipt = (receiptText: string, title = "Bileta") => {
  const w = openReceiptPrintWindow(title);
  if (w) {
    writeReceiptAndPrint(w, receiptText, title);
  } else {
    printReceiptInline(receiptText, title);
  }
};