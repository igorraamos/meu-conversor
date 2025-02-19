import { getHistoricalRates } from './api.js';
import { isDarkTheme } from './theme.js';
import { showError } from './utils.js';

let chart = null;

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
                    title: function() {
                        return '';
                    },
                    label: function(context) {
                        const date = new Date(context.parsed.x);
                        const formattedDate = date.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        const value = context.parsed.y;
                        const index = context.dataIndex;
                        const dataset = context.dataset;
                        let variationText = '';

                        if (index > 0 && dataset.data[index - 1]) {
                            const previousValue = dataset.data[index - 1];
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
                display: false, // Alterado para false para remover as datas
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
                    display: false // Garante que as datas não sejam exibidas
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
                    
                    const curr = dataset.data[dataIndex];
                    const prev = dataset.data[dataIndex - 1];
                    return curr >= prev ? '#5cb85c' : '#d9534f';
                },
                borderColor: '#fff',
                borderWidth: 2
            }
        }
    };
}

async function loadAllVariations() {
    const periods = ['7d', '1m', '6m', '1y'];
    
    try {
        for (const period of periods) {
            const data = await getHistoricalRates(period);
            if (!data || data.length < 2) continue;
            
            data.sort((a, b) => new Date(a.date) - new Date(b.date));
            const startRate = data[0].rate;
            const endRate = data[data.length - 1].rate;
            const variation = ((endRate - startRate) / startRate) * 100;
            
            const button = document.querySelector(`.chart-buttons button[data-period="${period}"]`);
            if (button) {
                const variationSpan = button.querySelector('.variation');
                if (variationSpan) {
                    const formattedVariation = variation.toFixed(2).replace('.', ',');
                    variationSpan.textContent = `${variation >= 0 ? '+' : ''}${formattedVariation}%`;
                    variationSpan.classList.remove('positive', 'negative');
                    variationSpan.classList.add(variation >= 0 ? 'positive' : 'negative');
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar variações:', error);
    }
}

export async function renderChart(period = '1m') {
    try {
        const canvas = document.getElementById('chart');
        if (!canvas) {
            throw new Error('Elemento canvas não encontrado');
        }

        const ctx = canvas.getContext('2d');
        
        if (chart) {
            chart.destroy();
            chart = null;
        }

        const data = await getHistoricalRates(period);
        if (!data || !Array.isArray(data) || data.length < 2) {
            throw new Error('Dados insuficientes para renderizar o gráfico');
        }

        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        const chartData = {
            labels: data.map(item => new Date(item.date)),
            datasets: [{
                data: data.map(item => item.rate),
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

        chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: getChartOptions()
        });

        // Atualizar botões e carregar variações
        document.querySelectorAll('.chart-buttons button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });

        // Sempre carregar as variações ao renderizar o gráfico
        await loadAllVariations();

        return chart;

    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
        showError('Erro ao carregar o gráfico. Tente novamente mais tarde.');
        return null;
    }
}

// Inicialização com período de 1 mês
document.addEventListener('DOMContentLoaded', async () => {
    await renderChart('1m');
    await loadAllVariations();
});

// Atualizar gráfico quando o tema mudar
document.addEventListener('themechange', () => {
    if (chart) {
        chart.options = getChartOptions();
        chart.update('none');
    }
});

// Ajustar tamanho do gráfico quando a janela for redimensionada
window.addEventListener('resize', () => {
    if (chart) {
        chart.resize();
    }
});