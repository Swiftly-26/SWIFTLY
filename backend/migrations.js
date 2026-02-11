import db from "./db.js";

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const versionRow = db.prepare("SELECT value FROM meta WHERE key='version'").get();
  const currentVersion = versionRow ? parseInt(versionRow.value) : 0;

  if (currentVersion < 1) {
    db.exec(`
      CREATE TABLE agents (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT
      );

      CREATE TABLE requests (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        status TEXT,
        priority TEXT,
        dueDate TEXT,
        assignedAgentId TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );

      CREATE TABLE comments (
        id TEXT PRIMARY KEY,
        requestId TEXT,
        author TEXT,
        text TEXT,
        type TEXT,
        createdAt TEXT
      );
    `);

    db.prepare("INSERT OR REPLACE INTO meta (key,value) VALUES ('version','1')").run();
  }
}
