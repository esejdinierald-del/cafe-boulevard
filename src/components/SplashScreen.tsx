import { useState, useEffect } from "react";
import boulevardLogo from "@/assets/boulevard-logo.png";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setFadeOut(true), 1800);
    const timer2 = setTimeout(onFinish, 2300);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-foreground transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src={boulevardLogo}
        alt="Boulevard Café"
        className="w-28 h-28 rounded-2xl object-contain animate-[scaleIn_0.6s_ease-out] mb-6"
      />
      <h1 className="text-primary-foreground text-2xl font-bold tracking-wide animate-[fadeUp_0.8s_ease-out_0.3s_both]">
        Boulevard Café
      </h1>
      <p className="text-primary-foreground/60 text-sm mt-2 animate-[fadeUp_0.8s_ease-out_0.5s_both]">
        Stafi — Thirrjet Live
      </p>
    </div>
  );
};

export default SplashScreen;
