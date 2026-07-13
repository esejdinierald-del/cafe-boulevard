import { AlertOctagon, AlertTriangle, Package, ShieldAlert } from "lucide-react";
import { Header } from "@/components/vulnguard/Header";
import { StatCard } from "@/components/vulnguard/StatCard";
import { SeverityDonut } from "@/components/vulnguard/SeverityDonut";
import { PerPackageBar } from "@/components/vulnguard/PerPackageBar";
import { ScoreGauge } from "@/components/vulnguard/ScoreGauge";
import { PackageTable } from "@/components/vulnguard/PackageTable";
import { Recommendations } from "@/components/vulnguard/Recommendations";
import { CleanPackages } from "@/components/vulnguard/CleanPackages";
import { totals } from "@/data/vuln-scan";

export default function VulnGuard() {
  const t = totals();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <Header />

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Packages" value={t.totalPackages} icon={Package} tone="neutral" />
          <StatCard label="Vulnerable" value={t.vulnerablePackages} icon={ShieldAlert} tone="warning" />
          <StatCard label="Vulnerabilities" value={t.totalVulns} icon={AlertTriangle} tone="warning" />
          <StatCard label="High Severity" value={t.high} icon={AlertOctagon} tone="danger" />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SeverityDonut />
          </div>
          <ScoreGauge />
        </section>

        <section className="mt-6">
          <PerPackageBar />
        </section>

        <section className="mt-6">
          <Recommendations />
        </section>

        <section className="mt-6">
          <PackageTable />
        </section>

        <section className="mt-6 mb-10">
          <CleanPackages />
        </section>
      </div>
    </div>
  );
}