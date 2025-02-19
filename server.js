import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';

const app = express();

// Configuração do rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite de 100 requisições por windowMs
});

// Middlewares de segurança
app.use(helmet());
app.use(limiter);
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET']
}));

// Servir arquivos estáticos
app.use(express.static('public', {
    maxAge: '1h'
}));

// Rota para taxa atual
app.get('/api/exchange-rate', async (req, res) => {
    try {
        const response = await fetch(
            `${process.env.API_BASE_URL}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}`
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
        const { date } = req.params;
        
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({ error: 'Formato de data inválido' });
        }

        const response = await fetch(
            `${process.env.API_BASE_URL}/historical/${date}.json?app_id=${process.env.EXCHANGE_API_KEY}`
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} em ${process.env.NODE_ENV}`);
});