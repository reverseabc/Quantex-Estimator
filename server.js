import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs'; // Built-in module to talk to the disk
import helmet from 'helmet';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// SECURITY NOTE: Persistent Storage Path 💾
// On Render, we use the '/data' directory for persistent disks.
// Locally, we'll fall back to a local 'data' folder so you can still test.
const DATA_DIR = process.env.RENDER ? '/data' : join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'estimates.json');

// Ensure the directory exists when the server starts
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * SECURITY NOTE: Content Security Policy (CSP) 🛡️
 */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "blob:"],
      "upgrade-insecure-requests": [],
    },
  },
}));

app.use(cors()); 
app.use(express.json()); 

/**
 * HELPER FUNCTIONS: Disk I/O 📂
 * These functions handle reading and writing to our persistent file.
 */
const loadDatabase = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading database from disk:", err);
  }
  return []; // Return empty array if file doesn't exist or errors
};

const saveDatabase = (data) => {
  try {
    // SECURITY NOTE: We stringify the data before saving.
    // This ensures it is stored as plain text, preventing execution of malicious code.
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving database to disk:", err);
  }
};

// Initialize our local variable from the disk on startup
let database = loadDatabase();

// --- BACKEND API ROUTES ---

app.get('/api/estimates', (req, res) => {
  res.json(database);
});

app.post('/api/estimates', (req, res) => {
  const newEstimate = req.body;
  database.push(newEstimate);
  
  saveDatabase(database); // Commit change to Disk
  res.status(201).json(newEstimate);
});

app.put('/api/estimates/:id', (req, res) => {
  const { id } = req.params;
  const index = database.findIndex(est => est.id === id);
  if (index !== -1) {
    database[index] = req.body;
    saveDatabase(database); // Commit change to Disk
    res.json(database[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.delete('/api/estimates/:id', (req, res) => {
  const { id } = req.params;
  database = database.filter(est => est.id !== id);
  saveDatabase(database); // Commit change to Disk
  res.status(204).send();
});

// Serving the Frontend
const distPath = join(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Secure Persistent Server is listening on port ${PORT}`);
  console.log(`📂 Database location: ${DB_FILE}`);
});
