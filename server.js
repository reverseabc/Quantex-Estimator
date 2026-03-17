import express from 'express';
import { promises as fs } from 'fs';
import fsSync from 'fs'; // For synchronous checks during startup
import path from 'path';
import cors from 'cors';
import crypto from 'crypto';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

// --- SECURITY IMPORTS ---
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

// Security Note: ES Modules do not have '__dirname' by default.
// We must safely recreate it to ensure our disk paths are always absolute.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// --- PERSISTENCE CONFIGURATION ---
// Security Note: On Render, we must use /data for persistent disks.
const DATA_DIR = process.env.RENDER ? '/data' : path.join(__dirname, 'data');
const USERS_DB_PATH = path.join(DATA_DIR, 'users.json');
const ESTIMATES_DB_PATH = path.join(DATA_DIR, 'estimates.json');
const SETTINGS_DB_PATH = path.join(DATA_DIR, 'settings.json');

// --- MIDDLEWARE ---
// Security Note: Helmet adds various HTTP headers to protect against common attacks.
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
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser()); // Allows server to read secure HttpOnly cookies

// --- SECURITY LOGIC ---

// Authentication Middleware: Checks if the user has a valid 'passport' (JWT).
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback_dev_secret';
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid. Please log in again.' });
    req.user = user; 
    next();
  });
};

// RBAC Middleware: Restricts access based on Role.
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden. You do not have permission for this action.' });
    }
    next();
  };
};

// --- DATABASE INITIALIZATION ---
const initDb = async () => {
  try {
    // Ensure the data directory exists
    if (!fsSync.existsSync(DATA_DIR)) {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }

    // Initialize Estimates File
    if (!fsSync.existsSync(ESTIMATES_DB_PATH)) {
      await fs.writeFile(ESTIMATES_DB_PATH, JSON.stringify([], null, 2));
    }

    // Initialize Settings File
    if (!fsSync.existsSync(SETTINGS_DB_PATH)) {
      await fs.writeFile(SETTINGS_DB_PATH, JSON.stringify({ dailyRate: 1267 }, null, 2));
    }

    // Initialize Users File & Default Admin
    if (!fsSync.existsSync(USERS_DB_PATH)) {
      console.log('User database not found. Creating default Admin...');
      const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(initialPassword, salt);

      const defaultUsers = {
        users: [{
          id: crypto.randomUUID(),
          username: "admin",
          email: "admin@quantex.local", // Added so default user can log in via email
          passwordHash: hashedPassword,
          role: "Admin",
          isActive: true,
          createdBy: "system",
          createdAt: new Date().toISOString()
        }]
      };
      await fs.writeFile(USERS_DB_PATH, JSON.stringify(defaultUsers, null, 2));
      console.log(`Default Admin created. Username: admin | Email: admin@quantex.local | Initial Password: ${initialPassword}`);
      console.log('SECURITY WARNING: Log in and change this password immediately.');
    }
  } catch (err) {
    console.error('CRITICAL: Database initialization failed:', err);
  }
};

// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // The frontend might send the identifier as 'username' or 'email' depending on the input field name
    const identifier = email || username;

    if (!identifier) {
      return res.status(400).json({ error: 'Username or email is required.' });
    }

    // Security Note: Input Validation (OWASP). If it contains '@', enforce strict email format.
    if (identifier.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return res.status(400).json({ error: 'Invalid email format provided.' });
      }
    }

    const usersData = await fs.readFile(USERS_DB_PATH, 'utf8');
    const { users } = JSON.parse(usersData);
    
    // Find the user by comparing the identifier against both the username and the email fields
    const user = users.find(u => u.username === identifier || u.email === identifier);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const jwtSecret = process.env.JWT_SECRET || 'fallback_dev_secret';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    res.json({ username: user.username, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

// --- ESTIMATES API ---

app.get('/api/estimates', async (req, res) => {
  try {
    const data = await fs.readFile(ESTIMATES_DB_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load estimates' });
  }
});

app.post('/api/estimates', async (req, res) => {
  try {
    const raw = await fs.readFile(ESTIMATES_DB_PATH, 'utf8');
    const estimates = JSON.parse(raw);
    const newEstimate = { ...req.body, id: Date.now().toString() };
    estimates.push(newEstimate);
    await fs.writeFile(ESTIMATES_DB_PATH, JSON.stringify(estimates, null, 2));
    res.status(201).json(newEstimate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save estimate' });
  }
});

// --- SETTINGS API ---

app.get('/api/settings', async (req, res) => {
  try {
    const data = await fs.readFile(SETTINGS_DB_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.json({ dailyRate: 1267 });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const newSettings = { dailyRate: Number(req.body.dailyRate) };
    await fs.writeFile(SETTINGS_DB_PATH, JSON.stringify(newSettings, null, 2));
    res.json(newSettings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// --- FRONTEND SERVING ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// --- STARTUP ---
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Quantex Server active on port ${PORT}`);
    console.log(`📂 Data directory: ${DATA_DIR}`);
  });
});
