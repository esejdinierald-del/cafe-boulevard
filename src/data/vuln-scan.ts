export type Severity = "high" | "moderate";

export interface Vulnerability {
  name: string;
  severity: Severity;
  link: string;
}

export interface Dependency {
  name: string;
  version: string;
  vulnerabilities: Vulnerability[];
}

export interface Scan {
  projectId: string;
  scanDate: string;
  dependencies: Dependency[];
}

export const scan: Scan = {
  projectId: "4423e6d0-076b-440b-a23b-38a2c953e0b8",
  scanDate: "2026-07-07T04:50:26.442Z",
  dependencies: [
    {
      name: "@supabase/supabase-js",
      version: "2.75.0",
      vulnerabilities: [
        { name: "ws: Uninitialized memory disclosure", severity: "moderate", link: "https://github.com/advisories/GHSA-58qx-3vcg-4xpx" },
        { name: "ws: Memory exhaustion DoS", severity: "high", link: "https://github.com/advisories/GHSA-96hv-2xvq-fx4p" },
      ],
    },
    {
      name: "react-router-dom",
      version: "6.30.1",
      vulnerabilities: [
        { name: "React Router vulnerable to XSS via Open Redirects", severity: "high", link: "https://github.com/advisories/GHSA-2w69-qvjg-hvjx" },
        { name: "React Router unexpected external redirect", severity: "moderate", link: "https://github.com/advisories/GHSA-9jcx-v3wj-wh4m" },
        { name: "React Router same-origin redirect open redirect", severity: "moderate", link: "https://github.com/advisories/GHSA-2j2x-hqr9-3h42" },
      ],
    },
    {
      name: "recharts",
      version: "2.15.4",
      vulnerabilities: [
        { name: "Lodash Prototype Pollution in _.unset and _.omit", severity: "moderate", link: "https://github.com/advisories/GHSA-xxjr-mmjv-4gpg" },
        { name: "lodash Code Injection via _.template", severity: "high", link: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc" },
        { name: "lodash Prototype Pollution via array path bypass", severity: "moderate", link: "https://github.com/advisories/GHSA-f23m-r3pf-42rh" },
      ],
    },
    {
      name: "vite-plugin-pwa",
      version: "1.2.0",
      vulnerabilities: [
        { name: "fast-uri host confusion", severity: "high", link: "https://github.com/advisories/GHSA-v39h-62p7-jpjc" },
        { name: "fast-uri path traversal", severity: "high", link: "https://github.com/advisories/GHSA-q3j6-qgpj-74h6" },
        { name: "ajv ReDoS via $data option", severity: "moderate", link: "https://github.com/advisories/GHSA-2g4f-4pwh-qvx6" },
        { name: "glob CLI Command injection", severity: "high", link: "https://github.com/advisories/GHSA-5j98-mcp5-4vw2" },
        { name: "@babel/plugin-transform-modules-systemjs arbitrary code", severity: "high", link: "https://github.com/advisories/GHSA-fv7c-fp4j-7gwp" },
        { name: "@isaacs/brace-expansion Uncontrolled Resource Consumption", severity: "high", link: "https://github.com/advisories/GHSA-7h2j-956f-4vf2" },
        { name: "Lodash Prototype Pollution", severity: "moderate", link: "https://github.com/advisories/GHSA-xxjr-mmjv-4gpg" },
        { name: "lodash Code Injection", severity: "high", link: "https://github.com/advisories/GHSA-r5fr-rjxr-66jc" },
        { name: "lodash Prototype Pollution array path", severity: "moderate", link: "https://github.com/advisories/GHSA-f23m-r3pf-42rh" },
        { name: "brace-expansion Zero-step sequence DoS", severity: "moderate", link: "https://github.com/advisories/GHSA-f886-m6hf-6m8v" },
        { name: "serialize-javascript CPU Exhaustion DoS", severity: "moderate", link: "https://github.com/advisories/GHSA-qj8w-gfj5-8c6v" },
        { name: "serialize-javascript RCE via RegExp.flags", severity: "high", link: "https://github.com/advisories/GHSA-5c6j-r48x-rmvq" },
        { name: "Rollup Arbitrary File Write Path Traversal", severity: "high", link: "https://github.com/advisories/GHSA-mw96-cpmx-2vgc" },
        { name: "minimatch ReDoS repeated wildcards", severity: "high", link: "https://github.com/advisories/GHSA-3ppc-4f35-3m26" },
        { name: "minimatch matchOne combinatorial backtracking", severity: "high", link: "https://github.com/advisories/GHSA-7r86-cg39-jmmj" },
        { name: "minimatch nested extglobs catastrophic backtracking", severity: "high", link: "https://github.com/advisories/GHSA-23c5-xmqv-rm74" },
        { name: "Picomatch Method Injection POSIX", severity: "moderate", link: "https://github.com/advisories/GHSA-3v7f-55p6-f55p" },
        { name: "Picomatch ReDoS via extglob quantifiers", severity: "high", link: "https://github.com/advisories/GHSA-c2c7-rcm5-vvqj" },
      ],
    },
  ],
};

// Real dep names from package.json minus the 4 vulnerable ones (55 clean).
export const CLEAN_PACKAGES: string[] = [
  "@emailjs/browser",
  "@hookform/resolvers",
  "@radix-ui/react-accordion",
  "@radix-ui/react-alert-dialog",
  "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card",
  "@radix-ui/react-label",
  "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-progress",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-select",
  "@radix-ui/react-separator",
  "@radix-ui/react-slider",
  "@radix-ui/react-slot",
  "@radix-ui/react-switch",
  "@radix-ui/react-tabs",
  "@radix-ui/react-toast",
  "@radix-ui/react-toggle",
  "@radix-ui/react-toggle-group",
  "@radix-ui/react-tooltip",
  "@tanstack/react-query",
  "class-variance-authority",
  "clsx",
  "cmdk",
  "date-fns",
  "embla-carousel-react",
  "html5-qrcode",
  "input-otp",
  "lucide-react",
  "next-themes",
  "qrcode.react",
  "react",
  "react-day-picker",
  "react-dom",
  "react-hook-form",
  "react-resizable-panels",
  "react-youtube",
  "sonner",
  "tailwind-merge",
  "tailwindcss-animate",
  "vaul",
  "zod",
  "zustand",
  "typescript",
  "vite",
  "tailwindcss",
];

export function totals() {
  const totalPackages = CLEAN_PACKAGES.length + scan.dependencies.length;
  const vulnerablePackages = scan.dependencies.length;
  const totalVulns = scan.dependencies.reduce((a, d) => a + d.vulnerabilities.length, 0);
  const high = scan.dependencies.reduce(
    (a, d) => a + d.vulnerabilities.filter((v) => v.severity === "high").length,
    0,
  );
  const moderate = totalVulns - high;
  return { totalPackages, vulnerablePackages, totalVulns, high, moderate };
}

export function perPackageCounts() {
  return scan.dependencies
    .map((d) => ({
      name: d.name,
      count: d.vulnerabilities.length,
      high: d.vulnerabilities.filter((v) => v.severity === "high").length,
    }))
    .sort((a, b) => b.count - a.count);
}

export function securityScore() {
  const t = totals();
  const pct = (CLEAN_PACKAGES.length / t.totalPackages) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const grade = rounded >= 95 ? "A+" : rounded >= 90 ? "A" : rounded >= 80 ? "B" : rounded >= 70 ? "C" : "D";
  return { pct: rounded, grade };
}