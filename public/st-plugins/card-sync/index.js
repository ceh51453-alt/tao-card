/**
 * SillyTavern Server Plugin — Card Sync
 * 
 * Cách cài đặt:
 * 1. Copy thư mục này vào SillyTavern/plugins/card-sync/
 * 2. Trong SillyTavern config.yaml, bật: enableServerPlugins: true
 * 3. Khởi động lại SillyTavern
 * 
 * Endpoints:
 * - GET  /api/plugins/card-sync/status     — Kiểm tra plugin hoạt động
 * - POST /api/plugins/card-sync/push       — Push card data
 * - GET  /api/plugins/card-sync/characters  — Danh sách nhân vật
 */

const path = require('path');
const fs = require('fs');

/**
 * @param {import('express').Router} router
 */
function init(router) {
  const CHARACTERS_DIR = path.join(process.cwd(), 'public', 'characters');

  // Health check
  router.get('/status', (_req, res) => {
    res.json({ 
      status: 'ok', 
      plugin: 'card-sync',
      version: '1.0.0',
      timestamp: Date.now() 
    });
  });

  // Push card
  router.post('/push', async (req, res) => {
    try {
      const card = req.body;
      if (!card || !card.data || !card.data.name) {
        return res.status(400).json({ error: 'Invalid card data — missing data.name' });
      }

      const name = card.data.name.replace(/[<>:"/\\|?*]/g, '_');
      const filePath = path.join(CHARACTERS_DIR, `${name}.json`);
      const exists = fs.existsSync(filePath);

      fs.writeFileSync(filePath, JSON.stringify(card, null, 2), 'utf8');

      console.log(`[card-sync] ${exists ? 'Updated' : 'Created'}: ${name}`);

      res.json({ 
        success: true, 
        name: card.data.name,
        action: exists ? 'updated' : 'created',
        path: filePath,
      });
    } catch (err) {
      console.error('[card-sync] Push error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // List characters
  router.get('/characters', (_req, res) => {
    try {
      if (!fs.existsSync(CHARACTERS_DIR)) {
        return res.json([]);
      }

      const files = fs.readdirSync(CHARACTERS_DIR)
        .filter(f => f.endsWith('.json'));

      const characters = files.map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(CHARACTERS_DIR, f), 'utf8'));
          return {
            name: data.data?.name || data.name || f.replace('.json', ''),
            avatar: data.avatar || 'none',
            create_date: data.create_date || '',
          };
        } catch {
          return { name: f.replace('.json', ''), avatar: 'none', create_date: '' };
        }
      });

      res.json(characters);
    } catch (err) {
      console.error('[card-sync] List error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log('[card-sync] Plugin loaded — endpoints ready');
}

module.exports = { init };
