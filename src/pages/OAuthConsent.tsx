import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SupabaseAuth = typeof supabase.auth & {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
    approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
    denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  };
};
const authOauth = () => (supabase.auth as SupabaseAuth).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Mungon authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/manager-login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await authOauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await authOauth().approveAuthorization(authorizationId)
      : await authOauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("Serveri OAuth nuk ktheu redirect.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6">
          <h1 className="text-xl font-bold mb-2">Nuk mund të hapim këtë autorizim</h1>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
        <p>Duke ngarkuar…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "një aplikacion i jashtëm";
  const redirectUri = details.client?.redirect_uris?.[0] ?? details.client?.redirect_uri ?? "";

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full rounded-2xl border border-amber-500/30 bg-slate-900 p-8 shadow-2xl">
        <h1 className="text-2xl font-bold mb-2">Lidh {clientName} me llogarinë tënde</h1>
        <p className="text-sm text-slate-300 mb-4">
          {clientName} do të përdorë Boulevard Café si ti — vetëm veglat e aktivizuara, gjatë sesionit tënd.
        </p>
        {redirectUri && (
          <p className="text-xs text-slate-500 mb-6 break-all">
            Do të kthehesh te: {redirectUri}
          </p>
        )}
        <p className="text-xs text-slate-400 mb-6">
          Ky autorizim nuk kalon rregullat e sigurisë (RLS) të aplikacionit.
        </p>
        <div className="flex gap-3">
          <button type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold disabled:opacity-50"
          >
            Aprovo
          </button>
          <button type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium disabled:opacity-50"
          >
            Anulo
          </button>
        </div>
      </div>
    </main>
  );
}