import { fetchExchangeRate } from './api.js';
import { showError } from './utils.js';

function numeroParaExtenso(numero) {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const especiais = {
        "11": "onze", "12": "doze", "13": "treze", "14": "quatorze", "15": "quinze",
        "16": "dezesseis", "17": "dezessete", "18": "dezoito", "19": "dezenove"
    };

    if (numero === 0) return "zero";
    if (numero === 100) return "cem";
    if (numero === 1000) return "mil";

    let numStr = Math.floor(numero).toString();
    let result = [];

    if (numero >= 1000) {
        const milhares = Math.floor(numero / 1000);
        result.push(milhares === 1 ? "mil" : `${numeroParaExtenso(milhares)} mil`);
        numero %= 1000;
        numStr = Math.floor(numero).toString();
    }

    if (numero >= 100) {
        const centena = Math.floor(numero / 100);
        result.push(centena === 1 ? "cento" : dezenas[centena]);
        numero %= 100;
    }

    if (numero > 0) {
        if (numero >= 10 && numero <= 19) {
            result.push(especiais[numero.toString()]);
        } else {
            const dezena = Math.floor(numero / 10);
            const unidade = numero % 10;
            if (dezena > 0) result.push(dezenas[dezena]);
            if (unidade > 0) {
                if (result.length > 0) result.push("e");
                result.push(unidades[unidade]);
            }
        }
    }

    return result.join(" ");
}

export async function preencherTabelaValores() {
    const tabelaValores = document.querySelector('#valores-dolar tbody');
    if (!tabelaValores) {
        console.error('Tabela não encontrada');
        return;
    }

    try {
        const rate = await fetchExchangeRate();
        if (!rate) {
            throw new Error("Taxa de câmbio indisponível");
        }

        const valores = [1, 2, 5, 10, 25, 50, 100, 1000];
        tabelaValores.innerHTML = '';
        
        valores.forEach(valor => {
            const row = tabelaValores.insertRow();
            const brlValue = valor * rate;
            
            // Célula do dólar
            const usdCell = row.insertCell();
            usdCell.textContent = `US$ ${valor} (${numeroParaExtenso(valor)} ${valor === 1 ? 'dólar' : 'dólares'})`;
            
            // Célula do real
            const brlCell = row.insertCell();
            brlCell.textContent = `R$ ${brlValue.toFixed(2).replace('.', ',')}`;
        });

    } catch (error) {
        console.error("Erro ao preencher tabela:", error);
        showError("Erro ao carregar dados da tabela. Tente novamente mais tarde.");
        tabelaValores.innerHTML = '<tr><td colspan="2">Erro ao carregar dados da tabela.</td></tr>';
    }
}