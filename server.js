import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

const app = express();

// Aumentar segurança do rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições, tente novamente mais tarde' }
});

// Configuração mais restritiva do Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://openexchangerates.org"]
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

// Rota para taxa atual com cache
app.get('/api/exchange-rate', cacheControl, async (req, res) => {
    try {
        if (!process.env.EXCHANGE_API_KEY) {
            throw new Error('API key não configurada');
        }

        const response = await fetch(
            `${process.env.API_BASE_URL}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}`,
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
        res.json(data);
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
        const response = await fetch(
            `${process.env.API_BASE_URL}/historical/${date}.json?app_id=${process.env.EXCHANGE_API_KEY}`,
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
        res.json(data);
    } catch (error) {
        console.error('Erro ao buscar dados históricos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados históricos' });
    }
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