import { json } from '@vercel/node';

// Função auto-gerada a partir da rota POST /register
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // --- Código original da rota ---
  
  const { email, password, nome } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, nome, saldo) VALUES ($1, $2, $3, 1000) RETURNING id',
      [email, hashedPassword, nome]
    );
    res.json({ id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
}