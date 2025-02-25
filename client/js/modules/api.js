const CACHE_DURATION = 30000; // 30 segundos
const cache = new Map();

const api = axios.create({
    baseURL: '/api',
    timeout: 10000,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

// Interceptor para retry em caso de erro
api.interceptors.response.use(null, async error => {
    if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 1;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return api.request(error.config);
    }
    return Promise.reject(error);
});

export async function fetchExchangeRate() {
    const cacheKey = 'current_rate';
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return cachedData.data;
        }

        const { data } = await api.get('/exchange-rate');
        
        if (!data || !data.rates || typeof data.rates.BRL !== 'number') {
            throw new Error('Formato de resposta inválido');
        }

        const exchangeData = {
            rate: data.rates.BRL,
            previousRate: data.previousRate || null,
            timestamp: data.timestamp || Date.now()
        };

        cache.set(cacheKey, {
            data: exchangeData,
            timestamp: Date.now()
        });

        return exchangeData;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        throw error;
    }
}

export async function getHistoricalRates(period) {
    const cacheKey = `historical_${period}`;
    const BATCH_SIZE = 5;
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return cachedData.data;
        }

        const dates = calculateDateRange(period);
        const results = [];

        for (let i = 0; i < dates.length; i += BATCH_SIZE) {
            const batch = dates.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(date => 
                api.get(`/historical/${date}`)
                    .then(response => ({
                        date,
                        rate: response.data.rates.BRL,
                        timestamp: response.data.timestamp
                    }))
                    .catch(error => {
                        console.warn(`Erro ao buscar dados para ${date}:`, error);
                        return null;
                    })
            );

            const batchResults = await Promise.allSettled(batchPromises);
            const validResults = batchResults
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value);

            results.push(...validResults);

            if (i + BATCH_SIZE < dates.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (results.length === 0) {
            throw new Error('Nenhum dado histórico válido encontrado');
        }

        results.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        cache.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        });

        return results;
    } catch (error) {
        console.error('Erro ao buscar taxas históricas:', error);
        throw error;
    }
}

function calculateDateRange(period) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(period) {
        case '1m': 
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case '6m':
            startDate.setMonth(startDate.getMonth() - 6);
            break;
        case '1y':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        default: // 7d
            startDate.setDate(startDate.getDate() - 7);
    }

    const dates = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

export function clearCache() {
    cache.clear();
}