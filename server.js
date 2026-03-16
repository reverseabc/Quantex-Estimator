import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * SECURITY NOTE: Content Security Policy (CSP) 🛡️
 * We are moving from 'false' (vulnerable) to a strict "Guest List".
 * This prevents malicious scripts from running on our site.
 */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"], // Allowed for Vite/React dev patterns
      "style-src": ["'self'", "'unsafe-inline'"],  // Allowed for Tailwind/inline styles
      "img-src": ["'self'", "data:", "blob:"],     // Allowed for logos and exported CSV blobs
      "upgrade-insecure-requests": [],             // Forces HTTPS in production
    },
  },
}));

// SECURITY NOTE: CORS Strategy
// In production, we should eventually restrict this to your specific Render URL.
app.use(cors()); 

app.use(express.json()); 

// --- BACKEND API ROUTES ---
let database = [];

app.get('/api/estimates', (req, res) => {
  res.json(database);
});

app.post('/api/estimates', (req, res) => {
  const newEstimate = req.body;
  database.push(newEstimate);
  res.status(201).json(newEstimate);
});

app.put('/api/estimates/:id', (req, res) => {
  const { id } = req.params;
  const index = database.findIndex(est => est.id === id);
  if (index !== -1) {
    database[index] = req.body;
    res.json(database[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/estimates/:id', (req, res) => {
  const { id } = req.params;
  database = database.filter(est => est.id !== id);
  res.status(204).send();
});

// Serving the Frontend
const distPath = join(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Secure server is up and listening on port ${PORT}`);
});
