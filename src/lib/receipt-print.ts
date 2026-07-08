const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// Auto-fit tuning:
//  - 80mm roll, 0 margin. Usable width ≈ 78mm after padding.
//  - Monospace char width ≈ font-size * 0.6.
//  - We start at 12px bold and shrink until the widest line fits.
const AUTOFIT_SCRIPT = `
(function(){
  function fit(){
    var pre = document.querySelector('pre');
    if (!pre) return;
    var maxLine = 0;
    var lines = pre.textContent.split('\\n');
    for (var i = 0; i < lines.length; i++) if (lines[i].length > maxLine) maxLine = lines[i].length;
    var usable = document.body.clientWidth - 12; /* padding */
    if (usable <= 0) usable = 280;
    var size = 12;
    for (; size >= 7; size -= 0.5){
      if (maxLine * size * 0.6 <= usable) break;
    }
    pre.style.fontSize = size + 'px';
    pre.style.lineHeight = (size <= 9 ? 1.05 : size <= 10 ? 1.1 : 1.15);
  }
  fit();
  setTimeout(function(){ window.focus(); window.print(); }, 200);
})();`;

const printDocument = (title: string, body: string, withAutofit = false) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
        height: auto;
        min-height: 0;
      }
      body {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-weight: 700;
        width: 80mm;
      }
      pre {
        margin: 0;
        padding: 0 3mm 2mm 3mm;
        font-size: 11px;
        line-height: 1.1;
        font-weight: 700;
        white-space: pre-wrap;
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      .status { padding: 16px; font-size: 13px; }
    </style>
  </head>
  <body>${body}${withAutofit ? `<script>${AUTOFIT_SCRIPT}<\/script>` : ""}</body>
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
    printDocument(title, `<pre>${escapeHtml(receiptText)}</pre>`, true),
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

  // Auto-fit before print: shrink font-size until the widest line fits 80mm.
  const autoFit = () => {
    const lines = receiptText.split("\n");
    let maxLine = 0;
    for (const l of lines) if (l.length > maxLine) maxLine = l.length;
    // 80mm ≈ 302px. Minus horizontal padding (~24px) leaves ~278px usable.
    const usable = 278;
    let size = 12;
    for (; size >= 7; size -= 0.5) {
      if (maxLine * size * 0.6 <= usable) break;
    }
    pre.style.fontSize = `${size}px`;
    pre.style.lineHeight = size <= 9 ? "1.05" : size <= 10 ? "1.1" : "1.15";
  };
  autoFit();

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