import { fetchExchangeRate } from './api.js';
import { formatNumber, unformatNumber } from './formatters.js';
import { cacheExchangeRate, getCachedExchangeRate } from './cache.js';
import { showError } from './utils.js';

export async function updateConversion(fromUSD = true) {
    const usdInput = document.getElementById("usd-input");
    const brlInput = document.getElementById("brl-input");

    try {
        const rate = await getExchangeRate();
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
        if (fromUSD) {
            brlInput.value = "Erro";
        } else {
            usdInput.value = "Erro";
        }
        showError("Erro ao converter valor");
    }
}

export function initInputFormatting(usdInput, brlInput) {
    const handleInput = (input, isUSD) => {
        input.addEventListener("input", () => {
            const value = input.value;
            if (!/^[\d.,]*$/.test(value)) {
                input.value = value.slice(0, -1);
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