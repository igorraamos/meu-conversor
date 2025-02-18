import { fetchHistoricalRate } from './api.js';

let chart;

const CHART_CONFIG = {
    colors: {
        primary: '#5cb85c',
        background: 'rgba(92, 184, 92, 0.2)',
        tooltipBg: 'rgba(51, 51, 51, 0.8)',
        textColor: '#5a5a5a'
    },
    periods: {
        '7d': { days: 7, interval: 1 },
        '1m': { days: 30, interval: 1 },
        '6m': { days: 180, interval: 6 },
        '1y': { days: 365, interval: 12 }
    }
};

function getChartOptions() {
    return {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: CHART_CONFIG.colors.tooltipBg,
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 6,
                padding: { top: 6, right: 10, bottom: 6, left: 10 },
                displayColors: false,
                callbacks: {
                    label: function (tooltipItem) {
                        const value = `R$ ${tooltipItem.raw.toFixed(2).replace('.', ',')}`
                        const date = new Date(tooltipItem.label).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        });
                        return `${value} ${date}`;
                    },
                    title: () => ''
                }
            }
        },
        scales: {
            x: {
                ticks: { display: false },
                grid: { display: false }
            },
            y: {
                ticks: {
                    callback: value => `R$ ${value.toFixed(2).replace('.', ',')}`,
                    font: { size: 12 },
                    color: CHART_CONFIG.colors.textColor
                },
                grid: { drawBorder: false }
            }
        },
        interaction: {
            mode: 'nearest',
            intersect: false
        },
        elements: {
            point: {
                radius: 3,
                hoverRadius: 6,
                hoverBorderWidth: 2
            }
        }
    };
}

function adjustChartSize(ctx) {
    if (window.innerWidth >= 768) {
        ctx.canvas.width = 652;
        ctx.canvas.height = 326;
    } else {
        ctx.canvas.width = ctx.canvas.offsetWidth;
        ctx.canvas.height = ctx.canvas.offsetHeight;
    }
}

async function getChartData(period) {
    const endDate = new Date();
    const startDate = new Date();
    const { days, interval } = CHART_CONFIG.periods[period] || CHART_CONFIG.periods['7d'];
    
    startDate.setDate(endDate.getDate() - days);
    
    const labels = [];
    const dataPoints = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + interval)) {
        const formattedDate = date.toISOString().split('T')[0];
        const rate = await fetchHistoricalRate(formattedDate);
        
        if (rate) {
            labels.push(formattedDate);
            dataPoints.push(rate);
        }
    }
    
    return { labels, dataPoints };
}

export async function renderChart(period = '7d') {
    try {
        const ctx = document.getElementById("chart").getContext("2d");
        
        // Limpa o gráfico anterior se existir
        if (chart) {
            chart.destroy();
        }
        
        // Ajusta o tamanho do canvas
        adjustChartSize(ctx);
        
        // Busca os dados
        const { labels, dataPoints } = await getChartData(period);
        
        // Cria o novo gráfico
        chart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    data: dataPoints,
                    borderColor: CHART_CONFIG.colors.primary,
                    backgroundColor: CHART_CONFIG.colors.background,
                    fill: true,
                    pointBackgroundColor: CHART_CONFIG.colors.primary,
                    pointBorderColor: CHART_CONFIG.colors.primary,
                    pointRadius: 3,
                    tension: 0
                }]
            },
            options: getChartOptions()
        });
        
        // Adiciona listener para redimensionamento
        window.addEventListener('resize', () => adjustChartSize(ctx));
        
    } catch (error) {
        console.error('Erro ao renderizar gráfico:', error);
        throw new Error('Falha ao renderizar o gráfico');
    }
}

// Exporta funções que podem ser úteis em outros módulos
export const getChartPeriods = () => Object.keys(CHART_CONFIG.periods);