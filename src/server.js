import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurações básicas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientPath = path.join(__dirname, '../client');
const isProduction = process.env.NODE_ENV === 'production';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Sistema de cache com expiração automática
class CacheManager {
    constructor(duration) {
        this.cache = new Map();
        this.duration = duration;
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.duration) {
            this.cache.delete(key);
            return null;
        }
        
        return cached;
    }

    clear() {
        this.cache.clear();
    }
}

const cache = new CacheManager(CACHE_DURATION);

// Configuração do Axios para OpenExchangeRates
const api = axios.create({
    baseURL: 'https://openexchangerates.org/api',
    timeout: 10000,
    params: {
        app_id: process.env.OPENEXCHANGERATES_API_KEY
    }
});

// Retry logic para axios
api.interceptors.response.use(null, async error => {
    if (error.config && error.config.__retryCount < 3) {
        error.config.__retryCount = (error.config.__retryCount || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, 1000 * error.config.__retryCount));
        return api(error.config);
    }
    return Promise.reject(error);
});

const app = express();

// Middleware de segurança
app.use(cors());
app.use(express.json());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting configurável
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isProduction ? 100 : 5000, // Limite aumentado para desenvolvimento
    message: { error: 'Muitas requisições, tente novamente mais tarde' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => !isProduction // Ignora rate limiting em desenvolvimento
});

// Middleware de cache otimizado
const cacheMiddleware = (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached) {
        return res.json(cached.data);
    }
    next();
};

// Middleware de erro
const errorHandler = (error, req, res, next) => {
    console.error('Erro na aplicação:', error);
    res.status(error.status || 500).json({
        error: isProduction ? 'Erro interno do servidor' : error.message
    });
};

// Aplicar middlewares às rotas da API
app.use('/api', limiter);
app.use('/api', cacheMiddleware);

// Rotas da API
app.get('/api/exchange-rate', async (req, res, next) => {
    try {
        const [current, previous] = await Promise.all([
            api.get('/latest.json', { 
                params: { symbols: 'BRL' },
                timeout: 5000
            }),
            api.get('/historical/' + getYesterdayDate() + '.json', { 
                params: { symbols: 'BRL' },
                timeout: 5000
            })
        ]);

        const data = {
            rates: { BRL: current.data.rates.BRL },
            previousRate: previous.data.rates.BRL,
            timestamp: current.data.timestamp
        };

        cache.set(req.originalUrl, data);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

app.get('/api/historical/:date', async (req, res, next) => {
    try {
        const { date } = req.params;
        
        // Validação da data
        if (!isValidDate(date)) {
            return res.status(400).json({ error: 'Data inválida' });
        }

        const response = await api.get(`/historical/${date}.json`, {
            params: { symbols: 'BRL' },
            timeout: 5000
        });

        const data = {
            rates: { BRL: response.data.rates.BRL },
            timestamp: response.data.timestamp,
            date
        };

        cache.set(req.originalUrl, data);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Funções auxiliares
function getYesterdayDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}

function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Servir arquivos estáticos com cache
app.use(express.static(clientPath, {
    maxAge: isProduction ? '1d' : 0
}));

// Rota catch-all para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Tratamento de erros
app.use(errorHandler);

// Inicialização do servidor
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT} em modo ${isProduction ? 'produção' : 'desenvolvimento'}`);
});

// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', () => {
    console.log('Recebido SIGTERM. Encerrando servidor...');
    server.close(() => {
        console.log('Servidor encerrado.');
        process.exit(0);
    });
});

export default app;