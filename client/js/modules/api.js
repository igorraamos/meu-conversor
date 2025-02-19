import { showError } from './utils.js';

// Remove API_KEY e atualiza API_URL para usar o backend local
const API_URL = '/api';

export async function fetchExchangeRate() {
    try {
        console.log('Fetching exchange rate...');
        // Nova URL simplificada que usa o backend
        const response = await fetch(`${API_URL}/exchange-rate`);
        
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

        // Definir período (mantém a mesma lógica)
        switch(period) {
            case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
            case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
            case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
            default: startDate.setDate(startDate.getDate() - 7); // 7d
        }

        // Mantém a mesma lógica de datas
        const dates = [];
        const currentDate = new Date(startDate);
        const interval = Math.ceil((endDate - startDate) / (period === '7d' ? 7 : 30));

        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + Math.max(1, Math.floor(interval / (1000 * 60 * 60 * 24))));
        }

        const lastDate = endDate.toISOString().split('T')[0];
        if (dates[dates.length - 1] !== lastDate) {
            dates.push(lastDate);
        }

        // Atualiza as URLs para usar o backend
        const responses = await Promise.all(
            dates.map(date => 
                fetch(`${API_URL}/historical/${date}`)
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