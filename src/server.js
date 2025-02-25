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

// Configuração do Axios para OpenExchangeRates
const api = axios.create({
    baseURL: 'https://openexchangerates.org/api',
    timeout: 10000,
    params: {
        app_id: process.env.OPENEXCHANGERATES_API_KEY
    }
});

// Cache em memória
const cache = new Map();
const CACHE_DURATION = 30000; // 30 segundos

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições, tente novamente mais tarde' }
}));

// Rotas da API
app.get('/api/exchange-rate', async (req, res) => {
    try {
        const cacheKey = 'current_rate';
        const cached = cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return res.json(cached.data);
        }

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

        cache.set(cacheKey, {
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
        const cacheKey = `historical_${date}`;
        const cached = cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return res.json(cached.data);
        }

        const response = await api.get(`/historical/${date}.json`, {
            params: { symbols: 'BRL' }
        });

        const data = {
            rates: { BRL: response.data.rates.BRL },
            timestamp: response.data.timestamp,
            date
        };

        cache.set(cacheKey, {
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

// Função auxiliar para obter a data de ontem
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

// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} em modo ${isProduction ? 'produção' : 'desenvolvimento'}`);
});

export default app;