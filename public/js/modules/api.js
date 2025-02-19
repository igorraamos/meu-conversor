import { showError } from './utils.js';

const API_KEY = '8a3876236c714b78aea04625340db76d';
const API_URL = 'https://openexchangerates.org/api';

export async function fetchExchangeRate() {
    try {
        console.log('Fetching exchange rate...');
        const response = await fetch(`${API_URL}/latest.json?app_id=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (!data.rates || !data.rates.BRL) {
            throw new Error('Taxa BRL não encontrada na resposta');
        }

        return data.rates.BRL;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        showError('Erro ao buscar cotação atual. Tente novamente mais tarde.');
        return null;
    }
}

export async function getHistoricalRates(period) {
    try {
        console.log('Fetching historical rates for period:', period);
        const endDate = new Date();
        const startDate = new Date();

        // Definir período
        switch(period) {
            case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
            case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
            case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
            default: startDate.setDate(startDate.getDate() - 7); // 7d
        }

        // Calcular datas intermediárias
        const dates = [];
        const currentDate = new Date(startDate);
        const interval = Math.ceil((endDate - startDate) / (period === '7d' ? 7 : 30)); // Mais pontos para períodos maiores

        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + Math.max(1, Math.floor(interval / (1000 * 60 * 60 * 24))));
        }

        // Garantir que a última data seja incluída
        const lastDate = endDate.toISOString().split('T')[0];
        if (dates[dates.length - 1] !== lastDate) {
            dates.push(lastDate);
        }

        // Buscar dados para cada data
        const responses = await Promise.all(
            dates.map(date => 
                fetch(`${API_URL}/historical/${date}.json?app_id=${API_KEY}`)
            )
        );

        const results = await Promise.all(
            responses.map(async (response, index) => {
                if (!response.ok) return null;
                const data = await response.json();
                return {
                    date: dates[index],
                    rate: data.rates.BRL
                };
            })
        );

        return results.filter(item => item !== null);
    } catch (error) {
        console.error('Erro ao buscar taxas históricas:', error);
        showError('Erro ao buscar dados históricos');
        return null;
    }
}