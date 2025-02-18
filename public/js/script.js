import { renderChart } from './modules/chart.js';
import { showError } from './modules/utils.js';
import { preencherTabelaValores } from './modules/table.js';
import { initInputFormatting, updateConversion } from './modules/converter.js';
import { updateLocalTime } from './modules/datetime.js';
import { CONFIG, THEME, ERROR_MESSAGES } from './config.js';

// Variáveis globais
const usdInput = document.getElementById("usd-input");
const brlInput = document.getElementById("brl-input");
const toggleThemeButton = document.getElementById("toggle-theme");
const errorContainer = document.getElementById("error-container");

/**
 * Inicializa o tema da aplicação
 * @param {HTMLElement} button - Botão de alternância do tema
 */
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

/**
 * Atualiza o tema do gráfico
 * @param {boolean} isDark - Indica se o tema escuro está ativo
 */
function updateChartTheme(isDark) {
    const theme = isDark ? THEME.DARK : THEME.LIGHT;
    if (window.currentChart) {
        window.currentChart.options.scales.x.grid.color = theme.chartGrid;
        window.currentChart.options.scales.y.grid.color = theme.chartGrid;
        window.currentChart.update();
    }
}

/**
 * Calcula e exibe a variação do período selecionado
 * @param {string} period - Período selecionado (7d, 1m, 6m, 1y)
 */
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

/**
 * Inicializa os botões do gráfico
 */
function initChartButtons() {
    const chartButtons = document.querySelectorAll('.chart-buttons button');
    chartButtons.forEach((button) => {
        const period = button.dataset.period;
        button.addEventListener("click", async () => {
            try {
                await calcularVariacao(period);
                await renderChart(period);
            } catch (error) {
                console.error('Erro ao atualizar gráfico:', error);
                showError(ERROR_MESSAGES.API_FETCH);
            }
        });
    });
}

/**
 * Inicializa o menu de navegação
 */
function initNavigation() {
    const toggleMoreButton = document.getElementById('toggle-more');
    const extraCoins = document.getElementById('extra-coins');

    toggleMoreButton.addEventListener('click', () => {
        const isHidden = extraCoins.classList.toggle('hidden');
        toggleMoreButton.textContent = isHidden ? 'Ver Mais Moedas' : 'Ver Menos';
    });
}

// Inicialização da aplicação
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Inicializar hora local
        updateLocalTime();
        setInterval(updateLocalTime, 1000);

        // Inicializar tema
        initTheme(toggleThemeButton);
        
        // Inicializar conversor
        usdInput.value = "1,00";
        await updateConversion(true);

        // Inicializar tabela e gráfico
        await preencherTabelaValores();
        await renderChart("7d");
        await calcularVariacao("7d");
        
        // Inicializar formatação de entrada e navegação
        initInputFormatting(usdInput, brlInput);
        initChartButtons();
        initNavigation();

    } catch (error) {
        console.error("Erro na inicialização do aplicativo:", error);
        showError(ERROR_MESSAGES.API_FETCH);
    }
});

// Service Worker para PWA
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