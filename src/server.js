import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configurações de rate limit separadas
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições, tente novamente mais tarde' }
});

const historicalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // Aumentado para requisições históricas
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições, tente novamente mais tarde' }
});

// Aplicar rate limiting específico para cada rota
app.use('/api/exchange-rate', generalLimiter);
app.use('/api/historical', historicalLimiter);

// Configuração mais restritiva do Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://openexchangerates.org"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'none'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" }
}));

// CORS mais restritivo
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
    maxAge: 3600
}));

// Servir arquivos estáticos da pasta client
app.use(express.static(path.join(__dirname, '../client')));

// Cache para respostas
const cacheControl = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutos
    next();
};

// Validação de parâmetros
const validateDate = (req, res, next) => {
    const { date } = req.params;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Data inválida' });
    }
    const dateObj = new Date(date);
    if (dateObj > new Date() || dateObj < new Date('2000-01-01')) {
        return res.status(400).json({ error: 'Data fora do intervalo permitido' });
    }
    next();
};

// Cache em memória simples
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para limpar cache expirado
const clearExpiredCache = () => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            cache.delete(key);
        }
    }
};

// Limpar cache expirado a cada minuto
setInterval(clearExpiredCache, 60 * 1000);

// Rota para taxa atual com cache
app.get('/api/exchange-rate', cacheControl, async (req, res) => {
    try {
        if (!process.env.EXCHANGE_API_KEY) {
            throw new Error('API key não configurada');
        }

        // Verificar cache
        const cacheKey = 'current_rate';
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return res.json(cachedData.data);
        }

        const response = await fetch(
            `${process.env.API_BASE_URL}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}&base=USD&symbols=BRL`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Meu-Conversor/1.0'
                },
                timeout: 5000
            }
        );

        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }

        const data = await response.json();
        
        // Formatar resposta
        const formattedData = {
            rates: {
                BRL: data.rates?.BRL || null
            },
            timestamp: data.timestamp,
            base: data.base || 'USD'
        };

        // Atualizar cache
        cache.set(cacheKey, {
            data: formattedData,
            timestamp: Date.now()
        });

        res.json(formattedData);
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        res.status(500).json({ error: 'Erro ao buscar taxa de câmbio' });
    }
});

// Rota para dados históricos com validação
app.get('/api/historical/:date', validateDate, cacheControl, async (req, res) => {
    try {
        if (!process.env.EXCHANGE_API_KEY) {
            throw new Error('API key não configurada');
        }

        const { date } = req.params;
        
        // Verificar cache
        const cacheKey = `historical_${date}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return res.json(cachedData.data);
        }

        const response = await fetch(
            `${process.env.API_BASE_URL}/historical/${date}.json?app_id=${process.env.EXCHANGE_API_KEY}&base=USD&symbols=BRL`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Meu-Conversor/1.0'
                },
                timeout: 5000
            }
        );

        if (!response.ok) {
            throw new Error(`API respondeu com status ${response.status}`);
        }

        const data = await response.json();
        
        // Formatar resposta
        const formattedData = {
            rates: {
                BRL: data.rates?.BRL || null
            },
            timestamp: data.timestamp,
            base: data.base || 'USD',
            historical: true,
            date: date
        };

        // Atualizar cache
        cache.set(cacheKey, {
            data: formattedData,
            timestamp: Date.now()
        });

        res.json(formattedData);
    } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados históricos' });
    }
});

// Rota para todas as outras requisições - Serve o index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    if (!process.env.EXCHANGE_API_KEY) {
        console.error('AVISO: EXCHANGE_API_KEY não está configurada!');
    }
    console.log(`Servidor rodando na porta ${PORT} em ${process.env.NODE_ENV}`);
});