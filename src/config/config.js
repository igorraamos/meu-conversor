export const CONFIG = {
    API: {
        BASE_URL: 'https://openexchangerates.org/api',
        APP_ID: '4ab3649fb75f46199ec65df7692a4b70',
        BASE_CURRENCY: 'USD',
        TARGET_CURRENCY: 'BRL'
    },
    CACHE: {
        KEY: "exchangeRateCache",
        DURATION: 60 * 60 * 1000, // 1 hora em ms
        HISTORICAL_KEY: "historicalRatesCache"
    },
    VALORES_TABELA: [1, 2, 5, 10, 25, 50, 100, 1000],
    PERIODOS: {
        "7d": { days: 7, label: "7 dias" },
        "1m": { months: 1, label: "1 mês" },
        "6m": { months: 6, label: "6 meses" },
        "1y": { years: 1, label: "1 ano" }
    },
    FORMATACAO: {
        USD: {
            locale: 'en-US',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        },
        BRL: {
            locale: 'pt-BR',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    },
    CHART: {
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        tension: 0.1
    }
};

// Configurações para modo dark/light
export const THEME = {
    LIGHT: {
        backgroundColor: '#ffffff',
        textColor: '#333333',
        borderColor: '#dddddd',
        chartGrid: '#f0f0f0'
    },
    DARK: {
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        borderColor: '#333333',
        chartGrid: '#333333'
    }
};

// Mensagens de erro
export const ERROR_MESSAGES = {
    API_FETCH: 'Erro ao buscar dados da API. Tente novamente mais tarde.',
    INVALID_INPUT: 'Por favor, insira um valor válido.',
    CACHE_ERROR: 'Erro ao acessar o cache.',
    NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
    RATE_LIMIT: 'Limite de requisições atingido. Tente novamente em alguns minutos.'
};