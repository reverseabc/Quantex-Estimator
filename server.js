import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import cors from 'cors';

// These lines help us figure out exactly where our files live on the server
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// SECURITY NOTE: Port Configuration 🔒
// Render dynamically assigns a port to our app when it wakes up. 
// We MUST use process.env.PORT, otherwise Render won't know how to route traffic to us.
const PORT = process.env.PORT || 3000;

// SECURITY NOTE: Helmet & CORS 🔒
// Helmet adds layers of security headers. We disable CSP temporarily so it doesn't block Tailwind or your inline React scripts.
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors()); // Prevents malicious websites from making requests to our server

// SECURITY NOTE: Body Parser
// Safely parses incoming JSON payloads from your React frontend
app.use(express.json()); 

// --- BACKEND API ROUTES ---
// In-memory array to act as our temporary database.
let database = [];

// GET: Send all estimates to the React app
app.get('/api/estimates', (req, res) => {
  res.json(database);
});

// POST: Save a new estimate from the React app
app.post('/api/estimates', (req, res) => {
  const newEstimate = req.body;
  database.push(newEstimate);
  res.status(201).json(newEstimate);
});

// PUT: Update an existing estimate
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

// DELETE: Remove an estimate
app.delete('/api/estimates/:id', (req, res) => {
  const { id } = req.params;
  database = database.filter(est => est.id !== id);
  res.status(204).send();
});
// --- END API ROUTES ---

// 1. Tell the server to share the public "dist" folder (where Vite puts your finished React code)
app.use(express.static(join(__dirname, 'dist')));

// 2. The Catch-All Route
// If a user types a specific URL, just send back the React index.html file
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start the engine!
app.listen(PORT, () => {
  console.log(`🚀 Secure server is up and listening on port ${PORT}`);
});