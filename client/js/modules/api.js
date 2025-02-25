import axios from 'axios';
import { showError } from './utils.js';

// Configurações
const CONFIG = {
    isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    baseUrl: '/api',
    retryAttempts: 3,
    retryDelay: 1000,
    requestTimeout: 10000,
    batchSize: 5,
    batchDelay: 1000,
    cacheDuration: 30 * 1000 // 30 segundos de cache
};

// Configuração do Axios
const api = axios.create({
    baseURL: CONFIG.baseUrl,
    timeout: CONFIG.requestTimeout,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    }
});

// Sistema de cache
class CacheSystem {
    constructor(duration = CONFIG.cacheDuration) {
        this.cache = new Map();
        this.duration = duration;
    }

    get(key) {
        const data = this.cache.get(key);
        if (!data) return null;

        if (Date.now() - data.timestamp > this.duration) {
            this.cache.delete(key);
            return null;
        }

        return data.value;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    clear() {
        this.cache.clear();
    }
}

const cache = new CacheSystem();

// Interceptor para retry
api.interceptors.response.use(null, async error => {
    const config = error.config;
    config.retryCount = config.retryCount || 0;

    if (config.retryCount >= CONFIG.retryAttempts) {
        return Promise.reject(error);
    }

    config.retryCount += 1;

    const delay = CONFIG.retryDelay * Math.pow(2, config.retryCount - 1);
    await new Promise(resolve => setTimeout(resolve, delay));

    return api(config);
});

/**
 * Busca a taxa de câmbio atual
 * @returns {Promise<{rate: number, previousRate: number}>}
 */
export async function fetchExchangeRate() {
    const cacheKey = 'current_rate';
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null) {
            return cachedData;
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

        cache.set(cacheKey, exchangeData);
        return exchangeData;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        showError('Erro ao buscar cotação atual. Tentando novamente em 5 segundos...');
        
        const retryDelay = Math.min(5000 * Math.pow(2, cache.get('retryCount') || 0), 30000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        cache.set('retryCount', (cache.get('retryCount') || 0) + 1);
        return fetchExchangeRate();
    }
}

/**
 * Busca taxas históricas em lotes otimizados
 */
async function fetchHistoricalBatch(dates) {
    const results = [];
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    for (let i = 0; i < dates.length; i += CONFIG.batchSize) {
        const batch = dates.slice(i, i + CONFIG.batchSize);
        const batchPromises = batch.map(async date => {
            const cacheKey = `historical_${date}`;
            const cachedData = cache.get(cacheKey);
            
            if (cachedData !== null) {
                return cachedData;
            }

            try {
                const { data } = await api.get(`/historical/${date}`);

                if (!data || !data.rates || typeof data.rates.BRL !== 'number') {
                    console.warn(`Dados inválidos para ${date}`);
                    return null;
                }

                consecutiveErrors = 0;
                const result = {
                    date,
                    rate: data.rates.BRL,
                    timestamp: data.timestamp || new Date(date).getTime()
                };
                
                cache.set(cacheKey, result);
                return result;
            } catch (error) {
                console.warn(`Erro ao buscar dados para ${date}:`, error);
                consecutiveErrors++;
                
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    throw new Error('Múltiplas falhas consecutivas ao buscar dados');
                }
                
                return null;
            }
        });

        try {
            const batchResults = await Promise.all(batchPromises);
            const validResults = batchResults.filter(item => item !== null);
            
            if (validResults.length > 0) {
                results.push(...validResults);
            }
            
            if (i + CONFIG.batchSize < dates.length) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.batchDelay));
            }
        } catch (error) {
            if (consecutiveErrors >= maxConsecutiveErrors) {
                throw error;
            }
        }
    }
    
    if (results.length === 0) {
        throw new Error('Nenhum dado histórico válido encontrado');
    }
    
    return results;
}

/**
 * Busca taxas de câmbio históricas com cache otimizado
 */
export async function getHistoricalRates(period) {
    const cacheKey = `historical_${period}`;
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null && cachedData.length > 0) {
            const lastDate = new Date(cachedData[cachedData.length - 1].date);
            const now = new Date();
            if (lastDate.toDateString() === now.toDateString()) {
                return cachedData;
            }
        }

        const dates = calculateDateRange(period);
        const results = await fetchHistoricalBatch(dates);

        if (results.length === 0) {
            throw new Error('Nenhum dado histórico válido encontrado');
        }

        results.sort((a, b) => new Date(a.date) - new Date(b.date));
        cache.set(cacheKey, results);

        return results;
    } catch (error) {
        console.error('Erro ao buscar taxas históricas:', error);
        showError('Erro ao buscar dados históricos. Tentando novamente em 5 segundos...');
        
        const retryDelay = Math.min(5000 * Math.pow(2, cache.get('historyRetryCount') || 0), 30000);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        cache.set('historyRetryCount', (cache.get('historyRetryCount') || 0) + 1);
        return getHistoricalRates(period);
    }
}

/**
 * Calcula o intervalo de datas para o período
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

export function clearCache() {
    cache.clear();
}

export const apiConfig = {
    ...CONFIG,
    clearCache,
    isCached: (key) => cache.get(key) !== null
};