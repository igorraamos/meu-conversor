import { showError } from './utils.js';

// Configuração do Axios com retry e timeout
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
    const config = error.config;
    
    // Se for erro 429 (Too Many Requests), tenta novamente após o tempo sugerido
    if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || 1;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return api.request(config);
    }
    
    // Se for timeout ou erro de rede, tenta novamente
    if (!error.response || error.code === 'ECONNABORTED') {
        config.__retryCount = config.__retryCount || 0;
        
        if (config.__retryCount < 2) {
            config.__retryCount += 1;
            await new Promise(resolve => setTimeout(resolve, 1000 * config.__retryCount));
            return api.request(config);
        }
    }
    
    return Promise.reject(error);
});

// Sistema de cache
const CACHE_DURATION = 30000; // 30 segundos
const cache = new Map();

/**
 * Busca a taxa de câmbio atual
 * @returns {Promise<{rate: number, previousRate: number, timestamp: number}>}
 */
export async function fetchExchangeRate() {
    const cacheKey = 'current_rate';
    
    try {
        // Verifica cache
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

        // Atualiza cache
        cache.set(cacheKey, {
            data: exchangeData,
            timestamp: Date.now()
        });

        return exchangeData;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        showError('Erro ao buscar cotação atual. Tentando novamente em 5 segundos...');
        
        // Retry com backoff exponencial
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchExchangeRate();
    }
}

/**
 * Busca taxas de câmbio históricas
 * @param {string} period - Período desejado ('7d', '1m', '6m', '1y')
 * @returns {Promise<Array<{date: string, rate: number, timestamp: number}>>}
 */
export async function getHistoricalRates(period) {
    const cacheKey = `historical_${period}`;
    const BATCH_SIZE = 5; // Número de requisições simultâneas
    
    try {
        // Verifica cache
        const cachedData = cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            return cachedData.data;
        }

        const dates = calculateDateRange(period);
        const results = [];

        // Processa as datas em lotes para evitar sobrecarga
        for (let i = 0; i < dates.length; i += BATCH_SIZE) {
            const batch = dates.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async date => {
                try {
                    const { data } = await api.get(`/historical/${date}`);
                    return {
                        date,
                        rate: data.rates.BRL,
                        timestamp: data.timestamp || new Date(date).getTime()
                    };
                } catch (error) {
                    console.warn(`Erro ao buscar dados para ${date}:`, error);
                    return null;
                }
            });

            const batchResults = await Promise.all(batchPromises);
            const validResults = batchResults.filter(result => result !== null);
            results.push(...validResults);

            // Aguarda um pouco entre os lotes para evitar rate limiting
            if (i + BATCH_SIZE < dates.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (results.length === 0) {
            throw new Error('Nenhum dado histórico válido encontrado');
        }

        // Ordena os resultados por data
        results.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Atualiza cache
        cache.set(cacheKey, {
            data: results,
            timestamp: Date.now()
        });

        return results;
    } catch (error) {
        console.error('Erro ao buscar taxas históricas:', error);
        showError('Erro ao buscar dados históricos. Tentando novamente em 5 segundos...');
        
        // Retry com backoff exponencial
        await new Promise(resolve => setTimeout(resolve, 5000));
        return getHistoricalRates(period);
    }
}

/**
 * Calcula o intervalo de datas para o período
 * @param {string} period - Período desejado ('7d', '1m', '6m', '1y')
 * @returns {string[]} Array de datas no formato YYYY-MM-DD
 */
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

/**
 * Limpa o cache
 */
export function clearCache() {
    cache.clear();
}

/**
 * Verifica se um dado está em cache
 * @param {string} key - Chave do cache
 * @returns {boolean}
 */
export function isCached(key) {
    const cachedData = cache.get(key);
    return cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION;
}

export const apiConfig = {
    CACHE_DURATION,
    clearCache,
    isCached
};