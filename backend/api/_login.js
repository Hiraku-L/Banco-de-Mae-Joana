import { json } from '@vercel/node';

// Função auto-gerada a partir da rota POST /login
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // --- Código original da rota ---
  
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' 
});

  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) return res.status(400).json({ error: 'Invalid password' });

  const token = jwt.sign({ userId: user.id }, 'secreto', { expiresIn: '1h' });
  res.json({ token, user: { id: user.id, email: user.email, nome: user.nome } });
}