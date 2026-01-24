import { json } from '@vercel/node';

// Função auto-gerada a partir da rota GET /movies/search
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // --- Código original da rota ---
  
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query required' 
});

  try {
    const result = await pool.query(
      'SELECT * FROM movies WHERE title ILIKE $1',
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar filmes' });
  }
}