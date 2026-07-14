import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { QRCodeSVG } from "qrcode.react";
import boulevardLogo from "@/assets/boulevard-logo.png";

export interface PrintOptions {
  /** Show Boulevard Cafe logo header + QR footer (used for close_table receipts). */
  branded?: boolean;
  /** Value encoded in the QR at the bottom. Defaults to the published venue URL. */
  qrValue?: string;
}

const DEFAULT_QR_VALUE = "https://boulevard-caffe.lovable.app";

const brandedHeaderHtml = () => `
<div class="brand-header">
  <img src="${boulevardLogo}" alt="Boulevard Cafe" class="brand-logo" />
  <div class="brand-name">BOULEVARD CAFE</div>
</div>`;

const brandedFooterHtml = (qrValue: string) => {
  const qrSvg = renderToStaticMarkup(
    createElement(QRCodeSVG, { value: qrValue, size: 200, level: "M", includeMargin: false }),
  );
  return `
<div class="brand-footer">
  <div class="qr-box">${qrSvg}</div>
</div>`;
};

const buildBody = (receiptText: string, opts?: PrintOptions) => {
  const pre = `<pre>${escapeHtml(receiptText)}</pre>`;
  if (!opts?.branded) return pre;
  return `${brandedHeaderHtml()}${pre}${brandedFooterHtml(opts.qrValue || DEFAULT_QR_VALUE)}`;
};

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
    var size = 18;
    for (; size >= 10; size -= 0.5){
      if (maxLine * size * 0.6 <= usable) break;
    }
    pre.style.fontSize = size + 'px';
    pre.style.lineHeight = (size <= 11 ? 1.1 : size <= 13 ? 1.15 : 1.2);
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
      @page { size: 72mm 200mm; margin: 0; }
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
        width: 72mm;
      }
      pre {
        margin: 0;
        padding: 0 3mm 2mm 3mm;
        font-size: 16px;
        line-height: 1.2;
        font-weight: 700;
        white-space: pre-wrap;
        page-break-after: avoid;
        page-break-inside: avoid;
      }
      .status { padding: 16px; font-size: 13px; }
      .brand-header {
        text-align: center;
        padding: 4mm 3mm 2mm 3mm;
      }
      .brand-logo {
        width: 18mm;
        height: 18mm;
        object-fit: contain;
        display: block;
        margin: 0 auto 1mm auto;
      }
      .brand-name {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 2px;
      }
      .brand-footer {
        text-align: center;
        padding: 2mm 3mm 4mm 3mm;
      }
      .qr-box {
        display: inline-block;
        width: 20mm;
        height: 20mm;
      }
      .qr-box svg {
        width: 20mm !important;
        height: 20mm !important;
        display: block;
      }
    </style>
  </head>
  <body>${body}${withAutofit ? `<script>${AUTOFIT_SCRIPT}<\/script>` : ""}</body>
</html>`;

export const openReceiptPrintWindow = (title = "Boulevard Cafe") => {
  const printWindow = window.open("", "_blank", "width=380,height=650");
  if (!printWindow) return null;
  printWindow.document.open();
  printWindow.document.write(printDocument(title, `<div class="status">Duke përgatitur printimin...</div>`));
  printWindow.document.close();
  return printWindow;
};

export const writeReceiptAndPrint = (
  printWindow: Window | null,
  receiptText: string,
  title = "Boulevard Cafe",
  opts?: PrintOptions,
) => {
  if (!printWindow || printWindow.closed) {
    // Fallback for mobile / popup-blocked: print inline in the current document.
    printReceiptInline(receiptText, title);
    return true;
  }
  printWindow.document.open();
  printWindow.document.write(
    printDocument(title, buildBody(receiptText, opts), true),
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
export const printReceiptInline = (receiptText: string, _title = "Boulevard Cafe") => {
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
    let size = 18;
    for (; size >= 10; size -= 0.5) {
      if (maxLine * size * 0.6 <= usable) break;
    }
    pre.style.fontSize = `${size}px`;
    pre.style.lineHeight = size <= 11 ? "1.1" : size <= 13 ? "1.15" : "1.2";
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
export const printReceipt = (receiptText: string, title = "Boulevard Cafe", opts?: PrintOptions) => {
  const w = openReceiptPrintWindow(title);
  if (w) {
    writeReceiptAndPrint(w, receiptText, title, opts);
  } else {
    printReceiptInline(receiptText, title);
  }
};

/**
 * Printim via iframe i izoluar — përdoret nga /print-station.
 * Krijon një dokument të pastër 80mm (pa CSS të app-it, pa oklch, pa temë)
 * dhe thërret print() brenda iframe-it. Kjo shmang "Print preview failed"
 * në Chrome kiosk-printing me printer termik.
 */
export const printReceiptViaIframe = (
  receiptText: string,
  title = "Boulevard Cafe",
  opts?: PrintOptions,
): Promise<void> => {
  return new Promise((resolve) => {
    // Fshi iframe-in e mëparshëm nëse ka mbetur
    const old = document.getElementById("boulevard-print-iframe");
    if (old) old.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "boulevard-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "80mm";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const cleanup = () => {
      setTimeout(() => {
        try { iframe.remove(); } catch { /* ignore */ }
      }, 1500);
      resolve();
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) { cleanup(); return; }
        // Prit pak që CSS/layout të stabilizohet, pastaj print
        setTimeout(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {
            console.error("[print-iframe] print() failed", e);
          }
          cleanup();
        }, 250);
      } catch (e) {
        console.error("[print-iframe] onload error", e);
        cleanup();
      }
    };

    const doc = iframe.contentDocument;
    if (!doc) { cleanup(); return; }
    doc.open();
    doc.write(printDocument(title, buildBody(receiptText, opts), true));
    doc.close();
  });
};