const API_BASE_URL = 'https://openexchangerates.org/api';
const APP_ID = '4ab3649fb75f46199ec65df7692a4b70';

export async function fetchExchangeRate() {
    try {
        const response = await fetch(`${API_BASE_URL}/latest.json?app_id=${APP_ID}`);
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        return data.rates.BRL;
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return null;
    }
}

export async function fetchHistoricalRate(date) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/historical/${date}.json?app_id=${APP_ID}`
        );
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data = await response.json();
        return data.rates?.BRL;
    } catch (error) {
        console.error('Error fetching historical rate:', error);
        return null;
    }
}

// Função auxiliar para verificar status da API
export async function checkApiStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/usage.json?app_id=${APP_ID}`);
        return response.ok;
    } catch {
        return false;
    }
}

// Função para obter taxa de câmbio com cache
export async function getExchangeRate() {
    try {
        // Tenta primeiro obter do cache
        const cachedRate = getCachedExchangeRate();
        if (cachedRate) {
            return cachedRate;
        }

        // Se não estiver no cache, busca da API
        const rate = await fetchExchangeRate();
        if (rate) {
            cacheExchangeRate(rate);
            return rate;
        }
        throw new Error('Failed to fetch exchange rate');
    } catch (error) {
        console.error('Error getting exchange rate:', error);
        return null;
    }
}