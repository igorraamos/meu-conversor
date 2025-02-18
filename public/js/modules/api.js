const API_KEY = '8a3876236c714b78aea04625340db76d';
const BASE_URL = 'https://openexchangerates.org/api';

export async function fetchExchangeRate() {
    try {
        const response = await fetch(`${BASE_URL}/latest.json?app_id=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.rates.BRL;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        throw error;
    }
}

export async function getHistoricalRates(period) {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(period) {
        case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
        case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
        case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
        default: startDate.setDate(startDate.getDate() - 7); // 7d
    }

    const formatDate = (date) => date.toISOString().split('T')[0];

    try {
        const response = await fetch(
            `${BASE_URL}/historical/${formatDate(startDate)}.json?app_id=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Falha ao buscar dados históricos');
        }
        
        const data = await response.json();
        return [{
            date: formatDate(startDate),
            rate: data.rates.BRL
        }, {
            date: formatDate(endDate),
            rate: await fetchExchangeRate()
        }];
    } catch (error) {
        console.error('Erro ao buscar taxas históricas:', error);
        throw error;
    }
}
// Adicione ao final do arquivo api.js
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const CACHE_KEY = 'exchange_rate_cache';

function getCachedRate() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { rate, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
    return rate;
}

function cacheRate(rate) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        rate,
        timestamp: Date.now()
    }));
}

// Modifique a função fetchExchangeRate para usar o cache
export async function fetchExchangeRate() {
    try {
        // Primeiro, tenta pegar do cache
        const cachedRate = getCachedRate();
        if (cachedRate) return cachedRate;

        // Se não estiver no cache, busca da API
        const response = await fetch(`${BASE_URL}/latest.json?app_id=${API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Salva no cache e retorna
        cacheRate(data.rates.BRL);
        return data.rates.BRL;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        throw error;
    }
}