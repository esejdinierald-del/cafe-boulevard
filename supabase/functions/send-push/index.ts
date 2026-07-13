import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireShiftToken } from "../_shared/verify-shift-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shift-token",
};

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJWT(audience: string): Promise<string> {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:menuonline483@gmail.com",
  };

  const encodedHeader = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Decode the uncompressed public key (65 bytes: 0x04 + 32x + 32y)
  const pubKeyBytes = base64urlToUint8Array(vapidPublicKey);
  const x = uint8ArrayToBase64url(pubKeyBytes.slice(1, 33));
  const y = uint8ArrayToBase64url(pubKeyBytes.slice(33, 65));

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: vapidPrivateKey, x, y },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      new TextEncoder().encode(unsignedToken)
    )
  );

  return `${unsignedToken}.${uint8ArrayToBase64url(signature)}`;
}

async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const p256dh = base64urlToUint8Array(p256dhBase64);
  const authSecret = base64urlToUint8Array(authBase64);

  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const clientPubKey = await crypto.subtle.importKey(
    "raw", p256dh, { name: "ECDH", namedCurve: "P-256" }, false, []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPubKey },
    serverKeys.privateKey,
    256
  );

  const serverPubKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const sharedSecretKey = await crypto.subtle.importKey(
    "raw", sharedSecret, { name: "HKDF" }, false, ["deriveBits"]
  );

  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: authInfo },
    sharedSecretKey, 256
  );

  const prkKey = await crypto.subtle.importKey(
    "raw", prk, { name: "HKDF" }, false, ["deriveBits"]
  );

  const keyLabel = new TextEncoder().encode("P-256");
  const context = new Uint8Array([
    ...keyLabel, 0,
    0, p256dh.length, ...p256dh,
    0, serverPubKeyRaw.length, ...serverPubKeyRaw,
  ]);

  const cekInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: aesgcm\0"),
    ...context,
  ]);
  const nonceInfo = new Uint8Array([
    ...new TextEncoder().encode("Content-Encoding: nonce\0"),
    ...context,
  ]);

  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, prkKey, 128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, prkKey, 96
  );

  const cek = await crypto.subtle.importKey(
    "raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]
  );

  const paddedPayload = new Uint8Array([0, 0, ...new TextEncoder().encode(payload)]);

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(nonceBits) },
      cek, paddedPayload
    )
  );

  return { encrypted, salt, serverPublicKey: serverPubKeyRaw };
}

async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object
): Promise<boolean> {
  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const payloadStr = JSON.stringify(payload);

    const endpointUrl = new URL(sub.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const jwt = await createJWT(audience);
    const { encrypted, salt, serverPublicKey } = await encryptPayload(
      payloadStr, sub.p256dh, sub.auth
    );

    const response = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Encoding": "aesgcm",
        "Content-Type": "application/octet-stream",
        "Encryption": `salt=${uint8ArrayToBase64url(salt)}`,
        "Crypto-Key": `dh=${uint8ArrayToBase64url(serverPublicKey)}; p256ecdsa=${vapidPublicKey}`,
        "TTL": "86400",
        "Urgency": "high",
      },
      body: encrypted,
    });

    if (response.status === 410 || response.status === 404) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      console.log(`Deleted expired subscription: ${sub.endpoint}`);
      return false;
    }

    if (!response.ok) {
      const text = await response.text();
      console.error(`Push failed (${response.status}):`, text);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Push send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const parsedBody = await req.json();
    const auth = await requireShiftToken(req, parsedBody);
    if (!auth.ok) return auth.response;
    const { title, body, type } = parsedBody ?? {};

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing title or body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error) {
      console.error("DB error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushToSubscription(sub, { title, body, type: type || "service" })
      )
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value === true
    ).length;

    console.log(`Push sent to ${sent}/${subscriptions.length} subscriptions`);

    return new Response(
      JSON.stringify({ success: true, sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
