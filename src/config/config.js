export const CONFIG = {
    API: {
        BASE_URL: 'https://openexchangerates.org/api',
        ENDPOINTS: {
            LATEST: '/latest.json',
            HISTORICAL: '/historical'
        },
        APP_ID: process.env.EXCHANGE_API_KEY || '',
        BASE_CURRENCY: 'USD',
        SUPPORTED_CURRENCIES: ['USD', 'BRL', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD']
    },
    UPDATE_INTERVAL: 3600000, // 1 hora (limite da API gratuita)
    CHART_PERIODS: {
        '7d': 7,
        '1m': 30,
        '6m': 180,
        '1y': 365
    },
    LOCALE: 'pt-BR',
    CURRENCY_FORMAT: {
        BRL: {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        },
        USD: {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }
    }
};

export const ERROR_MESSAGES = {
    API_ERROR: 'Erro ao buscar dados. Tente novamente mais tarde.',
    RATE_ERROR: 'Erro ao obter taxa de câmbio.',
    INVALID_INPUT: 'Por favor, insira um valor válido.',
    INITIALIZATION_ERROR: 'Erro ao inicializar o aplicativo.',
    QUOTA_EXCEEDED: 'Limite de requisições excedido. Tente novamente mais tarde.'
};