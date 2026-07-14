import { QRCodeSVG } from "qrcode.react";
import { QrCode } from "lucide-react";
import boulevardLogo from "@/assets/boulevard-logo.png";

interface Props {
  staffUrl: string;
}

export function QRCurtain({ staffUrl }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <img src={boulevardLogo} alt="Boulevard Café" className="w-20 h-20 mx-auto rounded-2xl shadow-lg object-contain" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Boulevard Café</h1>
          <p className="text-muted-foreground text-sm mt-1">Dashboard i Stafit</p>
        </div>
        {staffUrl ? (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl inline-block shadow-lg">
              <QRCodeSVG value={staffUrl} size={220} />
            </div>
            <p className="text-sm text-muted-foreground">
              Skano me telefon nga <strong>/staff</strong> për të hapur dashboard-in
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>Njoftimet zanore janë aktive edhe tani</span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground animate-pulse">Duke gjeneruar QR kodin...</p>
        )}
      </div>
    </div>
  );
}