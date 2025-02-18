export const CONFIG = {
    API_KEY: '8a3876236c714b78aea04625340db76d',
    API_URL: 'https://openexchangerates.org/api',
    CACHE_DURATION: 60 * 60 * 1000, // 1 hora
    DEFAULT_CURRENCY: 'USD',
    TARGET_CURRENCY: 'BRL'
};

export const THEME = {
    LIGHT: {
        chartGrid: 'rgba(0, 0, 0, 0.1)',
        chartText: '#666',
        background: '#fff',
        line: '#4CAF50'
    },
    DARK: {
        chartGrid: 'rgba(255, 255, 255, 0.1)',
        chartText: '#ccc',
        background: '#333',
        line: '#45a049'
    }
};

export const ERROR_MESSAGES = {
    API_FETCH: 'Erro ao buscar dados da API. Tente novamente mais tarde.',
    CONVERSION: 'Erro ao converter valores. Verifique sua conexão.',
    GENERAL: 'Ocorreu um erro. Tente novamente.',
    RATE_UNAVAILABLE: 'Taxa de câmbio indisponível no momento.'
};