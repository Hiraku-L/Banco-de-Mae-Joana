# Banco de Mãe Joana

Resumo: este repositório contém o frontend estático e um backend Express. Eu converti o backend para rodar como função serverless no Vercel usando `serverless-http`.

O que foi feito
- `backend/server.js` agora exporta o `app` quando importado e só chama `listen()` quando executado diretamente.
- `backend/api/index.js` é um wrapper que expõe o `app` como função serverless para o Vercel.
- `package.json` na raiz foi adicionado com dependências necessárias, incluindo `serverless-http`.
- `backend/server.js` foi tornado tolerante à ausência de `DATABASE_URL` (retorna 503 para rotas que dependem do DB) para permitir testes locais sem PostgreSQL.
- `/movies/search` agora usa `process.env.TMDB_API_KEY` e é mais resiliente a falhas nas chamadas de detalhe.

Variáveis de ambiente necessárias (configurar no Vercel):
- `DATABASE_URL` — URL de conexão com PostgreSQL (opcional para testes locais, mas necessário para funcionalidades de usuário/transações)
- `JWT_SECRET` — segredo para assinar tokens JWT
- `TMDB_API_KEY` — sua chave da API TheMovieDB (se não setado, um valor padrão embutido será usado, mas recomenda-se configurar)

Como testar localmente
1. Instale dependências na raiz do projeto:

```bash
npm install
```

2. Execute o backend local (exemplo porta 4001):

```powershell
$env:PORT=4001; node backend/server.js
```

3. Teste a busca de filmes (não precisa de DB):

```bash
curl "http://localhost:4001/movies/search?q=matrix"
```

Deploy no Vercel
1. Faça o push para um repositório GitHub.
2. No painel do Vercel, importe o projeto e configure as variáveis de ambiente listadas acima.
3. O `vercel.json` já direciona `/api/*` para `backend/api/index.js`, que expõe o app como função serverless.

Próximos passos que posso fazer por você
- Mover o wrapper para `api/index.js` na raiz (opção mais direta para Vercel)
- Remover/atualizar arquivos `backend/api/_*.js` gerados automaticamente
- Integrar cache simples para `/movies/search` para reduzir chamadas à TMDB
- Conectar e testar com um PostgreSQL remoto (se você fornecer `DATABASE_URL`)

Diga qual próximo passo prefere que eu execute.