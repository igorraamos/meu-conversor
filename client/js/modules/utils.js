/**
 * Configurações globais
 */
const CONFIG = {
    ERROR_DISPLAY_TIME: 5000,
    DATE_FORMAT_OPTIONS: {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    },
    NUMBER_FORMAT_OPTIONS: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    },
    CURRENCY_FORMAT_OPTIONS: {
        BRL: {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        },
        USD: {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    },
    ANIMATION_DURATION: 300
};

/**
 * Formata um número para moeda
 * @param {number} value - Valor a ser formatado
 * @param {string} [currency=''] - Código da moeda (BRL ou USD)
 * @returns {string} Valor formatado
 */
export function formatCurrency(value, currency = '') {
    if (typeof value !== 'number' || isNaN(value)) return currency === 'BRL' ? 'R$ 0,00' : '$ 0.00';
    
    try {
        if (!currency) {
            return value.toLocaleString('pt-BR', CONFIG.NUMBER_FORMAT_OPTIONS);
        }

        return new Intl.NumberFormat('pt-BR', CONFIG.CURRENCY_FORMAT_OPTIONS[currency])
            .format(value);
    } catch (error) {
        console.warn('Erro ao formatar moeda:', error);
        return currency === 'BRL' ? 'R$ 0,00' : '$ 0.00';
    }
}

/**
 * Formata um número sem símbolo de moeda
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export function formatNumber(value) {
    if (typeof value !== 'number' || isNaN(value)) return "0,00";
    
    try {
        return value.toLocaleString('pt-BR', CONFIG.NUMBER_FORMAT_OPTIONS);
    } catch (error) {
        console.warn('Erro ao formatar número:', error);
        return "0,00";
    }
}

/**
 * Converte string formatada em número
 * @param {string} value - Valor formatado
 * @returns {number} Valor numérico
 */
export function unformatNumber(value) {
    if (!value) return 0;
    try {
        const cleaned = value.toString()
            .replace(/[^\d,.-]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
        return parseFloat(cleaned) || 0;
    } catch (error) {
        console.warn('Erro ao converter número:', error);
        return 0;
    }
}

/**
 * Exibe mensagem de feedback com animação
 * @param {string} message - Mensagem a ser exibida
 * @param {string} [type='error'] - Tipo de mensagem ('error', 'warning', 'success')
 */
export function showError(message, type = 'error') {
    const container = document.getElementById("error-container");
    if (!container) return;

    // Limpa mensagem anterior
    if (container.style.display === "block") {
        clearTimeout(container.timeoutId);
    }

    // Configura nova mensagem
    container.className = `message-container ${type}`;
    container.textContent = message;
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');

    // Anima entrada
    container.style.opacity = "0";
    container.style.display = "block";
    
    requestAnimationFrame(() => {
        container.style.transition = `opacity ${CONFIG.ANIMATION_DURATION}ms ease-in-out`;
        container.style.opacity = "1";
    });

    // Configura saída
    container.timeoutId = setTimeout(() => {
        container.style.opacity = "0";
        setTimeout(() => {
            container.style.display = "none";
        }, CONFIG.ANIMATION_DURATION);
    }, CONFIG.ERROR_DISPLAY_TIME);
}

/**
 * Formata data para o formato brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @param {boolean} [includeTime=true] - Incluir horário
 * @returns {string} Data formatada
 */
export function formatDate(date, includeTime = true) {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const options = {
            day: '2-digit',
            month: includeTime ? 'long' : '2-digit',
            year: 'numeric',
            ...(includeTime && {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };
        return dateObj.toLocaleString('pt-BR', options);
    } catch (error) {
        console.warn('Erro ao formatar data:', error);
        return '';
    }
}

/**
 * Atualiza o horário local na interface
 */
export function updateLocalTime() {
    const element = document.getElementById("local-time-value");
    if (!element) return;

    try {
        const now = new Date();
        element.textContent = formatDate(now);
    } catch (error) {
        console.warn('Erro ao atualizar horário:', error);
    }
}

/**
 * Calcula variação percentual entre valores
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 * @returns {string} Variação formatada
 */
export function calculateVariation(current, previous) {
    if (!previous || !current) return '0,00%';
    
    const variation = ((current - previous) / previous) * 100;
    const sign = variation >= 0 ? '+' : '';
    return `${sign}${formatNumber(variation)}%`;
}

/**
 * Cria função com debounce
 * @param {Function} func - Função a ser debounced
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Valida valor monetário
 * @param {string|number} value - Valor a ser validado
 * @returns {boolean} Verdadeiro se válido
 */
export function isValidMoneyValue(value) {
    if (typeof value === 'number') {
        return !isNaN(value) && isFinite(value) && value >= 0;
    }
    return /^[\d.,]*$/.test(value);
}

// Configurações públicas
export const utilsConfig = { ...CONFIG };