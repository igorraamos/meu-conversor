// Configurações
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
    ANIMATION_DURATION: 300
};

/**
 * Formata um valor monetário
 * @param {number} value - Valor a ser formatado
 * @param {string} currency - Código da moeda (USD ou BRL)
 * @returns {string} Valor formatado
 */
export function formatCurrency(value, currency = 'BRL') {
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency
        }).format(value);
    } catch (error) {
        console.warn('Erro ao formatar moeda:', error);
        return currency === 'BRL' ? 'R$ 0,00' : 'US$ 0.00';
    }
}

/**
 * Formata um número
 * @param {number} value - Valor a ser formatado
 * @param {string} [currency=''] - Código da moeda (opcional)
 */
export function formatNumber(value, currency = '') {
    if (typeof value !== 'number' || isNaN(value)) return "0,00";
    
    try {
        const formatted = value.toLocaleString('pt-BR', {
            ...CONFIG.NUMBER_FORMAT_OPTIONS,
            ...(currency && {
                style: 'currency',
                currency: currency
            })
        });
        
        return currency ? formatted : formatted.replace(/^R\$\s?/, '');
    } catch (error) {
        console.warn('Erro ao formatar número:', error);
        return "0,00";
    }
}

/**
 * Converte string formatada em número
 * @param {string} value - Valor formatado
 */
export function unformatNumber(value) {
    if (!value) return 0;
    try {
        return parseFloat(value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    } catch (error) {
        console.warn('Erro ao converter número:', error);
        return 0;
    }
}

/**
 * Exibe mensagem de erro
 * @param {string} message - Mensagem de erro
 * @param {string} [type='error'] - Tipo de mensagem
 */
export function showError(message, type = 'error') {
    const errorContainer = document.getElementById("error-container");
    if (!errorContainer) return;

    if (errorContainer.style.display === "block") {
        clearTimeout(errorContainer.timeoutId);
    }

    errorContainer.className = `message-container ${type}`;
    errorContainer.textContent = message;

    errorContainer.style.opacity = "0";
    errorContainer.style.display = "block";
    
    requestAnimationFrame(() => {
        errorContainer.style.transition = `opacity ${CONFIG.ANIMATION_DURATION}ms ease-in-out`;
        errorContainer.style.opacity = "1";
    });

    errorContainer.timeoutId = setTimeout(() => {
        errorContainer.style.opacity = "0";
        setTimeout(() => {
            errorContainer.style.display = "none";
        }, CONFIG.ANIMATION_DURATION);
    }, CONFIG.ERROR_DISPLAY_TIME);
}

/**
 * Formata data
 * @param {Date|string} date - Data a ser formatada
 * @param {boolean} [includeTime=true] - Incluir horário
 */
export function formatDate(date, includeTime = true) {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const options = {
            ...CONFIG.DATE_FORMAT_OPTIONS,
            ...(includeTime ? {} : {
                hour: undefined,
                minute: undefined,
                second: undefined
            })
        };
        return dateObj.toLocaleString('pt-BR', options);
    } catch (error) {
        console.warn('Erro ao formatar data:', error);
        return '';
    }
}

/**
 * Atualiza o horário local
 */
export function updateLocalTime() {
    const localTimeElement = document.getElementById("local-time-value");
    if (!localTimeElement) return;

    try {
        const now = new Date();
        localTimeElement.textContent = formatDate(now);
    } catch (error) {
        console.warn('Erro ao atualizar horário:', error);
    }
}

/**
 * Calcula variação percentual
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 */
export function calculateVariation(current, previous) {
    if (!previous || !current) return '0,00%';
    
    const variation = ((current - previous) / previous) * 100;
    const sign = variation > 0 ? '+' : '';
    return `${sign}${formatNumber(variation)}%`;
}

/**
 * Valida valor monetário
 * @param {string|number} value - Valor a ser validado
 */
export function isValidMoneyValue(value) {
    if (typeof value === 'number') {
        return !isNaN(value) && isFinite(value) && value >= 0;
    }
    return /^[\d.,]*$/.test(value);
}

/**
 * Cria função com debounce
 * @param {Function} func - Função a ser debounced
 * @param {number} wait - Tempo de espera em ms
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
 * Inicializa relógio local
 */
export function initializeLocalTime() {
    updateLocalTime();
    return setInterval(updateLocalTime, 1000);
}

// Exporta configurações
export const utilsConfig = { ...CONFIG };

// Exporta todas as funções em um objeto
export default {
    formatCurrency,
    formatNumber,
    unformatNumber,
    showError,
    formatDate,
    updateLocalTime,
    calculateVariation,
    isValidMoneyValue,
    debounce,
    initializeLocalTime,
    utilsConfig
};