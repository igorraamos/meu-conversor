import { getHistoricalRates } from './api.js';

let chart;

const CHART_CONFIG = {
    colors: {
        primary: '#5cb85c',
        background: 'rgba(92, 184, 92, 0.2)',
        tooltipBg: 'rgba(51, 51, 51, 0.8)',
        textColor: '#5a5a5a'
    }
};

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: CHART_CONFIG.colors.tooltipBg,
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 6,
                padding: 10,
                displayColors: false,
                callbacks: {
                    label: function(context) {
                        const value = context.raw.toFixed(2).replace('.', ',');
                        return `R$ ${value}`;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                    displayFormats: {
                        day: 'dd/MM'
                    }
                },
                ticks: {
                    source: 'auto',
                    maxRotation: 0
                }
            },
            y: {
                beginAtZero: false,
                ticks: {
                    callback: value => `R$ ${value.toFixed(2).replace('.', ',')}`
                }
            }
        }
    };
}

export async function renderChart(period = '7d') {
    try {
        const ctx = document.getElementById('chart').getContext('2d');
        
        if (chart) {
            chart.destroy();
        }

        const data = await getHistoricalRates(period);
        
        if (!data || data.length < 2) {
            throw new Error('Dados insuficientes para renderizar o gráfico');
        }

        const chartData = {
            labels: data.map(item => item.date),
            datasets: [{
                data: data.map(item => item.rate),
                borderColor: CHART_CONFIG.colors.primary,
                backgroundColor: CHART_CONFIG.colors.background,
                fill: true,
                tension: 0.1
            }]
        };

        chart = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: getChartOptions()
        });

        // Calcular e exibir a variação
        const startRate = data[0].rate;
        const endRate = data[data.length - 1].rate;
        const variation = ((endRate - startRate) / startRate) * 100;
        
        const variationSpan = document.querySelector(`button[data-period="${period}"] .variation`);
        if (variationSpan) {
            variationSpan.textContent = `${variation.toFixed(2)}%`;
            variationSpan.classList.toggle('positive', variation >= 0);
            variationSpan.classList.toggle('negative', variation < 0);
        }

    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = 'Erro ao carregar o gráfico. Tente novamente mais tarde.';
            errorContainer.style.display = 'block';
        }
    }
}