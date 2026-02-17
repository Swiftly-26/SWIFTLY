// Run this script to wipe and re-seed the database:
//   node reset-db.js
//
// Then restart the backend:
//   npm run dev  (or  npm start)

import { unlinkSync, existsSync } from 'fs';

const dbFile = './database.sqlite';

if (existsSync(dbFile)) {
  unlinkSync(dbFile);
  console.log('database.sqlite deleted.');
} else {
  console.log('database.sqlite not found — nothing to delete.');
}

console.log('Done. Start the server now and it will re-seed fresh data.');