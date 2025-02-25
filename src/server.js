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

const historicalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições, tente novamente mais tarde' }
});

// Middlewares
app.use(express.json());
app.use(cors());

// Configuração do Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:"],
            fontSrc: ["'self'", "https:", "http:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
app.use('/api/', generalLimiter);

// Cache em memória
const cache = new Map();
const CACHE_DURATION = isProduction ? 300000 : 60000; // 5 min prod, 1 min dev

// Função de limpeza de cache
const clearExpiredCache = () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            cache.delete(key);
        }
    }
};
setInterval(clearExpiredCache, 60000);

// Função auxiliar para fetch com timeout
async function fetchWithTimeout(url, options = {}) {
    const { timeout = 8000, ...fetchOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Rota para taxa atual
app.get('/api/exchange-rate', async (req, res) => {
    const cacheKey = 'current_rate';
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return res.json(cachedData.data);
        }

        const response = await fetchWithTimeout(
            `${API_BASE_URL}/latest.json?app_id=${process.env.OPENEXCHANGERATES_API_KEY}&symbols=BRL`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Meu-Conversor/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.rates || typeof data.rates.BRL !== 'number') {
            throw new Error('Dados inválidos recebidos da API');
        }

        const formattedData = {
            rates: { BRL: data.rates.BRL },
            timestamp: data.timestamp,
            base: 'USD'
        };

        cache.set(cacheKey, {
            data: formattedData,
            timestamp: Date.now()
        });

        res.json(formattedData);
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        res.status(error.name === 'AbortError' ? 504 : 500)
           .json({ error: 'Erro ao buscar taxa de câmbio' });
    }
});

// Rota para dados históricos por data específica
app.get('/api/historical/:date', async (req, res) => {
    const { date } = req.params;
    const cacheKey = `historical_${date}`;

    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return res.json(cachedData.data);
        }

        const response = await fetchWithTimeout(
            `${API_BASE_URL}/historical/${date}.json?app_id=${process.env.OPENEXCHANGERATES_API_KEY}&symbols=BRL`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Meu-Conversor/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.rates || typeof data.rates.BRL !== 'number') {
            throw new Error('Dados inválidos recebidos da API');
        }

        const formattedData = {
            rates: { BRL: data.rates.BRL },
            timestamp: data.timestamp,
            base: 'USD',
            date
        };

        cache.set(cacheKey, {
            data: formattedData,
            timestamp: Date.now()
        });

        res.json(formattedData);
    } catch (error) {
        console.error(`Erro ao buscar dados históricos para ${date}:`, error);
        res.status(error.name === 'AbortError' ? 504 : 500)
           .json({ error: 'Erro ao buscar dados históricos' });
    }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../client')));

// Rota catch-all
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
        error: isProduction ? 'Erro interno do servidor' : err.message 
    });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} em modo ${isProduction ? 'produção' : 'desenvolvimento'}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('Erro não capturado:', error);
    if (!isProduction) {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promessa não tratada:', reason);
});

// Limpa o cache quando o servidor é encerrado
process.on('SIGTERM', () => {
    console.log('Encerrando servidor...');
    cache.clear();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Encerrando servidor...');
    cache.clear();
    process.exit(0);
});

export default app;