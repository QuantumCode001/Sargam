import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/api';
import { initDb } from './server/db';
import dotenv from 'dotenv';

dotenv.config();

// Ensure Database is initialized
initDb();

const app = express();
const PORT = 3000;

// JSON parsing middleware
app.use(express.json());

// API Router
app.use('/api', apiRouter);

// Derive filename and path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, './dist');

if (fs.existsSync(distPath)) {
  console.log(`Serving production static assets from: ${distPath}`);
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Aura Music API is running. Start the Vite dev server for client preview.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Aura Music Server] running on http://0.0.0.0:${PORT}`);
});
