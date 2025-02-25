import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração do ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '../client');
const isProduction = process.env.NODE_ENV === 'production';

// Rate limiting mais permissivo para desenvolvimento
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isProduction ? 100 : 1000, // limite por IP
    message: { error: 'Muitas requisições, tente novamente mais tarde' },
    standardHeaders: true,
    legacyHeaders: false,
    // Adiciona delay entre requisições
    delayMs: 500
});

// Cache em memória com expiração
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Configuração do Axios para OpenExchangeRates
const api = axios.create({
    baseURL: 'https://openexchangerates.org/api',
    timeout: 10000,
    params: {
        app_id: process.env.OPENEXCHANGERATES_API_KEY
    }
});

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Middleware de cache
const cacheMiddleware = (req, res, next) => {
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);
    
    if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_DURATION) {
        return res.json(cachedResponse.data);
    }
    next();
};

// Aplica rate limiting e cache às rotas da API
app.use('/api', limiter);
app.use('/api', cacheMiddleware);

// Rotas da API
app.get('/api/exchange-rate', async (req, res) => {
    try {
        const [current, previous] = await Promise.all([
            api.get('/latest.json', { params: { symbols: 'BRL' } }),
            api.get('/historical/' + getYesterdayDate() + '.json', { 
                params: { symbols: 'BRL' } 
            })
        ]);

        const data = {
            rates: { BRL: current.data.rates.BRL },
            previousRate: previous.data.rates.BRL,
            timestamp: current.data.timestamp
        };

        cache.set(req.originalUrl, {
            data,
            timestamp: Date.now()
        });

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar taxa:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Erro ao buscar taxa de câmbio'
        });
    }
});

app.get('/api/historical/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const response = await api.get(`/historical/${date}.json`, {
            params: { symbols: 'BRL' }
        });

        const data = {
            rates: { BRL: response.data.rates.BRL },
            timestamp: response.data.timestamp,
            date
        };

        cache.set(req.originalUrl, {
            data,
            timestamp: Date.now()
        });

        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: `Erro ao buscar dados históricos para ${req.params.date}`
        });
    }
});

// Função auxiliar
function getYesterdayDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}

// Servir arquivos estáticos
app.use(express.static(clientPath));

// Rota catch-all para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT} em modo ${isProduction ? 'produção' : 'desenvolvimento'}`);
});