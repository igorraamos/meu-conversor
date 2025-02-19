import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para __dirname no ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuração do rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite de 100 requisições por windowMs
});

// Middlewares de segurança
app.use(helmet({
    contentSecurityPolicy: false, // Desabilita temporariamente para desenvolvimento
}));
app.use(limiter);
app.use(cors());

// Servir arquivos estáticos da pasta raiz
app.use(express.static('.'));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para taxa atual
app.get('/api/exchange-rate', async (req, res) => {
    try {
        const response = await fetch(
            `${process.env.API_BASE_URL || 'https://openexchangerates.org/api'}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        res.status(500).json({ error: 'Erro ao buscar taxa de câmbio' });
    }
});

// Rota para dados históricos
app.get('/api/historical/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const response = await fetch(
            `${process.env.API_BASE_URL || 'https://openexchangerates.org/api'}/historical/${date}.json?app_id=${process.env.EXCHANGE_API_KEY}`,
            {
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados históricos' });
    }
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Variáveis de ambiente carregadas:', {
        API_KEY: process.env.EXCHANGE_API_KEY ? 'Configurada' : 'Não configurada',
        API_BASE_URL: process.env.API_BASE_URL || 'Usando URL padrão'
    });
});