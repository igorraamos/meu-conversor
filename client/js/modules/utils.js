/**
 * Constantes para configuração
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
    ANIMATION_DURATION: 300
};

/**
 * Formata um número para o formato brasileiro de moeda
 * @param {number} value - Valor a ser formatado
 * @param {string} [currency=''] - Código da moeda (opcional)
 * @returns {string} Valor formatado
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
 * Converte uma string formatada em número
 * @param {string} value - Valor formatado
 * @returns {number} Valor numérico
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
 * Exibe uma mensagem de erro com animação
 * @param {string} message - Mensagem de erro
 * @param {string} [type='error'] - Tipo de mensagem ('error', 'warning', 'success')
 */
export function showError(message, type = 'error') {
    const errorContainer = document.getElementById("error-container");
    if (!errorContainer) return;

    // Remove mensagem anterior se existir
    if (errorContainer.style.display === "block") {
        clearTimeout(errorContainer.timeoutId);
    }

    // Define classe baseada no tipo
    errorContainer.className = `message-container ${type}`;
    errorContainer.textContent = message;

    // Aplica animação
    errorContainer.style.opacity = "0";
    errorContainer.style.display = "block";
    
    requestAnimationFrame(() => {
        errorContainer.style.transition = `opacity ${CONFIG.ANIMATION_DURATION}ms ease-in-out`;
        errorContainer.style.opacity = "1";
    });

    // Configura timeout para remover
    errorContainer.timeoutId = setTimeout(() => {
        errorContainer.style.opacity = "0";
        setTimeout(() => {
            errorContainer.style.display = "none";
        }, CONFIG.ANIMATION_DURATION);
    }, CONFIG.ERROR_DISPLAY_TIME);
}

/**
 * Atualiza o horário local
 */
export function updateLocalTime() {
    const localTimeElement = document.getElementById("local-time-value");
    if (!localTimeElement) return;

    try {
        const now = new Date();
        localTimeElement.textContent = now.toLocaleString("pt-BR", CONFIG.DATE_FORMAT_OPTIONS);
    } catch (error) {
        console.warn('Erro ao atualizar horário:', error);
    }
}

/**
 * Inicializa o relógio local
 * @returns {number} ID do intervalo para possível limpeza
 */
export function initializeLocalTime() {
    updateLocalTime();
    return setInterval(updateLocalTime, 1000);
}

/**
 * Cria uma versão debounced de uma função
 * @param {Function} func - Função a ser debounced
 * @param {number} wait - Tempo de espera em millisegundos
 * @returns {Function} Função debounced
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
 * Formata uma data para o formato brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @param {boolean} [includeTime=false] - Incluir horário
 * @returns {string} Data formatada
 */
export function formatDate(date, includeTime = false) {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            ...(includeTime && {
                hour: '2-digit',
                minute: '2-digit'
            })
        });
    } catch (error) {
        console.warn('Erro ao formatar data:', error);
        return '';
    }
}

/**
 * Calcula a diferença percentual entre dois valores
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 * @returns {string} Variação formatada com sinal
 */
export function calculateVariation(current, previous) {
    if (!previous || !current) return '0,00%';
    
    const variation = ((current - previous) / previous) * 100;
    const sign = variation > 0 ? '+' : '';
    return `${sign}${formatNumber(variation)}%`;
}

/**
 * Valida um valor monetário
 * @param {string|number} value - Valor a ser validado
 * @returns {boolean} Verdadeiro se válido
 */
export function isValidMoneyValue(value) {
    if (typeof value === 'number') {
        return !isNaN(value) && isFinite(value) && value >= 0;
    }
    return /^[\d.,]*$/.test(value);
}

// Exporta configurações para uso em outros módulos
export const utilsConfig = { ...CONFIG };