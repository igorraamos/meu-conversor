// Importações
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
    chart: document.getElementById('chart')
};

// Estado da aplicação
const state = {
    currentRate: 0,
    chart: null,
    updateInterval: null,
    lastUpdate: null
};

// Funções de atualização da UI
function updateLocalTime() {
    const now = new Date();
    elements.localTimeValue.textContent = formatDate(now);
}

function updateDollarValue(rate, previousRate) {
    elements.currentDollarValue.textContent = formatCurrency(rate, 'BRL').replace('R$ ', '');
    
    const variationElement = document.querySelector('.variacao');
    if (variationElement && previousRate) {
        const variation = ((rate - previousRate) / previousRate) * 100;
        variationElement.textContent = `(${variation >= 0 ? '+' : ''}${variation.toFixed(2)}% em relação a ontem)`;
        variationElement.className = `variacao ${variation >= 0 ? 'positive' : 'negative'}`;
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
        if (!data || data.length === 0) {
            throw new Error('Dados históricos não disponíveis');
        }

        const chartData = data.map(item => ({
            x: new Date(item.date),
            y: item.rate
        }));

        if (state.chart) {
            state.chart.data.datasets[0].data = chartData;
            state.chart.update();
        }

        updateVariations(data);
    } catch (error) {
        console.error('Erro ao atualizar gráfico:', error);
        showError('Erro ao carregar dados históricos');
    }
}

function updateVariations(data) {
    if (!data || data.length < 2) return;

    elements.chartButtons.forEach(button => {
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

// Event Listeners
function setupEventListeners() {
    // Input de conversão
    elements.usdInput?.addEventListener('input', (e) => {
        elements.brlInput.value = convertValues(e.target.value, true);
    });

    elements.brlInput?.addEventListener('input', (e) => {
        elements.usdInput.value = convertValues(e.target.value, false);
    });

    // Botões do gráfico
    elements.chartButtons?.forEach(button => {
        button.addEventListener('click', () => {
            elements.chartButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateChart(button.dataset.period);
        });
    });

    // Toggle de tema
    elements.themeToggle?.addEventListener('click', () => {
        const body = document.body;
        const currentTheme = body.dataset.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        body.dataset.theme = newTheme;
        localStorage.setItem('theme', newTheme);
    });
}

// Função de atualização automática
async function setupAutoUpdate() {
    // Limpa intervalo anterior se existir
    if (state.updateInterval) {
        clearInterval(state.updateInterval);
    }

    // Configura novo intervalo
    state.updateInterval = setInterval(async () => {
        try {
            const data = await fetchExchangeRate();
            if (data.rate !== state.currentRate) {
                state.currentRate = data.rate;
                updateDollarValue(data.rate, data.previousRate);

                // Atualiza conversões se necessário
                if (elements.usdInput.value) {
                    elements.brlInput.value = convertValues(elements.usdInput.value, true);
                } else if (elements.brlInput.value) {
                    elements.usdInput.value = convertValues(elements.brlInput.value, false);
                }
            }
        } catch (error) {
            console.error('Erro na atualização automática:', error);
        }
    }, 30000); // Atualiza a cada 30 segundos
}

// Inicialização
async function init() {
    try {
        // Inicializa o tema
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = savedTheme;

        // Inicializa componentes
        initChart();
        setupEventListeners();
        
        // Primeira atualização
        updateLocalTime();
        setInterval(updateLocalTime, 1000);

        // Busca dados iniciais
        const data = await fetchExchangeRate();
        state.currentRate = data.rate;
        updateDollarValue(data.rate, data.previousRate);

        // Atualiza gráfico inicial
        const activeButton = document.querySelector('.chart-buttons button.active');
        if (activeButton) {
            await updateChart(activeButton.dataset.period);
        }

        // Configura atualização automática
        await setupAutoUpdate();

    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao carregar dados iniciais');
    }
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);

// Exporta funções necessárias
export {
    updateChart,
    convertValues,
    updateLocalTime
};