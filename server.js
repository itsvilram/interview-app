import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabase } from './db.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors()); // only needed if the frontend is hosted on a different domain
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves the frontend

// Health check: useful to confirm the deploy is up.
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Returns a positive integer id, or null if the URL param is invalid.
function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// LIST
app.get('/api/items', async (req, res) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CREATE
app.post('/api/items', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (title.length > 200) return res.status(400).json({ error: 'title must be 200 characters or fewer' });

  const { data, error } = await supabase.from('items').insert({ title }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// UPDATE (title and/or done)
app.patch('/api/items/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const changes = {};
  if (typeof req.body?.done === 'boolean') changes.done = req.body.done;
  if (typeof req.body?.title === 'string') {
    const title = req.body.title.trim();
    if (!title || title.length > 200) return res.status(400).json({ error: 'title must be 1-200 characters' });
    changes.title = title;
  }
  if (Object.keys(changes).length === 0) return res.status(400).json({ error: 'nothing to update' });

  const { data, error } = await supabase.from('items').update(changes).eq('id', id).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'item not found' });
  res.json(data);
});

// DELETE
app.delete('/api/items/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const { data, error } = await supabase.from('items').delete().eq('id', id).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'item not found' });
  res.status(204).end();
});

// Unknown API route
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// Last-resort error handler so the server never crashes on a bad request
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
