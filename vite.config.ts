import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'
import type { IncomingMessage, ServerResponse } from 'http'
// Custom plugin to handle Git commands
const appUpdaterPlugin = () => ({
  name: 'app-updater',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (req.method === 'POST' && req.url === '/api/app/upgrade') {
        exec('git pull origin main', (err, stdout, stderr) => {
          res.setHeader('Content-Type', 'application/json');
          if (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: stderr || err.message }));
          } else {
            res.end(JSON.stringify({ success: true, message: stdout }));
          }
        });
        return;
      }
      
      if (req.method === 'POST' && req.url === '/api/app/downgrade') {
        exec('git reset --hard HEAD~1', (err, stdout, stderr) => {
          res.setHeader('Content-Type', 'application/json');
          if (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: stderr || err.message }));
          } else {
            res.end(JSON.stringify({ success: true, message: stdout }));
          }
        });
        return;
      }
      
      next();
    });
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), appUpdaterPlugin()],
})
