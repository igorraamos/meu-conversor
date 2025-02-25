// Importações usando ES modules
import { fetchExchangeRate, getHistoricalRates } from './api.js';
import { formatCurrency, formatDate, showError } from './utils.js';

// Cache do DOM
const elements = {
    usdInput: document.getElementById('usd-input'),
    brlInput: document.getElementById('brl-input'),
    currentDollarValue: document.getElementById('current-dollar-value'),
    chartButtons: document.querySelectorAll('.chart-buttons button'),
    localTimeValue: document.getElementById('local-time-value'),
    themeToggle: document.getElementById('toggle-theme'),
    chart: document.getElementById('chart'),
    variationElement: document.querySelector('.variacao')
};

// Estado da aplicação
const state = {
    currentRate: 0,
    chart: null,
    updateInterval: null
};

// Função para debounce de inputs
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Funções de UI
function updateLocalTime() {
    if (!elements.localTimeValue) return;
    const now = new Date();
    elements.localTimeValue.textContent = formatDate(now);
}

function updateDollarValue(rate, previousRate) {
    if (!elements.currentDollarValue || !elements.variationElement) return;
    
    elements.currentDollarValue.textContent = formatCurrency(rate, 'BRL').replace('R$ ', '');
    
    if (previousRate) {
        const variation = ((rate - previousRate) / previousRate) * 100;
        elements.variationElement.textContent = `(${variation >= 0 ? '+' : ''}${variation.toFixed(2)}% em relação a ontem)`;
        elements.variationElement.className = `variacao ${variation >= 0 ? 'positive' : 'negative'}`;
    }
}

// Funções do gráfico
function initChart() {
    if (!elements.chart) return;
    
    const ctx = elements.chart.getContext('2d');
    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Cotação do Dólar',
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#2ecc71',
                tension: 0.4,
                data: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => `R$ ${context.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: { day: 'dd/MM' }
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(0, 0, 0, 0.1)' }
                }
            }
        }
    });
}

async function updateChart(period) {
    try {
        const data = await getHistoricalRates(period);
        if (!data?.length) throw new Error('Dados históricos não disponíveis');

        const chartData = data.map(item => ({
            x: new Date(item.date),
            y: item.rate
        }));

        if (state.chart) {
            state.chart.data.datasets[0].data = chartData;
            state.chart.update('show');
        }

        updateVariations(data);
    } catch (error) {
        console.error('Erro ao atualizar gráfico:', error);
        showError('Erro ao carregar dados históricos');
    }
}

function updateVariations(data) {
    if (!data?.length || data.length < 2) return;

    elements.chartButtons?.forEach(button => {
        const period = button.dataset.period;
        const periodData = filterDataByPeriod(data, period);
        
        if (periodData.length >= 2) {
            const firstRate = periodData[0].rate;
            const lastRate = periodData[periodData.length - 1].rate;
            const variation = ((lastRate - firstRate) / firstRate) * 100;
            
            const variationSpan = button.querySelector('.variation');
            if (variationSpan) {
                variationSpan.textContent = `${variation >= 0 ? '+' : ''}${variation.toFixed(2)}%`;
                variationSpan.className = `variation ${variation >= 0 ? 'positive' : 'negative'}`;
            }
        }
    });
}

function filterDataByPeriod(data, period) {
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
        case '7d': startDate.setDate(now.getDate() - 7); break;
        case '1m': startDate.setMonth(now.getMonth() - 1); break;
        case '6m': startDate.setMonth(now.getMonth() - 6); break;
        case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
    }
    
    return data.filter(item => new Date(item.date) >= startDate);
}

// Funções de conversão
function convertValues(value, fromUSD = true) {
    if (!value) return '';
    
    const numericValue = parseFloat(value.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (isNaN(numericValue)) return '';
    
    return fromUSD ? 
        formatCurrency(numericValue * state.currentRate, 'BRL') :
        formatCurrency(numericValue / state.currentRate, 'USD');
}

// Event Listeners com debounce
function setupEventListeners() {
    const handleUSDInput = debounce((e) => {
        elements.brlInput.value = convertValues(e.target.value, true);
    }, 300);

    const handleBRLInput = debounce((e) => {
        elements.usdInput.value = convertValues(e.target.value, false);
    }, 300);

    elements.usdInput?.addEventListener('input', handleUSDInput);
    elements.brlInput?.addEventListener('input', handleBRLInput);

    elements.chartButtons?.forEach(button => {
        button.addEventListener('click', () => {
            elements.chartButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateChart(button.dataset.period);
        });
    });

    elements.themeToggle?.addEventListener('click', () => {
        const body = document.body;
        const newTheme = body.dataset.theme === 'light' ? 'dark' : 'light';
        body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
    });
}

// Atualização automática com retry
async function setupAutoUpdate() {
    const updateRate = async (retryCount = 0) => {
        try {
            const data = await fetchExchangeRate();
            if (data.rate !== state.currentRate) {
                state.currentRate = data.rate;
                updateDollarValue(data.rate, data.previousRate);

                if (elements.usdInput.value) {
                    elements.brlInput.value = convertValues(elements.usdInput.value, true);
                } else if (elements.brlInput.value) {
                    elements.usdInput.value = convertValues(elements.brlInput.value, false);
                }
            }
        } catch (error) {
            console.error('Erro na atualização:', error);
            if (retryCount < 3) {
                setTimeout(() => updateRate(retryCount + 1), 5000);
            }
        }
    };

    if (state.updateInterval) {
        clearInterval(state.updateInterval);
    }

    // Primeira atualização
    await updateRate();

    // Atualizações subsequentes
    state.updateInterval = setInterval(updateRate, 30000);
}

// Inicialização
async function init() {
    try {
        // Tema
        document.body.dataset.theme = localStorage.getItem('theme') || 'light';

        // Componentes
        initChart();
        setupEventListeners();
        
        // Hora local
        updateLocalTime();
        setInterval(updateLocalTime, 1000);

        // Dados iniciais
        const data = await fetchExchangeRate();
        state.currentRate = data.rate;
        updateDollarValue(data.rate, data.previousRate);

        // Gráfico inicial
        const activeButton = document.querySelector('.chart-buttons button.active');
        if (activeButton) {
            await updateChart(activeButton.dataset.period);
        }

        // Atualizações automáticas
        await setupAutoUpdate();

    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao carregar dados iniciais');
    }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);

// Exportações
export const converter = {
    updateChart,
    convertValues,
    updateLocalTime
};