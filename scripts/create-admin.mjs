#!/usr/bin/env node
/**
 * Creates the first Admin account for Quantex.
 *
 * Usage:
 *   node scripts/create-admin.mjs "Oliver Taghizadeh" oliver@example.com [username]
 *
 * The username defaults to the email. Usernames must be unique; the same email can
 * have one account per role (e.g. an Admin account and a Manager account).
 *
 * You'll be prompted for a password (not echoed, not saved in shell history).
 * The script writes seed-admin.sql (git-ignored). Apply it, then delete it:
 *   npx wrangler d1 execute quantex-db --remote --file=./seed-admin.sql
 *   rm seed-admin.sql
 */
import { pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import readline from 'node:readline';

const ITERATIONS = 100000; // must match worker/index.js (Workers caps PBKDF2 at 100,000)

const [name, email, usernameArg] = process.argv.slice(2);
if (!name || !email || !email.includes('@')) {
  console.error('Usage: node scripts/create-admin.mjs "Full Name" email@example.com [username]');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
let muted = false;
const realWrite = rl._writeToOutput?.bind(rl);
rl._writeToOutput = (s) => {
  if (!muted && realWrite) realWrite(s);
};

// Line queue so this works both interactively and with piped input.
const pending = [];
let waiter = null;
rl.on('line', (line) => {
  if (waiter) {
    const w = waiter;
    waiter = null;
    w(line);
  } else pending.push(line);
});

function askHidden(question) {
  process.stdout.write(question);
  muted = true;
  return new Promise((resolve) => {
    const done = (answer) => {
      muted = false;
      process.stdout.write('\n');
      resolve(answer);
    };
    if (pending.length) done(pending.shift());
    else waiter = done;
  });
}

const password = await askHidden('Password (min 12 characters): ');
const confirm = await askHidden('Confirm password: ');
rl.close();
if (password !== confirm) {
  console.error('Passwords do not match.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Password must be at least 12 characters.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const stored = `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;

const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const normalisedEmail = email.trim().toLowerCase();
const username = (usernameArg || normalisedEmail).trim().toLowerCase();
if (!/^[a-z0-9._@-]{3,64}$/.test(username)) {
  console.error('Username must be 3-64 characters: letters, numbers and . _ - @ only.');
  process.exit(1);
}
const sql = `INSERT INTO users (id, username, email, name, password_hash, role, is_active, must_change_password, created_by, created_at)
VALUES (${q(randomUUID())}, ${q(username)}, ${q(normalisedEmail)}, ${q(name)}, ${q(stored)}, 'Admin', 1, 0, 'seed-script', ${q(new Date().toISOString())});
`;
writeFileSync('seed-admin.sql', sql);
console.log('Wrote seed-admin.sql. Now run:');
console.log('  npx wrangler d1 execute quantex-db --remote --file=./seed-admin.sql');
console.log('  rm seed-admin.sql');
