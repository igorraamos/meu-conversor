import { showError } from './utils.js';

// Define a URL base baseada no ambiente
const isProduction = window.location.hostname !== 'localhost';
const BASE_URL = isProduction ? '/.netlify/functions' : '/api';

/**
 * Busca a taxa de câmbio atual
 * @returns {Promise<number|null>} Taxa de câmbio BRL ou null em caso de erro
 */
export async function fetchExchangeRate() {
    try {
        console.log('Fetching exchange rate...');
        const response = await fetch(`${BASE_URL}/exchange-rate`, {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        // Verifica a estrutura da resposta
        if (!data || !data.rates || typeof data.rates.BRL !== 'number') {
            throw new Error('Formato de resposta inválido');
        }

        return data.rates.BRL;
    } catch (error) {
        console.error('Erro ao buscar taxa de câmbio:', error);
        showError('Erro ao buscar cotação atual. Tente novamente mais tarde.');
        return null;
    }
}

/**
 * Busca taxas de câmbio históricas
 * @param {string} period - Período desejado ('7d', '1m', '6m', '1y')
 * @returns {Promise<Array<{date: string, rate: number}>|null>}
 */
export async function getHistoricalRates(period) {
    try {
        console.log('Fetching historical rates for period:', period);
        const endDate = new Date();
        const startDate = new Date();

        // Calcula o período
        switch(period) {
            case '1m': 
                startDate.setMonth(startDate.getMonth() - 1); 
                break;
            case '6m': 
                startDate.setMonth(startDate.getMonth() - 6); 
                break;
            case '1y': 
                startDate.setFullYear(startDate.getFullYear() - 1); 
                break;
            default: 
                startDate.setDate(startDate.getDate() - 7); // 7d
        }

        // Gera as datas para consulta
        const dates = [];
        const currentDate = new Date(startDate);
        const interval = Math.ceil((endDate - startDate) / (period === '7d' ? 7 : 30));

        while (currentDate <= endDate) {
            dates.push(currentDate.toISOString().split('T')[0]);
            const dayInterval = Math.max(1, Math.floor(interval / (1000 * 60 * 60 * 24)));
            currentDate.setDate(currentDate.getDate() + dayInterval);
        }

        // Garante que a última data está incluída
        const lastDate = endDate.toISOString().split('T')[0];
        if (dates[dates.length - 1] !== lastDate) {
            dates.push(lastDate);
        }

        // Busca os dados históricos
        const fetchPromises = dates.map(date => 
            fetch(`${BASE_URL}/historical-rate/${date}`, {
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            })
        );

        const responses = await Promise.all(fetchPromises);

        const results = await Promise.all(
            responses.map(async (response, index) => {
                if (!response.ok) {
                    console.warn(`Failed to fetch data for ${dates[index]}: ${response.status}`);
                    return null;
                }
                try {
                    const data = await response.json();
                    if (!data || !data.rates || typeof data.rates.BRL !== 'number') {
                        console.warn(`Invalid data format for ${dates[index]}`);
                        return null;
                    }
                    return {
                        date: dates[index],
                        rate: data.rates.BRL
                    };
                } catch (error) {
                    console.warn(`Error parsing data for ${dates[index]}:`, error);
                    return null;
                }
            })
        );

        const validResults = results.filter(item => item !== null);
        
        if (validResults.length === 0) {
            throw new Error('Nenhum dado histórico válido encontrado');
        }

        return validResults;
    } catch (error) {
        console.error('Erro ao buscar taxas históricas:', error);
        showError('Erro ao buscar dados históricos. Tente novamente mais tarde.');
        return null;
    }
}