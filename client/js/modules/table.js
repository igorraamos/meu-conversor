import { fetchExchangeRate } from './api.js';
import { showError } from './utils.js';

/**
 * Converte número para texto por extenso
 */
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

/**
 * Formata valor monetário
 */
function formatarMoeda(valor) {
    return valor.toFixed(2).replace('.', ',');
}

/**
 * Preenche a tabela com os valores convertidos
 */
export async function preencherTabelaValores() {
    const tabelaValores = document.querySelector('#valores-dolar tbody');
    if (!tabelaValores) {
        console.error('Tabela não encontrada');
        return;
    }

    try {
        const exchangeData = await fetchExchangeRate();
        
        if (!exchangeData || typeof exchangeData.rate !== 'number') {
            throw new Error("Taxa de câmbio inválida");
        }

        const rate = exchangeData.rate;
        const valores = [1, 2, 5, 10, 25, 50, 100, 1000];
        
        // Limpar tabela existente
        tabelaValores.innerHTML = '';
        
        // Preencher com novos valores
        valores.forEach(valor => {
            const row = tabelaValores.insertRow();
            const brlValue = valor * rate;
            
            // Célula do dólar
            const usdCell = row.insertCell();
            const extenso = numeroParaExtenso(valor);
            usdCell.textContent = `US$ ${valor} (${extenso} ${valor === 1 ? 'dólar' : 'dólares'})`;
            
            // Célula do real
            const brlCell = row.insertCell();
            brlCell.textContent = `R$ ${formatarMoeda(brlValue)}`;

            // Adicionar classes para estilização
            usdCell.className = 'usd-value';
            brlCell.className = 'brl-value';
        });

    } catch (error) {
        console.error("Erro ao preencher tabela:", error);
        showError("Erro ao carregar dados da tabela. Tente novamente mais tarde.");
        
        tabelaValores.innerHTML = `
            <tr>
                <td colspan="2" class="error-message">
                    Erro ao carregar dados da tabela.
                    <button onclick="window.location.reload()" class="retry-button">
                        Tentar novamente
                    </button>
                </td>
            </tr>
        `;
    }
}