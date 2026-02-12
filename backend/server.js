// backend/server.js
import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import helmet from 'helmet';
import Database from 'better-sqlite3';

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());

// Initialize SQLite database
const db = new Database('./database.sqlite');

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
  console.log('👤 Adding default agents...');
  const insertAgent = db.prepare('INSERT INTO agents (id, name, role) VALUES (?, ?, ?)');
  insertAgent.run('agent-1', 'John Doe', 'Agent');
  insertAgent.run('agent-2', 'Jane Smith', 'Agent');
  insertAgent.run('agent-3', 'Alex Johnson', 'Agent');
  insertAgent.run('agent-4', 'Sarah Lee', 'Agent');
  console.log('✅ Default agents added');
}

// =========================
// 🌱 SEED DATABASE WITH SAMPLE DATA
// =========================

// Insert seed data if no requests exist
const requestCount = db.prepare('SELECT COUNT(*) as count FROM requests').get();
if (requestCount.count === 0) {
  console.log('🌱 Seeding database with sample requests...');
  
  const insertRequest = db.prepare(`
    INSERT INTO requests (id, title, description, status, priority, dueDate, assignedAgentId, tags, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 604800000).toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 604800000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];
  const inThreeDays = new Date(Date.now() + 259200000).toISOString().split('T')[0];
  const inTwoWeeks = new Date(Date.now() + 1209600000).toISOString().split('T')[0];
  
  // Sample request 1 - Open, assigned to John
  insertRequest.run(
    'req-1',
    'Fix login page error',
    'Users are getting 500 error when trying to log in with Google OAuth. The error occurs after redirect from Google.',
    'Open',
    'High',
    tomorrow,
    'agent-1',
    JSON.stringify(['bug', 'authentication', 'urgent']),
    now,
    now
  );
  
  // Sample request 2 - In Progress, assigned to Jane
  insertRequest.run(
    'req-2',
    'Update dashboard charts',
    'Replace old chart library with new one for better performance. Need to update all charts on admin dashboard.',
    'In Progress',
    'Medium',
    nextWeek,
    'agent-2',
    JSON.stringify(['enhancement', 'ui', 'performance']),
    now,
    now
  );
  
  // Sample request 3 - Blocked, assigned to John
  insertRequest.run(
    'req-3',
    'Database migration',
    'Need to migrate from SQLite to PostgreSQL for better scalability. Blocked waiting for DBA approval.',
    'Blocked',
    'Critical',
    nextWeek,
    'agent-1',
    JSON.stringify(['database', 'infrastructure', 'blocked']),
    now,
    now
  );
  
  // Sample request 4 - Done, assigned to Jane
  insertRequest.run(
    'req-4',
    'Fix password reset',
    'Password reset emails not being sent. Users cannot reset their passwords.',
    'Done',
    'High',
    lastWeek,
    'agent-2',
    JSON.stringify(['bug', 'email', 'security']),
    now,
    now
  );
  
  // Sample request 5 - Overdue, assigned to John
  insertRequest.run(
    'req-5',
    'Security patch',
    'Apply critical security patch to production servers. This is a zero-day vulnerability.',
    'In Progress',
    'Critical',
    twoDaysAgo,
    'agent-1',
    JSON.stringify(['security', 'urgent', 'production', 'overdue']),
    now,
    now
  );
  
  // Sample request 6 - Unassigned Open request
  insertRequest.run(
    'req-6',
    'Update documentation',
    'API documentation needs to be updated with new endpoints',
    'Open',
    'Low',
    nextWeek,
    null,
    JSON.stringify(['documentation', 'api']),
    now,
    now
  );

  // Additional sample request 7 - Open, assigned to Alex
  insertRequest.run(
    'req-7',
    'Implement new user registration flow',
    'Add email verification and captcha to the registration process to prevent spam.',
    'Open',
    'Medium',
    inThreeDays,
    'agent-3',
    JSON.stringify(['feature', 'security', 'user-management']),
    now,
    now
  );

  // Additional sample request 8 - In Progress, assigned to Sarah
  insertRequest.run(
    'req-8',
    'Optimize API response times',
    'API endpoints are slow under load; need to add caching and optimize queries.',
    'In Progress',
    'High',
    tomorrow,
    'agent-4',
    JSON.stringify(['performance', 'api', 'optimization']),
    now,
    now
  );

  // Additional sample request 9 - Blocked, unassigned
  insertRequest.run(
    'req-9',
    'Integrate third-party payment gateway',
    'Waiting for API keys from the payment provider.',
    'Blocked',
    'Medium',
    inTwoWeeks,
    null,
    JSON.stringify(['integration', 'payments', 'blocked']),
    now,
    now
  );

  // Additional sample request 10 - Done, assigned to Alex
  insertRequest.run(
    'req-10',
    'Fix mobile responsiveness issues',
    'UI elements are not displaying correctly on mobile devices.',
    'Done',
    'Low',
    lastWeek,
    'agent-3',
    JSON.stringify(['bug', 'ui', 'mobile']),
    now,
    now
  );
  
  console.log('✅ Sample requests added to database');
}

// Insert sample comments if none exist
const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get();
if (commentCount.count === 0) {
  console.log('💬 Adding sample comments...');
  
  const insertComment = db.prepare(`
    INSERT INTO comments (id, requestId, author, text, type, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 600000).toISOString();
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 259200000).toISOString();
  
  // Comments for request 1
  insertComment.run(
    uuidv4(),
    'req-1',
    'John Doe',
    'I\'ll look into this today. Checking the OAuth callback URL.',
    'Status update',
    fiveMinutesAgo
  );
  
  insertComment.run(
    uuidv4(),
    'req-1',
    'System Admin',
    'Priority escalated to High due to user impact',
    'System-generated',
    oneHourAgo
  );
  
  insertComment.run(
    uuidv4(),
    'req-1',
    'Jane Smith',
    'I think I found the issue. The redirect URI doesn\'t match.',
    'General',
    twoHoursAgo
  );
  
  // Comments for request 2
  insertComment.run(
    uuidv4(),
    'req-2',
    'Jane Smith',
    'Started working on this. New library is Chart.js v4.',
    'Status update',
    tenMinutesAgo
  );
  
  // Comments for request 3
  insertComment.run(
    uuidv4(),
    'req-3',
    'John Doe',
    'Still waiting for DBA team to review the migration plan.',
    'Status update',
    yesterday
  );
  
  // Comments for request 4
  insertComment.run(
    uuidv4(),
    'req-4',
    'Jane Smith',
    'Fixed the SMTP configuration. Emails are now sending.',
    'Status update',
    yesterday
  );
  
  insertComment.run(
    uuidv4(),
    'req-4',
    'System Admin',
    'Request marked as Done',
    'System-generated',
    yesterday
  );
  
  // Comments for request 5 (overdue)
  insertComment.run(
    uuidv4(),
    'req-5',
    'John Doe',
    'Working on this now. Patch is being tested in staging.',
    'Status update',
    oneHourAgo
  );
  
  insertComment.run(
    uuidv4(),
    'req-5',
    'System Admin',
    '⚠️ This request is now overdue by 2 days',
    'System-generated',
    now
  );
  
  // Comments for request 6
  insertComment.run(
    uuidv4(),
    'req-6',
    'System Admin',
    'Request created - awaiting assignment',
    'System-generated',
    now
  );

  // Additional comments for request 7
  insertComment.run(
    uuidv4(),
    'req-7',
    'Alex Johnson',
    'Planning to start implementation tomorrow.',
    'Status update',
    fiveMinutesAgo
  );

  insertComment.run(
    uuidv4(),
    'req-7',
    'System Admin',
    'New feature request logged',
    'System-generated',
    tenMinutesAgo
  );

  // Additional comments for request 8
  insertComment.run(
    uuidv4(),
    'req-8',
    'Sarah Lee',
    'Identified slow queries; adding indexes.',
    'Status update',
    oneHourAgo
  );

  insertComment.run(
    uuidv4(),
    'req-8',
    'John Doe',
    'Can assist if needed on caching layer.',
    'General',
    twoHoursAgo
  );

  // Additional comments for request 9
  insertComment.run(
    uuidv4(),
    'req-9',
    'System Admin',
    'Blocked due to pending API keys',
    'System-generated',
    yesterday
  );

  // Additional comments for request 10
  insertComment.run(
    uuidv4(),
    'req-10',
    'Alex Johnson',
    'Tested on multiple devices; fixes applied.',
    'Status update',
    threeDaysAgo
  );

  insertComment.run(
    uuidv4(),
    'req-10',
    'System Admin',
    'Request completed successfully',
    'System-generated',
    threeDaysAgo
  );
  
  console.log('✅ Sample comments added to database');
}

// =========================
// 🔍 HEALTH CHECK ROUTE
// =========================

app.get('/api/health', (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      stats: {
        requests: db.prepare('SELECT COUNT(*) as count FROM requests').get().count,
        agents: db.prepare('SELECT COUNT(*) as count FROM agents').get().count,
        comments: db.prepare('SELECT COUNT(*) as count FROM comments').get().count
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
});

// =========================
// 📌 REQUESTS ROUTES
// =========================

// Get all requests
app.get('/api/requests', (req, res) => {
  try {
    const requests = db.prepare('SELECT * FROM requests ORDER BY createdAt DESC').all();
    // Parse tags from JSON string
    requests.forEach(r => {
      if (r.tags) r.tags = JSON.parse(r.tags);
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get single request
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

// Create request
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

// Get status (added for browser testing)
app.get('/api/requests/:id/status', (req, res) => {
  try {
    const request = db.prepare('SELECT status FROM requests WHERE id = ?').get(req.params.id);
    if (request) {
      res.json({ status: request.status });
    } else {
      res.status(404).json({ error: 'Request not found' });
    }
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Update status
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

// Get assignment (added for browser testing)
app.get('/api/requests/:id/assign', (req, res) => {
  try {
    const request = db.prepare('SELECT assignedAgentId FROM requests WHERE id = ?').get(req.params.id);
    if (request) {
      res.json({ assignedAgentId: request.assignedAgentId });
    } else {
      res.status(404).json({ error: 'Request not found' });
    }
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// Assign agent
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

// Delete request
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
// 💬 COMMENTS ROUTES
// =========================

// Get comments for a request
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

// Add comment to a request
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
// 👥 AGENTS ROUTES
// =========================

// Get all agents
app.get('/api/agents', (req, res) => {
  try {
    const agents = db.prepare('SELECT * FROM agents').all();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Add agent
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

// Delete agent
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

// =========================
// ⚡ ESCALATION ROUTE
// =========================

const checkEscalationsHandler = (req, res) => {
  try {
    const requests = db.prepare("SELECT * FROM requests WHERE status != 'Done'").all();
    const escalated = [];
    const now = new Date();
    
    requests.forEach(request => {
      const dueDate = new Date(request.dueDate);
      const daysOverdue = (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysOverdue > 3 && request.priority !== 'Critical') {
        db.prepare('UPDATE requests SET priority = ?, updatedAt = ? WHERE id = ?').run(
          'Critical',
          now.toISOString(),
          request.id
        );
        escalated.push(request.id);
        
        // Add system comment about escalation
        const commentId = uuidv4();
        db.prepare(`
          INSERT INTO comments (id, requestId, author, text, type, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          commentId,
          request.id,
          'System',
          `Priority automatically escalated to Critical (${Math.floor(daysOverdue)} days overdue)`,
          'System-generated',
          now.toISOString()
        );
      }
    });
    
    res.json({ 
      escalated,
      count: escalated.length,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Error checking escalations:', error);
    res.status(500).json({ error: 'Failed to check escalations' });
  }
};

app.post('/api/requests/check-escalations', checkEscalationsHandler);
app.get('/api/requests/check-escalations', checkEscalationsHandler); // Added for browser testing

app.listen(port, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Backend server running at http://localhost:${port}`);
  console.log('='.repeat(50));
  console.log(`📊 DATABASE STATUS:`);
  console.log(`   Requests: ${db.prepare('SELECT COUNT(*) as count FROM requests').get().count}`);
  console.log(`   Agents: ${db.prepare('SELECT COUNT(*) as count FROM agents').get().count}`);
  console.log(`   Comments: ${db.prepare('SELECT COUNT(*) as count FROM comments').get().count}`);
  console.log('='.repeat(50));
  console.log(`📋 API ENDPOINTS:`);
  console.log(`   🔍 GET    /api/health`);
  console.log(`   📌 GET    /api/requests`);
  console.log(`   📌 GET    /api/requests/:id`);
  console.log(`   📌 POST   /api/requests`);
  console.log(`   📌 GET    /api/requests/:id/status  (fetch)`);
  console.log(`   📌 PUT    /api/requests/:id/status  (update)`);
  console.log(`   📌 GET    /api/requests/:id/assign  (fetch)`);
  console.log(`   📌 PUT    /api/requests/:id/assign  (update)`);
  console.log(`   📌 DELETE /api/requests/:id`);
  console.log(`   💬 GET    /api/requests/:id/comments`);
  console.log(`   💬 POST   /api/requests/:id/comments`);
  console.log(`   👥 GET    /api/agents`);
  console.log(`   👥 POST   /api/agents`);
  console.log(`   👥 DELETE /api/agents/:id`);
  console.log(`   ⚡ GET    /api/requests/check-escalations  (check)`);
  console.log(`   ⚡ POST   /api/requests/check-escalations  (check)`);
  console.log('='.repeat(50));
});