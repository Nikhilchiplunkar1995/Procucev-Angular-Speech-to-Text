import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { pool, initDb } from './db.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
});
app.get('/api/transcriptions', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const [rows] = await pool.query(
      `SELECT id,title,content,language,duration_seconds,created_at,updated_at FROM transcriptions
       WHERE (? = '' OR title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC`, [q, `%${q}%`, `%${q}%`]);
    res.json({ data: rows });
  } catch (e) { next(e); }
});
app.get('/api/transcriptions/:id', async (req, res, next) => {
  try { const [rows] = await pool.query('SELECT * FROM transcriptions WHERE id=?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Transcription not found' }); res.json({ data: rows[0] });
  } catch (e) { next(e); }
});
app.post('/api/transcriptions', async (req, res, next) => {
  try {
    const { title, content, language = 'auto', duration_seconds = 0 } = req.body;
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Transcription content is required' });
    const safeTitle = String(title || 'Untitled transcription').trim().slice(0,180);
    const id = randomUUID();
    await pool.query('INSERT INTO transcriptions(id,title,content,language,duration_seconds) VALUES(?,?,?,?,?)', [id, safeTitle || 'Untitled transcription', content.trim(), String(language).slice(0,30), Math.max(0, Number(duration_seconds) || 0)]);
    const [rows] = await pool.query('SELECT * FROM transcriptions WHERE id=?', [id]);
    if (!rows[0]) throw new Error('Inserted transcription could not be loaded');
    res.status(201).json({ data: rows[0] });
  } catch (e) { next(e); }
});
app.put('/api/transcriptions/:id', async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Content cannot be empty' });
    await pool.query('UPDATE transcriptions SET title=?,content=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [String(title || 'Untitled transcription').trim().slice(0,180), content.trim(), req.params.id]);
    const [rows] = await pool.query('SELECT * FROM transcriptions WHERE id=?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Transcription not found' }); res.json({ data: rows[0] });
  } catch (e) { next(e); }
});
app.delete('/api/transcriptions/:id', async (req, res, next) => {
  try { const [result] = await pool.query('DELETE FROM transcriptions WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Transcription not found' }); res.status(204).end();
  } catch (e) { next(e); }
});
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });
const port = Number(process.env.PORT || 4000);
initDb().then(() => app.listen(port, () => console.log(`API listening on :${port}`))).catch(err => { console.error('Database initialization failed:', err); process.exit(1); });
