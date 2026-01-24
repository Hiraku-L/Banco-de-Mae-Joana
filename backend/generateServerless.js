/**
 * Script para transformar rotas Express em funções serverless Vercel
 * 
 * Uso:
 *   node generateServerless.js
 * 
 * Requisitos:
 *   - Node.js
 *   - Seu backend Express em um arquivo, ex: server.js
 *   - Rotas no padrão: app.get('/rota', handler) ou app.post(...)
 */

const fs = require('fs');
const path = require('path');

// Caminho do seu arquivo Express principal
const SERVER_FILE = path.join(__dirname, 'server.js');

// Pasta onde as funções serverless serão geradas
const API_DIR = path.join(__dirname, 'api');

// Lê o arquivo do backend
const code = fs.readFileSync(SERVER_FILE, 'utf-8');

// Regex simples para capturar rotas (GET, POST, PUT, DELETE)
const routeRegex = /app\.(get|post|put|delete)\(['"`]([^'"`]+)['"`],\s*(async\s*)?\(?req,?\s*res\)?\s*=>\s*{([\s\S]*?)}\)/g;

// Cria a pasta /api se não existir
if (!fs.existsSync(API_DIR)) fs.mkdirSync(API_DIR);

let match;
while ((match = routeRegex.exec(code)) !== null) {
  const method = match[1].toUpperCase();     // GET, POST...
  let route = match[2];                     // /user, /movies
  const handlerCode = match[4];             // código da rota

  // Remove barra inicial para criar nome do arquivo
  const fileName = route === '/' ? 'index' : route.replace(/\//g, '_');

  const functionFile = path.join(API_DIR, `${fileName}.js`);

  // Template básico de função serverless Vercel
  const functionCode = `
import { json } from '@vercel/node';

// Função auto-gerada a partir da rota ${method} ${route}
export default async function handler(req, res) {
  if (req.method !== '${method}') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // --- Código original da rota ---
  ${handlerCode}
}
`;

  fs.writeFileSync(functionFile, functionCode.trim(), 'utf-8');
  console.log(`Gerada função serverless: ${functionFile}`);
}

console.log('Todas as rotas foram convertidas para serverless!');
