import { renderChart } from './modules/chart.js';
import { showError } from './modules/utils.js';
import { preencherTabelaValores } from './modules/table.js';
import { initInputFormatting, updateConversion } from './modules/converter.js';
import { updateLocalTime } from './modules/datetime.js';
import { getHistoricalRates } from './modules/api.js';
import { CONFIG, THEME, ERROR_MESSAGES } from './config.js';

// Variáveis globais
const usdInput = document.getElementById("usd-input");
const brlInput = document.getElementById("brl-input");
const toggleThemeButton = document.getElementById("toggle-theme");
const errorContainer = document.getElementById("error-container");

function initTheme(button) {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    button.innerHTML = currentTheme === 'dark' ? '☀️' : '🌙';

    button.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        button.innerHTML = isDark ? '☀️' : '🌙';
        updateChartTheme(isDark);
    });
}

function updateChartTheme(isDark) {
    const theme = isDark ? THEME.DARK : THEME.LIGHT;
    if (window.currentChart) {
        window.currentChart.options.scales.x.grid.color = theme.chartGrid;
        window.currentChart.options.scales.y.grid.color = theme.chartGrid;
        window.currentChart.update();
    }
}

async function calcularVariacao(period) {
    try {
        const button = document.querySelector(`button[data-period="${period}"]`);
        const variationSpan = button.querySelector('.variation');
        const rates = await getHistoricalRates(period);
        
        if (!rates || rates.length < 2) {
            throw new Error('Dados insuficientes para calcular variação');
        }

        const initialRate = rates[0].rate;
        const finalRate = rates[rates.length - 1].rate;
        const variation = ((finalRate - initialRate) / initialRate) * 100;
        
        variationSpan.textContent = `${variation.toFixed(2)}%`;
        variationSpan.classList.toggle('positive', variation >= 0);
        variationSpan.classList.toggle('negative', variation < 0);
    } catch (error) {
        console.error('Erro ao calcular variação:', error);
        showError(ERROR_MESSAGES.API_FETCH);
    }
}

function initChartButtons() {
    const chartButtons = document.querySelectorAll('.chart-buttons button');
    
    const defaultButton = document.querySelector('button[data-period="7d"]');
    if (defaultButton) defaultButton.classList.add('active');

    chartButtons.forEach((button) => {
        const period = button.dataset.period;
        button.addEventListener("click", async () => {
            try {
                chartButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                await calcularVariacao(period);
                await renderChart(period);
            } catch (error) {
                console.error('Erro ao atualizar gráfico:', error);
                showError(ERROR_MESSAGES.API_FETCH);
            }
        });
    });
}

function initNavigation() {
    const toggleMoreButton = document.getElementById('toggle-more');
    const extraCoins = document.getElementById('extra-coins');

    if (toggleMoreButton && extraCoins) {
        toggleMoreButton.addEventListener('click', () => {
            const isHidden = extraCoins.classList.toggle('hidden');
            toggleMoreButton.textContent = isHidden ? 'Ver Mais Moedas' : 'Ver Menos';
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        updateLocalTime();
        setInterval(updateLocalTime, 1000);

        initTheme(toggleThemeButton);
        
        usdInput.value = "1,00";
        await updateConversion(true);

        await preencherTabelaValores();
        await renderChart("7d");
        await calcularVariacao("7d");
        
        initInputFormatting(usdInput, brlInput);
        initChartButtons();
        initNavigation();

    } catch (error) {
        console.error("Erro na inicialização do aplicativo:", error);
        showError(ERROR_MESSAGES.GENERAL);
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/public/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registrado com sucesso:', registration.scope);
            })
            .catch(error => {
                console.error('Erro ao registrar ServiceWorker:', error);
            });
    });
}