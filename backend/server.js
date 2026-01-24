const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Simple root endpoint to indicate server is alive (helps dev checks)
app.get('/', (req, res) => res.send('Backend OK'));

let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
} else {
  console.warn('No DATABASE_URL provided — database features disabled for local testing');
}

// In-memory fallback for development when no DB is configured
let inMemoryUsers = [];
if (!pool) {
  inMemoryUsers = [
    {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'dev@dev',
      password_hash: 'devpass',
      nome: 'Dev User',
      saldo: 1000
    }
  ];
  // also allow common dev variant
  inMemoryUsers.push({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'dev@dev.com',
    password_hash: 'devpass',
    nome: 'Dev User 2',
    saldo: 1000
  });
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'dev_jwt_secret_change_me';
    console.warn('Using fallback JWT_SECRET for dev. Set JWT_SECRET in env for production.');
  }
}

const TMDB_API_KEY = process.env.TMDB_API_KEY || '5e832ea8944bc1e0d90d6b8cea3f1aaa';

// Create tables if not exist
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        saldo DECIMAL(10,2) DEFAULT 0
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        destinatario VARCHAR(255) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        data TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movie_sessions (
      id SERIAL PRIMARY KEY,
      requester_id UUID REFERENCES users(id),
      movie_id INTEGER NOT NULL,
      movie_title TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price_per_person DECIMAL(10,2) NOT NULL,
      poster TEXT,
      selected_users JSONB NOT NULL,
      confirmations JSONB DEFAULT '{}'
    );
    `);
    console.log('Tables created or already exist');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

if (pool) {
  createTables();
}

// Test DB connectivity at startup for clearer diagnostics
const testDb = async () => {
  if (!pool) return;
  try {
    const r = await pool.query('SELECT 1');
    console.log('Database reachable (SELECT 1) OK');
    try {
      const cnt = await pool.query('SELECT COUNT(*) FROM users');
      console.log('Users in DB:', cnt.rows[0].count);
    } catch (e) {
      console.warn('Could not count users (table may not exist yet):', e.message || e);
    }
  } catch (err) {
    console.error('Database connectivity test failed:', err.message || err);
  }
};

testDb();

process.on('unhandledRejection', (reason) => {
  console.error('UnhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err);
});

// Middleware to ensure DB is available for routes that need it
const ensureDb = (req, res, next) => {
  if (!pool) return res.status(503).json({ error: 'Database not configured' });
  next();
};

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/register', async (req, res) => {
  const { email, password, nome } = req.body;
  if (pool) {
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, nome, saldo) VALUES ($1, $2, $3, 1000) RETURNING id',
        [email, hashedPassword, nome]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(400).json({ error: 'User already exists or error' });
    }
  } else {
    // dev mode: register in memory
    if (inMemoryUsers.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists (dev)' });
    }
    const id = `dev-${Date.now()}`;
    inMemoryUsers.push({ id, email, password_hash: password, nome: nome || email, saldo: 1000 });
    res.json({ id });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (pool) {
    try {
      console.log('Login attempt for', email, '(using DB)');
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        console.warn('No user found in DB for', email);
        // In non-production/dev, allow in-memory fallback for quick testing
        if (process.env.NODE_ENV !== 'production' && inMemoryUsers.length) {
          const memUser = inMemoryUsers.find(u => u.email === email);
          if (memUser) {
            const validPassword = password === memUser.password_hash || await bcrypt.compare(password, memUser.password_hash).catch(()=>false);
            if (!validPassword) return res.status(400).json({ error: 'Invalid password (dev)' });
            const token = jwt.sign({ id: memUser.id }, process.env.JWT_SECRET);
            return res.json({ token, user: { id: memUser.id, nome: memUser.nome, saldo: memUser.saldo } });
          }
        }
        return res.status(400).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      let validPassword;
      if (user.password_hash && (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$'))) {
        validPassword = await bcrypt.compare(password, user.password_hash);
      } else {
        validPassword = password === user.password_hash;
      }
      if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
      res.json({ token, user: { id: user.id, nome: user.nome, saldo: user.saldo } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    // dev mode: check in-memory users
    const user = inMemoryUsers.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'User not found (dev)' });
    const validPassword = password === user.password_hash;
    if (!validPassword) return res.status(400).json({ error: 'Invalid password (dev)' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, nome: user.nome, saldo: user.saldo } });
  }
});

app.get('/user', authenticateToken, ensureDb, async (req, res) => {
  try {
    const result = await pool.query('SELECT nome, saldo FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/transfer', authenticateToken, ensureDb, async (req, res) => {
  const { destinatarioId, valor } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sender = await client.query('SELECT saldo FROM users WHERE id = $1', [req.user.id]);
    if (sender.rows[0].saldo < valor) throw new Error('Insufficient balance');
    await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [valor, req.user.id]);
    await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [valor, destinatarioId]);
    await client.query('INSERT INTO transactions (user_id, destinatario, valor, data) VALUES ($1, (SELECT nome FROM users WHERE id = $2), $3, NOW())', [req.user.id, destinatarioId, valor]);
    await client.query('COMMIT');
    // Keep only the last 10 transactions per user
    await client.query(`
      DELETE FROM transactions 
      WHERE user_id = $1 AND id NOT IN (
        SELECT id FROM transactions 
        WHERE user_id = $1 
        ORDER BY data DESC 
        LIMIT 10
      )
    `, [req.user.id]);
    res.json({ message: 'Transfer successful' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in transfer:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/transactions', authenticateToken, ensureDb, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY data DESC LIMIT 10', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/users', authenticateToken, ensureDb, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM users WHERE id != $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/users/all', authenticateToken, ensureDb, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/movies/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query required' });
  try {
    const searchResponse = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
      params: { api_key: TMDB_API_KEY, query }
    });
    const movies = (searchResponse.data.results || []).slice(0, 10);

    const detailPromises = movies.map(movie =>
      axios.get(`https://api.themoviedb.org/3/movie/${movie.id}`, { params: { api_key: TMDB_API_KEY } })
        .then(r => r.data)
        .catch(() => null)
    );

    const details = await Promise.allSettled(detailPromises);

    const detailedMovies = movies.map((movie, idx) => {
      const detail = details[idx] && details[idx].status === 'fulfilled' ? details[idx].value : null;
      const runtime = detail?.runtime || 0;
      return {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path,
        duration: runtime,
        price: Number((runtime * 0.1).toFixed(2))
      };
    });

    res.json(detailedMovies);
  } catch (err) {
    console.error('Error searching movies:', err);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

app.post('/movies/request', authenticateToken, ensureDb, async (req, res) => {
  const {
  movie_id,
  movie_title,
  duration,
  price_per_person,
  poster,
  selected_users
} = req.body;

  if (!selected_users || !Array.isArray(selected_users) || selected_users.length === 0) {
    return res.status(400).json({ error: 'Selected users required' });
  }
  const totalCost = price_per_person * selected_users.length;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT saldo FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows[0].saldo < totalCost) {
      throw new Error('Insufficient balance');
    }
    await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [totalCost, req.user.id]);
    const confirmations = {};
    selected_users.forEach(id => confirmations[id] = false);
    console.log('REQ BODY:', req.body);
console.log('POSTER:', poster);
console.log('POSTER NO BACK:', poster);

   await client.query(
  `
  INSERT INTO movie_sessions (
    requester_id,
    movie_id,
    movie_title,
    duration,
    price_per_person,
    poster,
    selected_users,
    confirmations
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  `,
  [
    req.user.id,
    movie_id,
    movie_title,
    duration,
    price_per_person,
    poster,
    JSON.stringify(selected_users),
    JSON.stringify(confirmations)
  ]
);

    await client.query('COMMIT');
    res.json({ message: 'Teu filme tá na lista, parça' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Deu BO, chefia:', err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/movies/pending', authenticateToken, ensureDb, async (req, res) => {
  try {
    const userId = String(req.user.id);
    const result = await pool.query(`
      SELECT *
      FROM movie_sessions
      WHERE requester_id = $1::uuid
         OR selected_users @> to_jsonb($1::text)
      ORDER BY id DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pending movies:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/movies/confirm', authenticateToken, ensureDb, async (req, res) => {
  const { session_id, user_id } = req.body;
  const sessionResult = await pool.query('SELECT * FROM movie_sessions WHERE id = $1', [session_id]);
  if (sessionResult.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
  const session = sessionResult.rows[0];
  if (session.requester_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  if (!session.selected_users.includes(user_id)) return res.status(400).json({ error: 'User not in session' });
  const confirmations = session.confirmations;
  if (confirmations[user_id]) return res.status(400).json({ error: 'Already confirmed' });
  confirmations[user_id] = true;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE movie_sessions SET confirmations = $1 WHERE id = $2', [JSON.stringify(confirmations), session_id]);
    await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [session.price_per_person, user_id]);
    await client.query('COMMIT');
    res.json({ message: 'Confirmation successful' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error confirming:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
app.delete('/movies/:id', authenticateToken, ensureDb, async (req, res) => {
  const sessionId = req.params.id;
  const userId = String(req.user.id);

  try {
    const result = await pool.query(
      'SELECT requester_id, selected_users, confirmations FROM movie_sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessão não encontrada' });
    }

    const session = result.rows[0];

    // Verifica se o usuário faz parte da negociação
    const isParticipant =
      session.requester_id === userId ||
      session.selected_users.includes(userId);

    if (!isParticipant) {
      return res.status(403).json({ error: 'Você não participa dessa negociação' });
    }

    // Verifica se TODOS confirmaram
    const allConfirmed = Object.values(session.confirmations || {})
      .every(v => v === true);

    if (!allConfirmed) {
      return res.status(403).json({
        error: 'Negociação ainda não encerrada'
      });
    }

    await pool.query(
      'DELETE FROM movie_sessions WHERE id = $1',
      [sessionId]
    );

    res.json({ message: 'Negociação excluída com sucesso' });

  } catch (err) {
    console.error('Erro ao excluir negociação:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});