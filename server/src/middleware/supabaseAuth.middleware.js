const jwt = require('jsonwebtoken');

const JWKS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const jwksCacheByIssuer = new Map(); // issuer -> { fetchedAt: number, certByKid: Map<string, string> }

function isAllowedSupabaseIssuer(issuer) {
  const configuredIssuer = process.env.SUPABASE_AUTH_ISSUER;
  if (configuredIssuer) return issuer === configuredIssuer;

  try {
    const url = new URL(issuer);
    if (url.protocol !== 'https:') return false;
    if (!/^[a-z0-9]+\.supabase\.co$/i.test(url.host)) return false;
    return url.pathname === '/auth/v1';
  } catch {
    return false;
  }
}

async function fetchCertForKid(issuer, kid) {
  const cached = jwksCacheByIssuer.get(issuer);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS && cached.certByKid.has(kid)) {
    return cached.certByKid.get(kid);
  }

  if (typeof fetch !== 'function') {
    throw new Error('global fetch is not available in this Node runtime');
  }

  let response;
  try {
    response = await fetch(`${issuer}/keys`, { method: 'GET', signal: AbortSignal.timeout(8_000) });
  } catch (err) {
    const e = new Error('Failed to fetch Supabase JWKS');
    e.cause = err;
    throw e;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch Supabase JWKS: ${response.status}`);
  }

  const jwks = await response.json();
  const keys = Array.isArray(jwks?.keys) ? jwks.keys : [];

  const certByKid = new Map();
  for (const key of keys) {
    if (!key?.kid) continue;
    const x5c = Array.isArray(key?.x5c) ? key.x5c : [];
    if (!x5c[0]) continue;
    const pem = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----\n`;
    certByKid.set(key.kid, pem);
  }

  jwksCacheByIssuer.set(issuer, { fetchedAt: Date.now(), certByKid });

  return certByKid.get(kid);
}

async function verifySupabaseJwt(token) {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.header?.kid;
  const alg = decoded?.header?.alg;
  const issuer = decoded?.payload?.iss;

  if (!kid || alg !== 'RS256' || typeof issuer !== 'string') {
    throw new Error('Token is not a supported Supabase access token');
  }

  if (!isAllowedSupabaseIssuer(issuer)) {
    throw new Error('Token issuer is not allowed');
  }

  const cert = await fetchCertForKid(issuer, kid);
  if (!cert) {
    throw new Error('No matching JWKS key found for token');
  }

  return jwt.verify(token, cert, {
    algorithms: ['RS256'],
    issuer,
    // Supabase access tokens typically use aud=authenticated.
    // If the token uses a different aud, don't hard-fail here.
    ignoreExpiration: false,
  });
}

const requireSupabaseAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }

  try {
    const payload = await verifySupabaseJwt(token);
    req.supabase = {
      userId: payload?.sub,
      email: payload?.email,
      raw: payload,
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

module.exports = { requireSupabaseAuth };
