import axios from 'axios';

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

export async function handler(event) {
    try {
        // Extrair o path da requisição
        const path = event.path.replace('/.netlify/functions/exchange-rate', '');
        const segments = path.split('/').filter(Boolean);

        // Rota para taxa atual
        if (!segments.length || segments[0] === '') {
            const cacheKey = 'current_rate';
            const cached = cache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(cached.data)
                };
            }

            const [current, previous] = await Promise.all([
                api.get('/latest.json', { params: { symbols: 'BRL' } }),
                api.get(`/historical/${getYesterdayDate()}.json`, {
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

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, s-maxage=30'
                },
                body: JSON.stringify(data)
            };
        }

        // Rota para dados históricos
        if (segments[0] === 'historical' && segments[1]) {
            const date = segments[1];
            const cacheKey = `historical_${date}`;
            const cached = cache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(cached.data)
                };
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

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, s-maxage=30'
                },
                body: JSON.stringify(data)
            };
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Rota não encontrada' })
        };
    } catch (error) {
        console.error('Erro:', error.response?.data || error.message);
        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({
                error: 'Erro ao processar requisição',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
}

function getYesterdayDate() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
}