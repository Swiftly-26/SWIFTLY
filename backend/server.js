import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || true 
    : 'http://localhost:4200',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Initialize SQLite database
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/database.sqlite' 
  : './database.sqlite';

const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    assignedAgentId TEXT,
    tags TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    requestId TEXT NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (requestId) REFERENCES requests (id) ON DELETE CASCADE
  );
`);

// Insert default agents if none exist
const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
if (agentCount.count === 0) {
  console.log('Adding default agents...');
  const insertAgent = db.prepare('INSERT INTO agents (id, name, role) VALUES (?, ?, ?)');
  insertAgent.run('agent-1', 'John Doe', 'Agent');
  insertAgent.run('agent-2', 'Jane Smith', 'Agent');
  insertAgent.run('agent-3', 'Alice Wong', 'Agent');
  insertAgent.run('agent-4', 'Bob Johnson', 'Agent');
  console.log('Default agents added');
}

// Insert seed data if no requests exist
const requestCount = db.prepare('SELECT COUNT(*) as count FROM requests').get();
if (requestCount.count === 0) {
  console.log('Seeding database with sample requests...');
  
  const insertRequest = db.prepare(`
    INSERT INTO requests (id, title, description, status, priority, dueDate, assignedAgentId, tags, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const nextWeek = new Date(Date.now() + 604800000).toISOString();
  
  insertRequest.run(
    'req-1',
    'Critical: Legacy Database Migration',
    'The production database is running on an unsupported version. We need to migrate all schemas to the new PostgreSQL cluster.',
    'Blocked',
    'Critical',
    yesterday,
    'agent-1',
    JSON.stringify(['Infrastructure', 'Database', 'Urgent']),
    now,
    now
  );
  
  insertRequest.run(
    'req-2',
    'Update Employee Handbook',
    'Revise the remote work policy section in the employee handbook.',
    'Open',
    'Low',
    nextWeek,
    null,
    JSON.stringify(['HR', 'Policy']),
    now,
    now
  );
  
  insertRequest.run(
    'req-3',
    'Security Audit Q3 Preparation',
    'Prepare all necessary documentation for the upcoming SOC2 audit.',
    'In Progress',
    'High',
    tomorrow,
    'agent-2',
    JSON.stringify(['Security', 'Compliance']),
    now,
    now
  );
  
  console.log('Sample requests added');
}

// Insert sample comments if none exist
const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();
if (commentCount.count === 0) {
  console.log('Adding sample comments...');
  
  const insertComment = db.prepare(`
    INSERT INTO comments (id, requestId, author, text, type, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertComment.run(
    uuidv4(),
    'req-1',
    'John Doe',
    'Blocked waiting for the DevOps team to provision the new staging environment credentials.',
    'Status update',
    new Date().toISOString()
  );
  
  console.log('Sample comments added');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// =========================
// REQUESTS ROUTES
// =========================

app.get('/api/requests', (req, res) => {
  try {
    const requests = db.prepare('SELECT * FROM requests ORDER BY createdAt DESC').all();
    requests.forEach(r => {
      if (r.tags) r.tags = JSON.parse(r.tags);
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

app.get('/api/requests/:id', (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
    if (request) {
      if (request.tags) request.tags = JSON.parse(request.tags);
      res.json(request);
    } else {
      res.status(404).json({ error: 'Request not found' });
    }
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

app.post('/api/requests', (req, res) => {
  try {
    const id = uuidv4();
    const { title, description, dueDate, status = 'Open', priority = 'Medium', assignedAgentId, tags } = req.body;
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO requests (id, title, description, status, priority, dueDate, assignedAgentId, tags, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      title,
      description,
      status,
      priority,
      dueDate,
      assignedAgentId || null,
      tags ? JSON.stringify(tags) : null,
      now,
      now
    );
    
    const newRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (newRequest.tags) newRequest.tags = JSON.parse(newRequest.tags);
    
    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

app.put('/api/requests/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const now = new Date().toISOString();
    
    const stmt = db.prepare('UPDATE requests SET status = ?, updatedAt = ? WHERE id = ?');
    const result = stmt.run(status, now, req.params.id);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Request not found' });
    } else {
      const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
      if (request.tags) request.tags = JSON.parse(request.tags);
      res.json(request);
    }
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.put('/api/requests/:id/assign', (req, res) => {
  try {
    const { agentId } = req.body;
    const now = new Date().toISOString();
    
    const stmt = db.prepare('UPDATE requests SET assignedAgentId = ?, updatedAt = ? WHERE id = ?');
    const result = stmt.run(agentId || null, now, req.params.id);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Request not found' });
    } else {
      const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id);
      if (request.tags) request.tags = JSON.parse(request.tags);
      res.json(request);
    }
  } catch (error) {
    console.error('Error assigning agent:', error);
    res.status(500).json({ error: 'Failed to assign agent' });
  }
});

app.delete('/api/requests/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM requests WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Request not found' });
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// =========================
// COMMENTS ROUTES
// =========================

app.get('/api/requests/:id/comments', (req, res) => {
  try {
    const comments = db.prepare(`
      SELECT * FROM comments 
      WHERE requestId = ? 
      ORDER BY createdAt ASC
    `).all(req.params.id);
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/requests/:id/comments', (req, res) => {
  try {
    const id = uuidv4();
    const { author, text, type } = req.body;
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO comments (id, requestId, author, text, type, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, req.params.id, author, text, type, now);
    
    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// =========================
// AGENTS ROUTES
// =========================

app.get('/api/agents', (req, res) => {
  try {
    const agents = db.prepare('SELECT * FROM agents').all();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.post('/api/agents', (req, res) => {
  try {
    const id = 'agent-' + Date.now();
    const { name } = req.body;
    
    const stmt = db.prepare('INSERT INTO agents (id, name, role) VALUES (?, ?, ?)');
    stmt.run(id, name, 'Agent');
    
    const newAgent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
    res.status(201).json(newAgent);
  } catch (error) {
    console.error('Error adding agent:', error);
    res.status(500).json({ error: 'Failed to add agent' });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      res.status(404).json({ error: 'Agent not found' });
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist/frontend/browser');
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Database: ${dbPath}`);
});