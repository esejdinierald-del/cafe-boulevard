import { useEffect } from "react";

const InstallStaff = () => {
  useEffect(() => {
    // Mark this device as a staff PWA and redirect to the staff app.
    try {
      localStorage.setItem("staff_pwa_preferred", "1");
    } catch {}
    window.location.replace("/staff?app=ios");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a10] text-white">
      <p className="text-sm opacity-70">Duke hapur aplikacionin e stafit…</p>
    </div>
  );
};

export default InstallStaff;