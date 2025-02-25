import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração do ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const API_BASE_URL = 'https://openexchangerates.org/api';

// Ajuste do caminho para a pasta client
const clientPath = path.join(__dirname, '../client');

// Validações iniciais
if (!process.env.OPENEXCHANGERATES_API_KEY) {
    console.error('ERRO: OPENEXCHANGERATES_API_KEY não está configurada!');
    process.exit(1);
}

const app = express();

// Rate Limiters
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições, tente novamente mais tarde' }
});

// Middlewares
app.use(express.json());
app.use(cors());

// Configuração do Helmet mais permissiva para desenvolvimento
const helmetConfig = {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
};

app.use(helmet(helmetConfig));

// Rate Limiting
app.use('/api/', generalLimiter);

// Cache em memória
const cache = new Map();
const CACHE_DURATION = 30000; // 30 segundos

// [... resto do código do servidor permanece igual até as rotas de arquivos estáticos ...]

// Servir arquivos estáticos da pasta client
app.use(express.static(clientPath));

// Rota catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
        error: isProduction ? 'Erro interno do servidor' : err.message 
    });
});

// Inicialização do servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} em modo ${isProduction ? 'produção' : 'desenvolvimento'}`);
    console.log(`Servindo arquivos estáticos de: ${clientPath}`);
});

export default app;