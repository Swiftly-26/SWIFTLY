import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';
import Database from 'better-sqlite3';

const app = express();
const port = 3000;

app.use(cors({
  origin: ['http://localhost:4200', 'http://localhost:4000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(helmet());

const db = new Database('./database.sqlite');
db.pragma('journal_mode = WAL');

// ── CREATE TABLES ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    status          TEXT NOT NULL,
    priority        TEXT NOT NULL,
    dueDate         TEXT NOT NULL,
    assignedAgentId TEXT,
    tags            TEXT,
    createdAt       TEXT NOT NULL,
    updatedAt       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id        TEXT PRIMARY KEY,
    requestId TEXT NOT NULL,
    author    TEXT NOT NULL,
    text      TEXT NOT NULL,
    type      TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (requestId) REFERENCES requests (id) ON DELETE CASCADE
  );
`);

// ── SEED AGENTS ──────────────────────────────────────────────────────────────

const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
if (agentCount.count === 0) {
  const ins = db.prepare('INSERT INTO agents (id, name, role) VALUES (?, ?, ?)');
  ins.run('agent-1', 'John Doe',     'Agent');
  ins.run('agent-2', 'Jane Smith',   'Agent');
  ins.run('agent-3', 'Alex Johnson', 'Agent');
  ins.run('agent-4', 'Sarah Lee',    'Agent');
  console.log('Default agents seeded.');
}

// ── SEED REQUESTS ────────────────────────────────────────────────────────────

const requestCount = db.prepare('SELECT COUNT(*) as count FROM requests').get();
if (requestCount.count === 0) {
  const ins = db.prepare(`
    INSERT INTO requests
      (id, title, description, status, priority, dueDate, assignedAgentId, tags, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now        = new Date().toISOString();
  const tomorrow   = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek   = new Date(Date.now() + 604800000).toISOString().split('T')[0];
  const lastWeek   = new Date(Date.now() - 604800000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];
  const in3Days    = new Date(Date.now() + 259200000).toISOString().split('T')[0];
  const in2Weeks   = new Date(Date.now() + 1209600000).toISOString().split('T')[0];

  const rows = [
    ['req-1',  'Fix login page error',
               'Users are getting 500 errors when logging in with Google OAuth. Error occurs after redirect.',
               'Open',        'High',     tomorrow,   'agent-1', JSON.stringify(['bug','authentication','urgent'])],
    ['req-2',  'Update dashboard charts',
               'Replace old chart library with Chart.js v4 for better performance. All admin charts need updating.',
               'In Progress', 'Medium',   nextWeek,   'agent-2', JSON.stringify(['enhancement','ui','performance'])],
    ['req-3',  'Database migration',
               'Migrate from SQLite to PostgreSQL for scalability. Blocked waiting for DBA approval.',
               'Blocked',     'Critical', nextWeek,   'agent-1', JSON.stringify(['database','infrastructure','blocked'])],
    ['req-4',  'Fix password reset flow',
               'Password reset emails are not being sent. Users cannot reset their passwords.',
               'Done',        'High',     lastWeek,   'agent-2', JSON.stringify(['bug','email','security'])],
    ['req-5',  'Apply critical security patch',
               'Zero-day vulnerability on production servers. Patch is being tested in staging.',
               'In Progress', 'Critical', twoDaysAgo, 'agent-1', JSON.stringify(['security','urgent','production'])],
    ['req-6',  'Update API documentation',
               'API docs need updating with new endpoints added in the last two sprints.',
               'Open',        'Low',      nextWeek,   null,      JSON.stringify(['documentation','api'])],
    ['req-7',  'Implement user registration flow',
               'Add email verification and CAPTCHA to registration to prevent spam accounts.',
               'Open',        'Medium',   in3Days,    'agent-3', JSON.stringify(['feature','security','user-management'])],
    ['req-8',  'Optimize API response times',
               'Several endpoints are slow under load. Need caching layer and query optimisation.',
               'In Progress', 'High',     tomorrow,   'agent-4', JSON.stringify(['performance','api','optimisation'])],
    ['req-9',  'Integrate payment gateway',
               'Blocked waiting for API keys from the payment provider. Contracts are signed.',
               'Blocked',     'Medium',   in2Weeks,   null,      JSON.stringify(['integration','payments','blocked'])],
    ['req-10', 'Fix mobile responsiveness',
               'Multiple UI components are not displaying correctly on mobile screen sizes.',
               'Done',        'Low',      lastWeek,   'agent-3', JSON.stringify(['bug','ui','mobile'])],
  ];

  for (const r of rows) {
    ins.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], now, now);
  }
  console.log('Sample requests seeded.');
}

// ── SEED COMMENTS ────────────────────────────────────────────────────────────

const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();
if (commentCount.count === 0) {
  const ins = db.prepare(
    'INSERT INTO comments (id, requestId, author, text, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const now         = new Date().toISOString();
  const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
  const oneHourAgo  = new Date(Date.now() - 3600000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
  const yesterday   = new Date(Date.now() - 86400000).toISOString();

  const rows = [
    [uuidv4(), 'req-1',  'John Doe',    'Checking the OAuth callback URL now.',                                 'Status update',    fiveMinsAgo],
    [uuidv4(), 'req-1',  'System Admin','Priority escalated to High due to user impact.',                      'System-generated', oneHourAgo],
    [uuidv4(), 'req-1',  'Jane Smith',  'The redirect URI does not match the one registered in the OAuth app.','General',          twoHoursAgo],
    [uuidv4(), 'req-2',  'Jane Smith',  'Started work. New library will be Chart.js v4.',                      'Status update',    fiveMinsAgo],
    [uuidv4(), 'req-3',  'John Doe',    'Still waiting for DBA team to review the migration plan.',            'Status update',    yesterday],
    [uuidv4(), 'req-4',  'Jane Smith',  'Fixed the SMTP configuration. Emails are now sending correctly.',    'Status update',    yesterday],
    [uuidv4(), 'req-4',  'System Admin','Request marked as Done.',                                             'System-generated', yesterday],
    [uuidv4(), 'req-5',  'John Doe',    'Patch is being tested in staging. ETA end of day.',                  'Status update',    oneHourAgo],
    [uuidv4(), 'req-5',  'System Admin','This request is now overdue.',                                        'System-generated', now],
    [uuidv4(), 'req-6',  'System Admin','Request created, awaiting assignment.',                               'System-generated', now],
    [uuidv4(), 'req-7',  'Alex Johnson','Planning to start implementation tomorrow.',                          'Status update',    fiveMinsAgo],
    [uuidv4(), 'req-8',  'Sarah Lee',   'Identified slow queries. Adding indexes now.',                        'Status update',    oneHourAgo],
    [uuidv4(), 'req-8',  'John Doe',    'Happy to assist with the caching layer if needed.',                   'General',          twoHoursAgo],
    [uuidv4(), 'req-9',  'System Admin','Blocked, waiting on API keys from payment provider.',                 'System-generated', yesterday],
    [uuidv4(), 'req-10', 'Alex Johnson','Tested on iOS, Android and various screen sizes. Fixes applied.',    'Status update',    yesterday],
    [uuidv4(), 'req-10', 'System Admin','Request completed successfully.',                                     'System-generated', yesterday],
  ];

  for (const r of rows) ins.run(...r);
  console.log('Sample comments seeded.');
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

const parseTags = (r) => {
  if (r?.tags) {
    try { r.tags = JSON.parse(r.tags); } catch { r.tags = []; }
  }
  return r;
};


// ── HEALTH ───────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'connected',
      stats: {
        requests: db.prepare('SELECT COUNT(*) as count FROM requests').get().count,
        agents:   db.prepare('SELECT COUNT(*) as count FROM agents').get().count,
        comments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count,
      }
    });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// ── REQUESTS — fixed paths first ─────────────────────────────────────────────

// 1. List all requests
app.get('/api/requests', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM requests ORDER BY updatedAt DESC').all();
    res.json(rows.map(parseTags));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// 2. Create request
app.post('/api/requests', (req, res) => {
  try {
    const id  = uuidv4();
    const now = new Date().toISOString();
    const { title, description, dueDate, status = 'Open', priority = 'Medium', assignedAgentId, tags } = req.body;

    db.prepare(`
      INSERT INTO requests
        (id, title, description, status, priority, dueDate, assignedAgentId, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, status, priority, dueDate,
           assignedAgentId || null,
           tags ? JSON.stringify(tags) : null,
           now, now);

    res.status(201).json(parseTags(db.prepare('SELECT * FROM requests WHERE id = ?').get(id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// 3 & 4. Escalation check — FIXED PATH, must be registered BEFORE /:id
const escalationHandler = (req, res) => {
  try {
    const requests  = db.prepare("SELECT * FROM requests WHERE status != 'Done'").all();
    const escalated = [];
    const now       = new Date();

    for (const r of requests) {
      const daysOverdue = (now.getTime() - new Date(r.dueDate).getTime()) / 86400000;
      if (daysOverdue > 3 && r.priority !== 'Critical') {
        db.prepare('UPDATE requests SET priority = ?, updatedAt = ? WHERE id = ?')
          .run('Critical', now.toISOString(), r.id);

        db.prepare('INSERT INTO comments (id, requestId, author, text, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), r.id, 'System',
               `Priority automatically escalated to Critical (${Math.floor(daysOverdue)} days overdue).`,
               'System-generated', now.toISOString());

        escalated.push(r.id);
      }
    }

    res.json({ escalated, count: escalated.length, timestamp: now.toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check escalations' });
  }
};

app.get('/api/requests/check-escalations', escalationHandler);
app.post('/api/requests/check-escalations', escalationHandler);

// ── REQUESTS — parameterised paths after all fixed paths ─────────────────────

// 5. Get single request
app.get('/api/requests/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(parseTags(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// 6. Update status
app.put('/api/requests/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const now    = new Date().toISOString();
    const result = db.prepare('UPDATE requests SET status = ?, updatedAt = ? WHERE id = ?')
                     .run(status, now, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(parseTags(db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 7. Assign agent
app.put('/api/requests/:id/assign', (req, res) => {
  try {
    const { agentId } = req.body;
    const now    = new Date().toISOString();
    const result = db.prepare('UPDATE requests SET assignedAgentId = ?, updatedAt = ? WHERE id = ?')
                     .run(agentId || null, now, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(parseTags(db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign agent' });
  }
});

// 8. Delete request
app.delete('/api/requests/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Request not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// 9. Get comments for a request
app.get('/api/requests/:id/comments', (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT * FROM comments WHERE requestId = ? ORDER BY createdAt ASC'
    ).all(req.params.id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// 10. Add comment
app.post('/api/requests/:id/comments', (req, res) => {
  try {
    const id  = uuidv4();
    const now = new Date().toISOString();
    const { author, text, type } = req.body;
    db.prepare(
      'INSERT INTO comments (id, requestId, author, text, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, req.params.id, author, text, type, now);
    res.status(201).json(db.prepare('SELECT * FROM comments WHERE id = ?').get(id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ── AGENTS ───────────────────────────────────────────────────────────────────

app.get('/api/agents', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM agents ORDER BY name ASC').all());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.post('/api/agents', (req, res) => {
  try {
    const id = 'agent-' + Date.now();
    db.prepare('INSERT INTO agents (id, name, role) VALUES (?, ?, ?)').run(id, req.body.name, 'Agent');
    res.status(201).json(db.prepare('SELECT * FROM agents WHERE id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to add agent' });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Agent not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  const s = {
    requests: db.prepare('SELECT COUNT(*) as count FROM requests').get().count,
    agents:   db.prepare('SELECT COUNT(*) as count FROM agents').get().count,
    comments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count,
  };
  console.log('\n' + '='.repeat(50));
  console.log(`Backend running at http://localhost:${port}`);
  console.log('='.repeat(50));
  console.log(`Requests: ${s.requests}  Agents: ${s.agents}  Comments: ${s.comments}`);
  console.log('='.repeat(50));
  console.log('Endpoints:');
  console.log('  GET    /api/health');
  console.log('  GET    /api/requests');
  console.log('  POST   /api/requests');
  console.log('  GET    /api/requests/check-escalations');
  console.log('  POST   /api/requests/check-escalations');
  console.log('  GET    /api/requests/:id');
  console.log('  PUT    /api/requests/:id/status');
  console.log('  PUT    /api/requests/:id/assign');
  console.log('  DELETE /api/requests/:id');
  console.log('  GET    /api/requests/:id/comments');
  console.log('  POST   /api/requests/:id/comments');
  console.log('  GET    /api/agents');
  console.log('  POST   /api/agents');
  console.log('  DELETE /api/agents/:id');
  console.log('='.repeat(50));
});