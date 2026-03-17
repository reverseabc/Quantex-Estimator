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
const SETTINGS_FILE = join(DATA_DIR, 'settings.json'); // NEW: File to save Manager settings

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

const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

// --- SECURITY IMPORTS ---
// bcryptjs: Scrambles passwords into irreversible hashes.
// jsonwebtoken: Creates secure digital 'passports' (tokens).
// cookie-parser: Reads the secure token from the browser.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Data persistence paths
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'db.json');
const usersDbPath = path.join(dataDir, 'users.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser()); // Required to read HttpOnly cookies

// --- SECURITY MIDDLEWARE ---
// Security Note: This function checks if the user has a valid 'passport' (JWT).
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const jwtSecret = process.env.JWT_SECRET || 'fallback_dev_secret_do_not_use_in_prod';
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user; // Attach user details to the request
    next();
  });
};

// Security Note: This enforces our RBAC (Role-Based Access Control) hierarchy.
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden. Insufficient privileges.' });
    }
    next();
  };
};

// Initialize data directory and database files
const initDb = async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    
    // Init main DB
    try {
      await fs.access(dbPath);
    } catch {
      await fs.writeFile(dbPath, JSON.stringify({ estimates: [] }, null, 2));
    }

    // Init Users DB
    try {
      await fs.access(usersDbPath);
    } catch {
      console.log('users.json not found. Creating default Admin user...');
      // Security Note: FIXED. We no longer hardcode the initial password. 
      // We pull it from the secure Render environment, or generate a random one on the fly.
      const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(8).toString('hex');
      
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(initialPassword, salt);

      const defaultUsers = {
        users: [
          {
            id: "admin-default-uuid",
            username: "admin",
            passwordHash: hashedPassword,
            role: "Admin",
            isActive: true,
            createdBy: "system",
            createdAt: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockUntil: null
          }
        ]
      };
      await fs.writeFile(usersDbPath, JSON.stringify(defaultUsers, null, 2));
      
      // This will only print once in the Render logs when the DB is first created.
      console.log(`Default Admin created. Username: admin`);
      console.log(`Initial Password: ${initialPassword}`);
      console.log('SECURITY WARNING: Please log in and change this password immediately.');
    }
  } catch (err) {
    console.error('Error initializing database files:', err);
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- AUTHENTICATION ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const usersData = await fs.readFile(usersDbPath, 'utf8');
    const { users } = JSON.parse(usersData);
    
    const user = users.find(u => u.username === username);
    
    // Security Note: We return generic error messages to prevent "Username Enumeration" (OWASP A07).
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Security Note: Verify Soft Delete flag (ISO 27001 Access Control).
    if (!user.isActive) {
       return res.status(403).json({ error: 'Account deactivated. Contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
       return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate Digital Passport (JWT)
    const jwtSecret = process.env.JWT_SECRET || 'fallback_dev_secret_do_not_use_in_prod';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      jwtSecret,
      { expiresIn: '8h' } 
    );

    // Security Note: Sending token in a secure, HttpOnly cookie to prevent XSS theft.
    res.cookie('token', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    });

    res.json({ message: 'Logged in successfully', role: user.role, username: user.username });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

/**
 * HELPER FUNCTIONS: Disk I/O 📂
 * These functions handle reading and writing to our persistent files.
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
  return []; 
};

const saveDatabase = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving database to disk:", err);
  }
};

// NEW: Helper functions to load and save settings
const loadSettings = () => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading settings from disk:", err);
  }
  return { dailyRate: 1267 }; // Return default of £1267 if file doesn't exist yet
};

const saveSettings = (data) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error("Error saving settings to disk:", err);
  }
};

// Initialize our local variables from the disk on startup
let database = loadDatabase();
let globalSettings = loadSettings(); // NEW: Load settings on startup

// --- ESTIMATES API ROUTES ---

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

// --- SETTINGS API ROUTES (NEW) ---

app.get('/api/settings', (req, res) => {
  res.json(globalSettings);
});

app.put('/api/settings', (req, res) => {
  if (req.body.dailyRate) {
    globalSettings.dailyRate = Number(req.body.dailyRate);
    saveSettings(globalSettings); // Commit new rate to Disk
  }
  res.json(globalSettings);
});

// --- SERVING THE FRONTEND ---
const distPath = join(process.cwd(), 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Secure Persistent Server is listening on port ${PORT}`);
  console.log(`📂 Database location: ${DB_FILE}`);
  console.log(`⚙️  Settings location: ${SETTINGS_FILE}`);
});
