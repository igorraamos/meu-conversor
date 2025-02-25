import { showError } from './utils.js';

// Configurações
const CONFIG = {
    isProduction: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    baseUrl: '/api',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
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
                headers: {
                    ...CONFIG.headers,
                    ...options.headers
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    await new Promise(resolve => 
                        setTimeout(resolve, (retryAfter ? parseInt(retryAfter) * 1000 : CONFIG.retryDelay))
                    );
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
 * @returns {Promise<{rate: number, previousRate: number}>}
 */
export async function fetchExchangeRate() {
    const cacheKey = 'current_rate';
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null) {
            return cachedData;
        }

        const data = await fetchWithRetry(`${CONFIG.baseUrl}/exchange-rate`);
        
        if (!data || !data.rates || typeof data.rates.BRL !== 'number') {
            throw new Error('Formato de resposta inválido');
        }

        const exchangeData = {
            rate: data.rates.BRL,
            previousRate: data.previousRate || null
        };

        cache.set(cacheKey, exchangeData);
        return exchangeData;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        showError('Erro ao buscar cotação atual. Tentando novamente em 5 segundos...');
        
        // Tentar novamente após 5 segundos
        await new Promise(resolve => setTimeout(resolve, 5000));
        return fetchExchangeRate();
    }
}

/**
 * Busca taxas históricas em lotes
 */
async function fetchHistoricalBatch(dates) {
    const results = [];
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    for (let i = 0; i < dates.length; i += CONFIG.batchSize) {
        const batch = dates.slice(i, i + CONFIG.batchSize);
        const batchPromises = batch.map(async date => {
            try {
                const data = await fetchWithRetry(`${CONFIG.baseUrl}/historical/${date}`);

                if (!data || !data.rates || typeof data.rates.BRL !== 'number') {
                    console.warn(`Dados inválidos para ${date}`);
                    return null;
                }

                consecutiveErrors = 0; // Resetar contador de erros em caso de sucesso
                return {
                    date,
                    rate: data.rates.BRL
                };
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
 * Busca taxas de câmbio históricas
 */
export async function getHistoricalRates(period) {
    const cacheKey = `historical_${period}`;
    
    try {
        const cachedData = cache.get(cacheKey);
        if (cachedData !== null && cachedData.length > 0) {
            return cachedData;
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