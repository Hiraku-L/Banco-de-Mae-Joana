import fetch from 'node-fetch';

const TMDB_KEY = process.env.TMDB_API_KEY;

app.get('/movies/pending', authMiddleware, async (req, res) => {
  try {
    const sessions = await db.query(`
      SELECT * FROM movie_sessions
      WHERE status = 'pending'
    `);

    const enrichedSessions = await Promise.all(
      sessions.rows.map(async session => {
        try {
          const tmdbRes = await fetch(
            `https://api.themoviedb.org/3/movie/${session.movie_id}?api_key=${TMDB_KEY}&language=pt-BR`
          );
          const movieData = await tmdbRes.json();

          return {
            ...session,
            poster_url: movieData.poster_path
              ? `https://image.tmdb.org/t/p/w200${movieData.poster_path}`
              : null
          };
        } catch {
          return { ...session, poster_url: null };
        }
      })
    );

    res.json(enrichedSessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});