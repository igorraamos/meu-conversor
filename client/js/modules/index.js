import { fetchExchangeRate } from './api.js';
import { renderChart } from './chart.js';
import { preencherTabelaValores } from './table.js';
import { initTheme } from './theme.js';
import { formatNumber, unformatNumber, showError, updateLocalTime } from './utils.js';

// Elementos do DOM
const usdInput = document.getElementById("usd-input");
const brlInput = document.getElementById("brl-input");
const currentDollarValue = document.getElementById("current-dollar-value");
const dollarVariation = document.querySelector(".dolar-valor-hoje .variacao");

let lastRate = null;
let previousRate = null;

function calculateVariation(currentRate, previousRate) {
    if (!previousRate || !currentRate) return 0;
    return ((currentRate - previousRate) / previousRate) * 100;
}

function updateDollarInfo(rate, variation) {
    if (currentDollarValue) {
        currentDollarValue.textContent = formatNumber(rate);
    }
    
    if (dollarVariation) {
        const isPositive = variation >= 0;
        dollarVariation.className = `variacao ${isPositive ? 'positive' : 'negative'}`;
        dollarVariation.textContent = `(${isPositive ? '+' : ''}${variation.toFixed(2).replace('.', ',')}% em relação a ontem)`;
    }
}

async function updateConversion(fromUSD = true) {
    try {
        const rate = await fetchExchangeRate();
        if (!rate) throw new Error("Taxa de câmbio indisponível");

        // Atualizar taxa anterior se necessário
        if (lastRate !== rate) {
            previousRate = lastRate;
            lastRate = rate;
        }

        // Calcular variação
        const variation = calculateVariation(rate, previousRate);

        // Atualizar informações do dólar
        updateDollarInfo(rate, variation);

        if (fromUSD) {
            const usdValue = unformatNumber(usdInput.value || "1,00");
            const brlValue = usdValue * rate;
            brlInput.value = formatNumber(brlValue);
        } else {
            const brlValue = unformatNumber(brlInput.value);
            const usdValue = brlValue / rate;
            usdInput.value = formatNumber(usdValue);
        }

        return rate;
    } catch (error) {
        console.error("Erro ao converter valor:", error);
        showError("Erro ao converter valor. Tente novamente mais tarde.");
        return null;
    }
}

function initializeConversor() {
    const handleInput = (input, isUSD) => {
        input.addEventListener("input", (event) => {
            const value = event.target.value;
            if (!/^[\d.,]*$/.test(value)) {
                event.target.value = value.replace(/[^\d.,]/g, '');
                return;
            }
            updateConversion(isUSD);
        });

        input.addEventListener("focus", () => input.select());
        
        input.addEventListener("blur", () => {
            const currentValue = unformatNumber(input.value);
            input.value = formatNumber(currentValue);
        });
    };

    handleInput(usdInput, true);
    handleInput(brlInput, false);
}

function initializeChartButtons() {
    const buttons = document.querySelectorAll('.chart-buttons button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const period = button.dataset.period;
            renderChart(period);
        });
    });
}

async function initialize() {
    try {
        console.log('Initializing application...');
        
        // Inicializar tema
        initTheme();
        
        // Inicializar conversor
        initializeConversor();
        
        // Inicializar botões do gráfico
        initializeChartButtons();
        
        // Configurar valor inicial e fazer primeira conversão
        usdInput.value = "1,00";
        await updateConversion(true);
        
        // Renderizar gráfico inicial
        await renderChart('7d');
        
        // Preencher tabela
        await preencherTabelaValores();
        
        // Atualizar hora
        updateLocalTime();
        setInterval(updateLocalTime, 1000);
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Erro ao inicializar a aplicação');
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initialize);

// Atualizar dados periodicamente (a cada 5 minutos)
setInterval(async () => {
    try {
        await updateConversion(true);
        await preencherTabelaValores();
    } catch (error) {
        console.error('Erro na atualização automática:', error);
    }
}, 5 * 60 * 1000);