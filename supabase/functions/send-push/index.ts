import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

// Web Push requires signing with VAPID keys using ES256 (ECDSA P-256)
async function importVapidKeys() {
  const publicKeyBase64 = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const privateKeyBase64 = Deno.env.get("VAPID_PRIVATE_KEY")!;
  
  // Convert base64url to Uint8Array
  const privateKeyBytes = base64urlToUint8Array(privateKeyBase64);
  
  // Import as ECDSA P-256 private key
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: privateKeyBase64,
      x: publicKeyBase64.substring(1, 44), // Extract x from uncompressed public key
      y: publicKeyBase64.substring(44),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  return privateKey;
}

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
  
  // Import private key for signing
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: vapidPrivateKey,
      // Decode uncompressed public key (65 bytes: 0x04 + 32 bytes x + 32 bytes y)
      x: uint8ArrayToBase64url(base64urlToUint8Array(vapidPublicKey).slice(1, 33)),
      y: uint8ArrayToBase64url(base64urlToUint8Array(vapidPublicKey).slice(33, 65)),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert DER signature to raw r||s format (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // Already raw format from WebCrypto
    rawSig = sigBytes;
  }
  
  const encodedSignature = uint8ArrayToBase64url(rawSig);
  return `${unsignedToken}.${encodedSignature}`;
}

async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const p256dh = base64urlToUint8Array(p256dhBase64);
  const authSecret = base64urlToUint8Array(authBase64);
  
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  // Import client public key
  const clientPubKey = await crypto.subtle.importKey(
    "raw",
    p256dh,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPubKey },
    serverKeys.privateKey,
    256
  );
  
  // Export server public key
  const serverPubKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive encryption key using HKDF
  const sharedSecretKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );
  
  // auth_info = "Content-Encoding: auth\0"
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: authInfo },
    sharedSecretKey,
    256
  );
  
  const prkKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );
  
  // Build context for CEK and nonce
  const keyLabel = new TextEncoder().encode("P-256");
  const context = new Uint8Array([
    ...keyLabel,
    0,
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
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    prkKey,
    128
  );
  
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    prkKey,
    96
  );
  
  // Encrypt with AES-GCM
  const cek = await crypto.subtle.importKey("raw", cekBits, { name: "AES-GCM" }, false, ["encrypt"]);
  
  // Add padding (2 bytes of padding length = 0)
  const paddedPayload = new Uint8Array([0, 0, ...new TextEncoder().encode(payload)]);
  
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(nonceBits) },
      cek,
      paddedPayload
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
      payloadStr,
      sub.p256dh,
      sub.auth
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
      // Subscription expired/invalid — delete it
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      console.log(`Deleted expired subscription: ${sub.endpoint}`);
      return false;
    }
    
    if (!response.ok) {
      console.error(`Push failed (${response.status}):`, await response.text());
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
    const { title, body, type } = await req.json();
    
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

    // Get all push subscriptions
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

    // Send to all subscriptions in parallel
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
