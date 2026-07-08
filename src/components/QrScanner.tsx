import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

const safeStop = (scanner: Html5Qrcode) => {
  try {
    const state = scanner.getState();
    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
      try {
        scanner.stop().then(() => {
          try { scanner.clear(); } catch { /* ignore */ }
        }).catch(() => {});
      } catch {
        // ignore synchronous throw
      }
    }
  } catch {
    // ignore
  }
};

const QrScanner = ({ onScan, onClose }: QrScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>("qr-reader-" + Date.now());

  useEffect(() => {
    const scanner = new Html5Qrcode(containerRef.current);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Extract token from URL like /staff?token=xxx
          try {
            const url = new URL(decodedText);
            const token = url.searchParams.get("token");
            if (token) {
              safeStop(scanner);
              onScan(token);
              return;
            }
          } catch {
            // Not a URL, try as raw token
            if (decodedText.length >= 6 && decodedText.length <= 20) {
              safeStop(scanner);
              onScan(decodedText);
              return;
            }
          }
        },
        () => {} // ignore scan failures
      )
      .then(() => setIsStarting(false))
      .catch((err) => {
        setIsStarting(false);
        if (err?.toString().includes("NotAllowedError")) {
          setError("Lejo aksesin në kamerë për të skanuar QR kodin");
        } else {
          setError("Nuk u arrit të hapej kamera. Sigurohu që ke lejuar aksesin.");
        }
      });

    return () => {
      safeStop(scanner);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-white font-semibold">Skano QR Kodin e Turnit</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        {isStarting && (
          <div className="absolute z-10 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-white/70 text-sm">Duke hapur kamerën...</p>
          </div>
        )}

        {error ? (
          <div className="text-center p-6 space-y-4">
            <Camera className="h-16 w-16 mx-auto text-white/40" />
            <p className="text-white/80 text-sm">{error}</p>
            <Button variant="outline" onClick={onClose} className="border-white/30 text-white">
              Kthehu
            </Button>
          </div>
        ) : (
          <div
            id={containerRef.current}
            className="w-full max-w-sm mx-auto overflow-hidden rounded-xl"
          />
        )}
      </div>

      <p className="text-center text-white/50 text-xs pb-6 px-4">
        Drejto kamerën te QR kodi i turnit në dashboard
      </p>
    </div>
  );
};

export default QrScanner;
