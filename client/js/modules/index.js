import { fetchExchangeRate } from './api.js';
import { renderChart } from './chart.js';
import { preencherTabelaValores } from './table.js';
import { initTheme } from './theme.js';
import { 
    formatNumber, 
    unformatNumber, 
    showError, 
    updateLocalTime,
    debounce 
} from './utils.js';

// Constantes
const UPDATE_INTERVAL = 30 * 1000; // 30 segundos
const INITIAL_USD_VALUE = "1,00";
const DEFAULT_CHART_PERIOD = '7d';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const BATCH_DELAY = 1000; // Delay entre lotes de requisições

// Cache de elementos DOM
const elements = {
    usdInput: document.getElementById("usd-input"),
    brlInput: document.getElementById("brl-input"),
    currentDollarValue: document.getElementById("current-dollar-value"),
    dollarVariation: document.querySelector(".dolar-valor-hoje .variacao"),
    chartButtons: document.querySelectorAll('.chart-buttons button'),
    lastUpdate: document.getElementById("last-update")
};

// Estado da aplicação
const state = {
    lastRate: null,
    previousRate: null,
    isInitialized: false,
    updateInterval: null,
    retryCount: 0,
    lastUpdateTime: null,
    isUpdating: false
};

/**
 * Calcula a variação percentual entre duas taxas
 */
function calculateVariation(currentRate, previousRate) {
    if (!previousRate || !currentRate) return 0;
    return ((currentRate - previousRate) / previousRate) * 100;
}

/**
 * Atualiza as informações do dólar na interface
 */
function updateDollarInfo(rate, variation) {
    if (!elements.currentDollarValue || !elements.dollarVariation) return;

    try {
        // Verificar se rate é um número válido
        if (typeof rate !== 'number' || isNaN(rate)) {
            console.error('Taxa inválida:', rate);
            return;
        }

        // Atualizar valor atual do dólar
        elements.currentDollarValue.textContent = rate.toFixed(2).replace('.', ',');
        
        // Atualizar variação
        if (typeof variation === 'number' && !isNaN(variation)) {
            const isPositive = variation >= 0;
            const absVariation = Math.abs(variation).toFixed(2).replace('.', ',');
            
            elements.dollarVariation.className = `variacao ${isPositive ? 'positive' : 'negative'}`;
            elements.dollarVariation.innerHTML = `
                <span class="arrow">${isPositive ? '▲' : '▼'}</span>
                ${isPositive ? '+' : '-'}${absVariation}%
                <span class="variation-info">em relação a ontem</span>
            `;
        }

        // Atualizar horário
        if (elements.lastUpdate) {
            const now = new Date();
            state.lastUpdateTime = now;
            elements.lastUpdate.textContent = now.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch (error) {
        console.error('Erro ao atualizar informações:', error);
    }
}

/**
 * Tenta executar uma operação com retry
 */
async function withRetry(operation, maxRetries = MAX_RETRIES) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
            }
        }
    }
    
    throw lastError;
}

/**
 * Atualiza os valores de conversão
 */
async function updateConversion(fromUSD = true) {
    if (state.isUpdating) return;
    state.isUpdating = true;

    try {
        const data = await withRetry(() => fetchExchangeRate());
        
        if (!data || typeof data.rate !== 'number') {
            throw new Error('Taxa de câmbio inválida');
        }

        const rate = data.rate;
        const previousRate = data.previousRate || state.lastRate;

        // Atualizar histórico de taxas
        if (state.lastRate !== rate) {
            state.previousRate = state.lastRate;
            state.lastRate = rate;
        }

        // Calcular e atualizar variação
        const variation = calculateVariation(rate, previousRate);
        updateDollarInfo(rate, variation);

        // Realizar conversão
        if (fromUSD && elements.usdInput && elements.brlInput) {
            const usdValue = unformatNumber(elements.usdInput.value || INITIAL_USD_VALUE);
            const brlValue = usdValue * rate;
            elements.brlInput.value = formatNumber(brlValue);
        } else if (!fromUSD && elements.usdInput && elements.brlInput) {
            const brlValue = unformatNumber(elements.brlInput.value);
            const usdValue = brlValue / rate;
            elements.usdInput.value = formatNumber(usdValue);
        }

        state.retryCount = 0;
        return rate;
    } catch (error) {
        console.error("Erro ao converter valor:", error);
        showError("Erro ao converter valor. Tentando novamente...");
        
        if (++state.retryCount >= MAX_RETRIES) {
            showError("Não foi possível atualizar os valores. Tente novamente mais tarde.");
            state.retryCount = 0;
        }
        return null;
    } finally {
        state.isUpdating = false;
    }
}

/**
 * Configura os eventos de input para os campos de valor
 */
function setupInputHandler(input, isUSD) {
    if (!input) return;

    const debouncedUpdate = debounce(() => updateConversion(isUSD), 300);

    input.addEventListener("input", (event) => {
        const value = event.target.value;
        if (!/^[\d.,]*$/.test(value)) {
            event.target.value = value.replace(/[^\d.,]/g, '');
            return;
        }
        debouncedUpdate();
    });

    input.addEventListener("focus", () => input.select());
    
    input.addEventListener("blur", () => {
        const currentValue = unformatNumber(input.value);
        input.value = formatNumber(currentValue);
    });
}

/**
 * Inicializa o conversor de moedas
 */
function initializeConversor() {
    setupInputHandler(elements.usdInput, true);
    setupInputHandler(elements.brlInput, false);
}

/**
 * Inicializa os botões do gráfico
 */
function initializeChartButtons() {
    elements.chartButtons?.forEach(button => {
        button.addEventListener('click', async () => {
            if (state.isUpdating) return;

            const period = button.dataset.period;
            elements.chartButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');

            try {
                await renderChart(period);
            } catch (error) {
                console.error('Erro ao atualizar gráfico:', error);
                showError('Erro ao atualizar gráfico. Tente novamente.');
            }
        });
    });
}

/**
 * Atualiza os dados periodicamente
 */
async function startPeriodicUpdates() {
    if (state.updateInterval) {
        clearInterval(state.updateInterval);
    }

    async function updateAll() {
        if (state.isUpdating) return;
        state.isUpdating = true;

        try {
            await updateConversion(true);
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            
            await preencherTabelaValores();
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            
            const activeButton = document.querySelector('.chart-buttons button.active');
            if (activeButton) {
                await renderChart(activeButton.dataset.period);
            }
        } catch (error) {
            console.error('Erro na atualização automática:', error);
        } finally {
            state.isUpdating = false;
        }
    }

    await updateAll();
    state.updateInterval = setInterval(updateAll, UPDATE_INTERVAL);
}

/**
 * Inicializa a aplicação
 */
async function initialize() {
    if (state.isInitialized) return;

    try {
        console.log('Inicializando aplicação...');
        
        initTheme();
        initializeConversor();
        initializeChartButtons();
        
        if (elements.usdInput) {
            elements.usdInput.value = INITIAL_USD_VALUE;
        }

        await updateConversion(true);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        
        await renderChart(DEFAULT_CHART_PERIOD);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        
        await preencherTabelaValores();
        
        updateLocalTime();
        setInterval(updateLocalTime, 1000);
        await startPeriodicUpdates();
        
        state.isInitialized = true;
        console.log('Aplicação inicializada com sucesso');
    } catch (error) {
        console.error('Erro durante a inicialização:', error);
        showError('Erro ao inicializar a aplicação. Tente recarregar a página.');
        state.isInitialized = false;
    }
}

// Inicialização e event listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Gerenciamento de visibilidade e limpeza
window.addEventListener('beforeunload', () => {
    if (state.updateInterval) {
        clearInterval(state.updateInterval);
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (state.updateInterval) {
            clearInterval(state.updateInterval);
        }
    } else {
        startPeriodicUpdates();
    }
});

export {
    updateConversion,
    renderChart,
    preencherTabelaValores
};