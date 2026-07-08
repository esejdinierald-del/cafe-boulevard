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
      pre { margin: 0; padding: 8px; font-size: 12px; line-height: 1.25; white-space: pre-wrap; }
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
  if (!printWindow || printWindow.closed) return false;
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