import { getHistoricalRates } from './api.js';
import { isDarkTheme } from './theme.js';
import { showError } from './utils.js';

let chart = null;
let isChartLoading = false;
const loadingIndicator = document.getElementById('chart-loading');
const variationsCache = new Map();

function toggleLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
}

function calculateDailyVariation(currentRate, previousRate) {
    return ((currentRate - previousRate) / previousRate) * 100;
}

function getChartOptions() {
    const isDark = isDarkTheme();
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: isDark ? 'rgba(32, 32, 32, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: isDark ? '#fff' : '#333',
                bodyColor: isDark ? '#fff' : '#333',
                cornerRadius: 4,
                padding: 10,
                displayColors: false,
                titleFont: {
                    size: 0,
                    weight: 'normal'
                },
                bodyFont: {
                    size: 14,
                    weight: 'bold',
                    family: 'Arial'
                },
                callbacks: {
                    title: () => '',
                    label: (context) => {
                        const date = new Date(context.raw.x);
                        const formattedDate = date.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        const value = context.raw.y;
                        const index = context.dataIndex;
                        const dataset = context.dataset;
                        let variationText = '';

                        if (index > 0 && dataset.data[index - 1]) {
                            const previousValue = dataset.data[index - 1].y;
                            const variation = calculateDailyVariation(value, previousValue);
                            variationText = ` (${variation >= 0 ? '+' : ''}${variation.toFixed(2)}%)`;
                        }

                        return `R$ ${value.toFixed(2).replace('.', ',')} ${formattedDate}${variationText}`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                display: false,
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'dd/MM'
                    }
                },
                grid: {
                    display: false
                },
                border: {
                    display: false
                },
                ticks: {
                    display: false
                }
            },
            y: {
                position: 'left',
                grid: {
                    color: isDark ? '#333' : '#f0f0f0',
                    drawBorder: false,
                    lineWidth: 1
                },
                ticks: {
                    callback: value => `R$ ${value.toFixed(2).replace('.', ',')}`,
                    color: isDark ? '#666' : '#999',
                    font: {
                        size: 11,
                        family: 'Arial'
                    },
                    padding: 8,
                    maxTicksLimit: 6
                },
                border: {
                    display: false
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
            axis: 'x'
        },
        elements: {
            line: {
                tension: 0.1,
                borderWidth: 2,
                borderColor: '#5cb85c',
                backgroundColor: 'rgba(92, 184, 92, 0.1)',
                fill: true,
                stepped: false
            },
            point: {
                radius: 3,
                hitRadius: 10,
                hoverRadius: 5,
                backgroundColor: (context) => {
                    if (!context.raw) return '#5cb85c';
                    const dataIndex = context.dataIndex;
                    const dataset = context.dataset;
                    if (dataIndex === 0) return '#5cb85c';
                    
                    const curr = dataset.data[dataIndex].y;
                    const prev = dataset.data[dataIndex - 1].y;
                    return curr >= prev ? '#5cb85c' : '#d9534f';
                },
                borderColor: '#fff',
                borderWidth: 2
            }
        }
    };
}

async function updateVariation(period, data) {
    const button = document.querySelector(`.chart-buttons button[data-period="${period}"]`);
    if (!button) return;

    const variationSpan = button.querySelector('.variation');
    if (!variationSpan) return;

    try {
        if (!data || data.length < 2) {
            variationSpan.textContent = 'N/A';
            return;
        }

        const startRate = data[0].rate;
        const endRate = data[data.length - 1].rate;
        const variation = ((endRate - startRate) / startRate) * 100;
        
        const formattedVariation = variation.toFixed(2).replace('.', ',');
        variationSpan.textContent = `${variation >= 0 ? '+' : ''}${formattedVariation}%`;
        variationSpan.classList.remove('positive', 'negative', 'loading');
        variationSpan.classList.add(variation >= 0 ? 'positive' : 'negative');
        
        variationsCache.set(period, variation);
    } catch (error) {
        console.error(`Erro ao atualizar variação para ${period}:`, error);
        variationSpan.textContent = 'Erro';
        variationSpan.classList.remove('loading');
    }
}

async function loadAllVariations() {
    const periods = ['7d', '1m', '6m', '1y'];
    
    // Inicializar loading state
    periods.forEach(period => {
        const variationSpan = document.querySelector(`.chart-buttons button[data-period="${period}"] .variation`);
        if (variationSpan) {
            variationSpan.textContent = 'Carregando...';
            variationSpan.classList.add('loading');
        }
    });

    try {
        const results = await Promise.all(
            periods.map(async period => {
                try {
                    const data = await getHistoricalRates(period);
                    await updateVariation(period, data);
                    return { period, data };
                } catch (error) {
                    console.error(`Erro ao carregar variação para ${period}:`, error);
                    return null;
                }
            })
        );

        return results.filter(result => result !== null);
    } catch (error) {
        console.error('Erro ao carregar variações:', error);
        return [];
    }
}

export async function renderChart(period = '1m') {
    if (isChartLoading) return;
    isChartLoading = true;
    toggleLoading(true);

    try {
        const canvas = document.getElementById('chart');
        if (!canvas) {
            throw new Error('Elemento canvas não encontrado');
        }

        if (chart) {
            chart.destroy();
            chart = null;
        }

        const data = await getHistoricalRates(period);
        if (!data || !Array.isArray(data) || data.length < 2) {
            throw new Error('Dados insuficientes para renderizar o gráfico');
        }

        const chartData = {
            datasets: [{
                data: data.map(item => ({
                    x: new Date(item.date),
                    y: item.rate
                })),
                borderColor: '#5cb85c',
                backgroundColor: 'rgba(92, 184, 92, 0.1)',
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointHitRadius: 10,
                pointBorderWidth: 2,
                pointBackgroundColor: '#5cb85c',
                pointBorderColor: '#fff',
                tension: 0.1
            }]
        };

        const ctx = canvas.getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: getChartOptions()
        });

        // Atualizar botões e variações
        document.querySelectorAll('.chart-buttons button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
            btn.setAttribute('aria-pressed', btn.dataset.period === period);
        });

        await updateVariation(period, data);

        toggleLoading(false);
        return chart;
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
        toggleLoading(false);
        showError('Erro ao carregar o gráfico. Tentando novamente...');
        
        setTimeout(() => {
            renderChart(period).catch(console.error);
        }, 3000);
        
        return null;
    } finally {
        isChartLoading = false;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Carregar tudo simultaneamente
        const [chartResult] = await Promise.all([
            renderChart('1m'),
            loadAllVariations()
        ]);

        if (!chartResult) {
            throw new Error('Falha ao carregar o gráfico inicial');
        }

        // Adicionar event listeners aos botões
        document.querySelectorAll('.chart-buttons button').forEach(button => {
            button.addEventListener('click', async () => {
                if (!isChartLoading) {
                    const period = button.dataset.period;
                    await renderChart(period);
                }
            });
        });
    } catch (error) {
        console.error('Erro na inicialização do gráfico:', error);
        showError('Erro ao inicializar o gráfico. Por favor, recarregue a página.');
    }
});

// Atualizar gráfico quando o tema mudar
document.addEventListener('themechange', () => {
    if (chart) {
        chart.options = getChartOptions();
        chart.update('none');
    }
});

// Ajustar tamanho do gráfico quando a janela for redimensionada
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (chart) {
            chart.resize();
        }
    }, 250);
});

// Limpar o gráfico quando a página é fechada
window.addEventListener('beforeunload', () => {
    if (chart) {
        chart.destroy();
        chart = null;
    }
});