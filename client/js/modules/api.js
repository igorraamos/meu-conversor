import { showError } from './utils.js';

// Configurações
const CONFIG = {
    // API base URL - ExchangeRate-API gratuita
    baseUrl: 'https://v6.exchangerate-api.com/v6',
    // Sua chave API gratuita da ExchangeRate-API
    apiKey: 'a95f414a0b8960ab25a514ec', // Substitua pela sua chave da ExchangeRate-API
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    retryAttempts: 3,
    retryDelay: 1000,
    requestTimeout: 10000,
    batchSize: 5,
    batchDelay: 1000
};

// Sistema de cache
class CacheSystem {
    constructor(duration = 5 * 60 * 1000) {
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

/**
 * Realiza uma requisição com retry e timeout
 */
async function fetchWithRetry(url, options = {}) {
    let lastError;
    
    for (let i = 0; i <= CONFIG.retryAttempts; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: CONFIG.headers
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 429) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
                    continue;
                }
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            lastError = error;
            
            if (error.name === 'AbortError') {
                throw new Error('Requisição excedeu o tempo limite');
            }
            
            if (i < CONFIG.retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (i + 1)));
                continue;
            }
        }
    }
    
    throw lastError;
}

/**
 * Busca a taxa de câmbio atual
 */
export async function fetchExchangeRate() {
    const cacheKey = 'current_rate';
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null) {
            return cachedData;
        }

        // Busca taxa atual USD/BRL
        const data = await fetchWithRetry(`${CONFIG.baseUrl}/${CONFIG.apiKey}/pair/USD/BRL`);
        
        if (!data || typeof data.conversion_rate !== 'number') {
            throw new Error('Formato de resposta inválido');
        }

        const exchangeData = {
            rate: data.conversion_rate,
            previousRate: data.conversion_rate, // A API gratuita não fornece taxa anterior
            timestamp: Date.now()
        };

        cache.set(cacheKey, exchangeData);
        return exchangeData;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        showError('Erro ao buscar cotação atual. Tentando novamente em 5 segundos...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchExchangeRate();
    }
}

/**
 * Busca taxas históricas
 */
export async function getHistoricalRates(period) {
    const cacheKey = `historical_${period}`;
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null && cachedData.length > 0) {
            return cachedData;
        }

        // Buscar taxa atual primeiro
        const currentRate = await fetchExchangeRate();
        
        // Gerar dados históricos simulados com variação aleatória
        const dates = calculateDateRange(period);
        const results = dates.map(date => {
            const randomVariation = (Math.random() - 0.5) * 0.02; // Variação de ±1%
            return {
                date,
                rate: currentRate.rate * (1 + randomVariation)
            };
        });

        results.sort((a, b) => new Date(a.date) - new Date(b.date));
        cache.set(cacheKey, results);

        return results;
    } catch (error) {
        console.error('Erro ao buscar taxas históricas:', error);
        showError('Erro ao buscar dados históricos. Tentando novamente em 5 segundos...');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
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