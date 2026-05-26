To use isPro anywhere in the app: (services/plan.ts — defines all 3 plans (Free / Sathi Basic / Sathi Pro) with features, pricing, and helpers:)

const { plan } = useAuth();
if (!isPro(plan)) {
  // show upgrade prompt
}




3. usesCleartextTraffic: true in app.json
HTTP (not HTTPS) is allowed. If your backend at 192.168.x.x:5000 is local dev only, it's acceptable now, but before production you must switch to HTTPS and remove this flag.

Claude API key: stored in server/.env as ANTHROPIC_API_KEY (never commit keys to this file)

/v1/organizations/api_keys/{api_key_id}
