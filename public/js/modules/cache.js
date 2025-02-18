/**
 * Constantes para configuração do cache
 */
const CACHE_KEY = "exchangeRateCache";
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutos em milissegundos

/**
 * Salva a taxa de câmbio no cache local
 * @param {number} rate - A taxa de câmbio para ser armazenada
 */
export function cacheExchangeRate(rate) {
    try {
        const timestamp = Date.now();
        const data = { rate, timestamp };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Não foi possível salvar no cache:', e);
        // Modo anônimo ou localStorage não disponível
    }
}

/**
 * Recupera a taxa de câmbio do cache se ainda for válida
 * @returns {number|null} A taxa de câmbio em cache ou null se não houver cache válido
 */
export function getCachedExchangeRate() {
    try {
        const cachedData = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cachedData) {
            const now = Date.now();
            if (now - cachedData.timestamp < CACHE_DURATION) {
                return cachedData.rate;
            } else {
                // Cache expirado, remove
                localStorage.removeItem(CACHE_KEY);
            }
        }
    } catch (e) {
        console.warn('Erro ao ler cache:', e);
        // Erro ao ler cache ou parse JSON
    }
    return null;
}

/**
 * Limpa o cache de taxas de câmbio
 */
export function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (e) {
        console.warn('Erro ao limpar cache:', e);
    }
}

/**
 * Verifica se há um cache válido
 * @returns {boolean} true se houver cache válido, false caso contrário
 */
export function hasCachedRate() {
    return getCachedExchangeRate() !== null;
}