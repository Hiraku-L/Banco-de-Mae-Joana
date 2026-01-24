const express = require('express');
const path = require('path'); // Adicione isso!
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ESTA É A LINHA QUE RESOLVE O "CANNOT GET /" NO SEU PC
// Ela diz ao Node: "Se alguém pedir a raiz, entregue os arquivos da pasta de cima"
app.use(express.static(path.join(__dirname, '../../')));

// ... restante das rotas (/api/login, etc)