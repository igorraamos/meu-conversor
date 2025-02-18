import { fetchExchangeRate } from './api.js';

export async function preencherTabelaValores() {
    try {
        const rate = await fetchExchangeRate();
        if (!rate) throw new Error('Não foi possível obter a taxa de câmbio');

        const tbody = document.querySelector('#valores-dolar tbody');
        tbody.innerHTML = ''; // Limpa a tabela

        // Valores comuns em dólar para mostrar na tabela
        const valoresUSD = [1, 5, 10, 20, 50, 100, 500, 1000];

        valoresUSD.forEach(usd => {
            const brl = usd * rate;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>US$ ${usd.toFixed(2)}</td>
                <td>R$ ${brl.toFixed(2)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao preencher tabela:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = 'Erro ao carregar a tabela de valores. Tente novamente mais tarde.';
            errorContainer.style.display = 'block';
        }
    }
}