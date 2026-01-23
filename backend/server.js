require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TMDB_API_KEY = '5e832ea8944bc1e0d90d6b8cea3f1aaa';

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

createTables();

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
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });
  const user = result.rows[0];
  let validPassword;
  if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$')) {
    validPassword = await bcrypt.compare(password, user.password_hash);
  } else {
    validPassword = password === user.password_hash;
  }
  if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
  res.json({ token, user: { id: user.id, nome: user.nome, saldo: user.saldo } });
});

app.get('/user', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT nome, saldo FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/transfer', authenticateToken, async (req, res) => {
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

app.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY data DESC LIMIT 10', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nome FROM users WHERE id != $1', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/users/all', authenticateToken, async (req, res) => {
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
    const searchResponse = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
    const movies = searchResponse.data.results.slice(0, 10);
    const detailedMovies = await Promise.all(movies.map(async (movie) => {
      const detailResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`);
      return {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path,
        duration: detailResponse.data.runtime || 0,
        price: (detailResponse.data.runtime || 0) * 0.1
      };
    }));
    res.json(detailedMovies);
  } catch (err) {
    console.error('Error searching movies:', err);
    res.status(500).json({ error: 'Failed to search movies' });
  }
});

app.post('/movies/request', authenticateToken, async (req, res) => {
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

app.get('/movies/pending', authenticateToken, async (req, res) => {
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

app.post('/movies/confirm', authenticateToken, async (req, res) => {
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.delete('/movies/:id', authenticateToken, async (req, res) => {
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