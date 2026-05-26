const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseAdmin(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

// GET /admin/api/stats
const getStats = async (req, res) => {
  try {
    const [eldersRes, guardiansRes, connectionsRes, pendingRes, recentRes] = await Promise.all([
      supabaseAdmin('/profiles?role=eq.elder&select=id', { headers: { Prefer: 'count=exact' } }),
      supabaseAdmin('/profiles?role=eq.guardian&select=id', { headers: { Prefer: 'count=exact' } }),
      supabaseAdmin('/guardian_elder_links?status=eq.connected&select=id', { headers: { Prefer: 'count=exact' } }),
      supabaseAdmin('/guardian_elder_links?status=eq.pending&select=id', { headers: { Prefer: 'count=exact' } }),
      supabaseAdmin(`/profiles?created_at=gte.${new Date(Date.now() - 7 * 86400000).toISOString()}&select=id`, { headers: { Prefer: 'count=exact' } }),
    ]);

    return res.json({
      elders: eldersRes.data?.length ?? 0,
      guardians: guardiansRes.data?.length ?? 0,
      active_connections: connectionsRes.data?.length ?? 0,
      pending_invitations: pendingRes.data?.length ?? 0,
      new_this_week: recentRes.data?.length ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /admin/api/users?role=&search=&page=&limit=
const getUsers = async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let path = `/profiles?select=id,full_name,email,role,country,biological_sex,created_at,is_banned&order=created_at.desc&limit=${limit}&offset=${offset}`;
  if (role) path += `&role=eq.${role}`;

  try {
    const result = await supabaseAdmin(path);
    return res.json({ success: true, users: result.data ?? [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin/api/connections?status=&page=&limit=
const getConnections = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let path = `/guardian_elder_links?select=id,guardian_id,elder_id,elder_email,parent_name,relation,status,created_at&order=created_at.desc&limit=${limit}&offset=${offset}`;
  if (status) path += `&status=eq.${status}`;

  try {
    const linksRes = await supabaseAdmin(path);
    const links = linksRes.data ?? [];

    const enriched = await Promise.all(
      links.map(async (link) => {
        const [gRes, eRes] = await Promise.all([
          supabaseAdmin(`/profiles?id=eq.${link.guardian_id}&select=full_name,email`),
          link.elder_id
            ? supabaseAdmin(`/profiles?id=eq.${link.elder_id}&select=full_name,email`)
            : Promise.resolve({ data: [] }),
        ]);
        return {
          ...link,
          guardian_name: gRes.data?.[0]?.full_name ?? '—',
          guardian_email: gRes.data?.[0]?.email ?? '—',
          elder_name: eRes.data?.[0]?.full_name ?? '—',
        };
      }),
    );

    return res.json({ success: true, connections: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// PATCH /admin/api/users/:id/ban
const banUser = async (req, res) => {
  const { id } = req.params;
  const { banned } = req.body;

  try {
    await supabaseAdmin(`/profiles?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_banned: !!banned }),
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /admin/api/connections/:id
const deleteConnection = async (req, res) => {
  const { id } = req.params;
  try {
    await supabaseAdmin(`/guardian_elder_links?id=eq.${id}`, { method: 'DELETE' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /admin  — serve the HTML dashboard
const serveDashboard = (req, res) => {
  res.send(ADMIN_HTML);
};

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>TinyBit Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F4F5F8;color:#1A3050}
header{background:linear-gradient(135deg,#333372,#36B0E6);color:#fff;padding:18px 28px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 12px rgba(0,0,0,.15)}
header h1{font-size:22px;font-weight:800}header span{font-size:13px;opacity:.8;margin-left:auto}
.container{max-width:1200px;margin:0 auto;padding:24px 20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px}
.stat-card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.stat-card .num{font-size:32px;font-weight:900;margin-bottom:4px}
.stat-card .label{font-size:13px;color:#7A90A4;font-weight:600}
.stat-card.blue .num{color:#333372}.stat-card.teal .num{color:#36B0E6}
.stat-card.green .num{color:#16A34A}.stat-card.amber .num{color:#D97706}
.stat-card.purple .num{color:#7C3AED}
.section{background:#fff;border-radius:16px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.06);margin-bottom:24px}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px}
.section-header h2{font-size:16px;font-weight:800}
.filters{display:flex;gap:10px;flex-wrap:wrap}
.filters select,.filters input{padding:8px 12px;border:1.5px solid #DDE3EC;border-radius:10px;font-size:13px;color:#1A3050;outline:none}
.filters select:focus,.filters input:focus{border-color:#36B0E6}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:10px 12px;color:#7A90A4;font-weight:700;border-bottom:2px solid #F2F4F8;white-space:nowrap}
td{padding:10px 12px;border-bottom:1px solid #F2F4F8;vertical-align:middle}
tr:hover td{background:#F8FAFC}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
.badge.elder{background:#EFF6FF;color:#2563EB}
.badge.guardian{background:#F0FDF4;color:#16A34A}
.badge.connected{background:#F0FDF4;color:#16A34A}
.badge.pending{background:#FEF9C3;color:#CA8A04}
.badge.declined{background:#FEF2F2;color:#DC2626}
.badge.banned{background:#FEF2F2;color:#DC2626}
.btn{padding:6px 14px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;transition:.15s}
.btn-danger{background:#FEF2F2;color:#DC2626}.btn-danger:hover{background:#DC2626;color:#fff}
.btn-success{background:#F0FDF4;color:#16A34A}.btn-success:hover{background:#16A34A;color:#fff}
.btn-sm{padding:4px 10px;font-size:11px}
.pagination{display:flex;gap:8px;align-items:center;margin-top:14px;justify-content:flex-end}
.pagination button{padding:6px 12px;border:1.5px solid #DDE3EC;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;font-weight:600}
.pagination button:disabled{opacity:.4;cursor:not-allowed}
.pagination span{font-size:13px;color:#7A90A4}
.empty{text-align:center;padding:32px;color:#7A90A4;font-size:14px}
#toast{position:fixed;bottom:24px;right:24px;background:#1A3050;color:#fff;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;transition:.3s;pointer-events:none;z-index:9999}
#toast.show{opacity:1}
.refresh-btn{padding:8px 16px;background:#333372;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer}
.refresh-btn:hover{background:#36B0E6}
</style>
</head>
<body>
<header>
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.2)"/><path d="M8 22 L16 10 L24 22" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="17" r="2" fill="white"/></svg>
  <h1>TinyBit Admin</h1>
  <span id="last-updated">Loading...</span>
</header>

<div class="container">
  <!-- Stats -->
  <div class="stats" id="stats">
    <div class="stat-card blue"><div class="num" id="stat-elders">—</div><div class="label">Total Elders</div></div>
    <div class="stat-card green"><div class="num" id="stat-guardians">—</div><div class="label">Total Guardians</div></div>
    <div class="stat-card teal"><div class="num" id="stat-connections">—</div><div class="label">Active Connections</div></div>
    <div class="stat-card amber"><div class="num" id="stat-pending">—</div><div class="label">Pending Invitations</div></div>
    <div class="stat-card purple"><div class="num" id="stat-week">—</div><div class="label">New This Week</div></div>
  </div>

  <!-- Users -->
  <div class="section">
    <div class="section-header">
      <h2>Users</h2>
      <div class="filters">
        <input id="user-search" type="text" placeholder="Search name or email..." oninput="debounceLoadUsers()"/>
        <select id="user-role-filter" onchange="loadUsers(1)">
          <option value="">All Roles</option>
          <option value="elder">Elder</option>
          <option value="guardian">Guardian</option>
        </select>
        <button class="refresh-btn" onclick="loadUsers(1)">Refresh</button>
      </div>
    </div>
    <table>
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Country</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
      <tbody id="users-tbody"><tr><td colspan="7" class="empty">Loading...</td></tr></tbody>
    </table>
    <div class="pagination">
      <button id="users-prev" onclick="loadUsers(userPage-1)" disabled>← Prev</button>
      <span id="users-page-info"></span>
      <button id="users-next" onclick="loadUsers(userPage+1)" disabled>Next →</button>
    </div>
  </div>

  <!-- Connections -->
  <div class="section">
    <div class="section-header">
      <h2>Guardian–Elder Connections</h2>
      <div class="filters">
        <select id="conn-status-filter" onchange="loadConnections(1)">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="connected">Connected</option>
          <option value="declined">Declined</option>
        </select>
        <button class="refresh-btn" onclick="loadConnections(1)">Refresh</button>
      </div>
    </div>
    <table>
      <thead><tr><th>Guardian</th><th>Guardian Email</th><th>Parent Name</th><th>Elder</th><th>Elder Email</th><th>Relation</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody id="conn-tbody"><tr><td colspan="9" class="empty">Loading...</td></tr></tbody>
    </table>
    <div class="pagination">
      <button id="conn-prev" onclick="loadConnections(connPage-1)" disabled>← Prev</button>
      <span id="conn-page-info"></span>
      <button id="conn-next" onclick="loadConnections(connPage+1)" disabled>Next →</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
const BASE = '/admin/api';
let userPage = 1, connPage = 1;
let debounceTimer;

function toast(msg, ok = true) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = ok ? '#1A3050' : '#DC2626';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' });
}

async function loadStats() {
  try {
    const r = await fetch(BASE + '/stats');
    const d = await r.json();
    document.getElementById('stat-elders').textContent = d.elders ?? '—';
    document.getElementById('stat-guardians').textContent = d.guardians ?? '—';
    document.getElementById('stat-connections').textContent = d.active_connections ?? '—';
    document.getElementById('stat-pending').textContent = d.pending_invitations ?? '—';
    document.getElementById('stat-week').textContent = d.new_this_week ?? '—';
    document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch(e) { toast('Stats load failed', false); }
}

async function loadUsers(page = 1) {
  userPage = page;
  const role = document.getElementById('user-role-filter').value;
  const search = document.getElementById('user-search').value;
  const params = new URLSearchParams({ page, limit: 20 });
  if (role) params.set('role', role);
  if (search) params.set('search', search);
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="empty">Loading...</td></tr>';
  try {
    const r = await fetch(BASE + '/users?' + params);
    const d = await r.json();
    const users = d.users ?? [];
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No users found</td></tr>'; return; }
    tbody.innerHTML = users.map(u => \`
      <tr>
        <td><b>\${u.full_name || '—'}</b></td>
        <td>\${u.email || '—'}</td>
        <td><span class="badge \${u.role}">\${u.role || '—'}</span></td>
        <td>\${u.country || '—'}</td>
        <td>\${fmt(u.created_at)}</td>
        <td>\${u.is_banned ? '<span class="badge banned">Banned</span>' : '<span style="color:#16A34A;font-weight:700">Active</span>'}</td>
        <td>
          \${u.is_banned
            ? \`<button class="btn btn-success btn-sm" onclick="toggleBan('\${u.id}',false)">Unban</button>\`
            : \`<button class="btn btn-danger btn-sm" onclick="toggleBan('\${u.id}',true)">Ban</button>\`
          }
        </td>
      </tr>\`).join('');
    document.getElementById('users-prev').disabled = page <= 1;
    document.getElementById('users-next').disabled = users.length < 20;
    document.getElementById('users-page-info').textContent = 'Page ' + page;
  } catch(e) { toast('Users load failed', false); }
}

async function loadConnections(page = 1) {
  connPage = page;
  const status = document.getElementById('conn-status-filter').value;
  const params = new URLSearchParams({ page, limit: 20 });
  if (status) params.set('status', status);
  const tbody = document.getElementById('conn-tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="empty">Loading...</td></tr>';
  try {
    const r = await fetch(BASE + '/connections?' + params);
    const d = await r.json();
    const conns = d.connections ?? [];
    if (!conns.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty">No connections found</td></tr>'; return; }
    tbody.innerHTML = conns.map(c => \`
      <tr>
        <td><b>\${c.guardian_name}</b></td>
        <td>\${c.guardian_email}</td>
        <td>\${c.parent_name}</td>
        <td>\${c.elder_name}</td>
        <td>\${c.elder_email}</td>
        <td>\${c.relation}</td>
        <td><span class="badge \${c.status}">\${c.status}</span></td>
        <td>\${fmt(c.created_at)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="removeConnection('\${c.id}')">Remove</button></td>
      </tr>\`).join('');
    document.getElementById('conn-prev').disabled = page <= 1;
    document.getElementById('conn-next').disabled = conns.length < 20;
    document.getElementById('conn-page-info').textContent = 'Page ' + page;
  } catch(e) { toast('Connections load failed', false); }
}

async function toggleBan(id, ban) {
  if (!confirm(ban ? 'Ban this user?' : 'Unban this user?')) return;
  try {
    const r = await fetch(\`\${BASE}/users/\${id}/ban\`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ banned: ban }),
    });
    if (r.ok) { toast(ban ? 'User banned' : 'User unbanned'); loadUsers(userPage); loadStats(); }
    else toast('Action failed', false);
  } catch(e) { toast('Error', false); }
}

async function removeConnection(id) {
  if (!confirm('Remove this connection permanently?')) return;
  try {
    const r = await fetch(\`\${BASE}/connections/\${id}\`, { method: 'DELETE' });
    if (r.ok) { toast('Connection removed'); loadConnections(connPage); loadStats(); }
    else toast('Remove failed', false);
  } catch(e) { toast('Error', false); }
}

function debounceLoadUsers() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadUsers(1), 400);
}

loadStats();
loadUsers(1);
loadConnections(1);
</script>
</body>
</html>`;

module.exports = { serveDashboard, getStats, getUsers, getConnections, banUser, deleteConnection };
