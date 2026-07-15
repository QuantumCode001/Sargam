import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import express from 'express';
import { apiRouter } from './server/api';
import { initDb } from './server/db';
import dotenv from 'dotenv';

// Load environment variables for the development server
dotenv.config();

export default defineConfig(() => {
  // Ensure DB is seeded
  initDb();

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'express-api-plugin',
        configureServer(server) {
          const app = express();
          app.use(express.json());
          app.use('/api', apiRouter);
          server.middlewares.use((req, res, next) => {
            app(req as any, res as any, next);
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Ignore db.json to prevent Vite from reloading the page when database writes occur.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/server/db.json']
      },
    },
  };
});
