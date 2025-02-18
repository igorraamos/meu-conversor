// Corrigir o caminho do import para:
import { fetchExchangeRate } from '../modules/api.js';
import { showError } from '../modules/utils.js';

export function formatNumber(value) {
    if (typeof value !== 'number' || isNaN(value)) return "0,00";
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function unformatNumber(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

export async function updateConversion(fromUSD = true) {
    const usdInput = document.getElementById("usd-input");
    const brlInput = document.getElementById("brl-input");
    
    try {
        const rate = await fetchExchangeRate();
        if (!rate) {
            throw new Error("Taxa de câmbio indisponível");
        }

        if (fromUSD) {
            const usdValue = unformatNumber(usdInput.value);
            const brlValue = usdValue * rate;
            brlInput.value = formatNumber(brlValue);
        } else {
            const brlValue = unformatNumber(brlInput.value);
            const usdValue = brlValue / rate;
            usdInput.value = formatNumber(usdValue);
        }
    } catch (error) {
        console.error("Erro ao converter valor:", error);
        showError("Erro ao converter valor. Tente novamente.");
        if (fromUSD) {
            brlInput.value = "Erro";
        } else {
            usdInput.value = "Erro";
        }
    }
}

export function initInputFormatting(usdInput, brlInput) {
    const handleInput = (input, isUSD) => {
        input.addEventListener("input", (e) => {
            let value = e.target.value;
            value = value.replace(/[^\d.,]/g, '');
            value = value.replace(/[.,]/g, (match, offset, string) => 
                string.indexOf('.') === offset || string.indexOf(',') === offset ? match : '');
            
            e.target.value = value;
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