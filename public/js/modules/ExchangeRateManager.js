import { CONFIG, ERROR_MESSAGES } from '../config.js';

export class ExchangeRateManager {
    #cache;
    #lastUpdate;

    constructor() {
        this.#cache = new Map();
        this.#lastUpdate = null;
    }

    async #fetchRates() {
        try {
            const url = new URL(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.LATEST}`);
            url.searchParams.append('app_id', CONFIG.API.APP_ID);
            url.searchParams.append('base', CONFIG.API.BASE_CURRENCY);
            url.searchParams.append('symbols', CONFIG.API.SUPPORTED_CURRENCIES.join(','));

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(ERROR_MESSAGES.QUOTA_EXCEEDED);
                }
                throw new Error(ERROR_MESSAGES.API_ERROR);
            }

            const data = await response.json();
            
            if (!data.rates) {
                throw new Error(ERROR_MESSAGES.API_ERROR);
            }

            this.#cache.clear();
            this.#lastUpdate = Date.now();

            CONFIG.API.SUPPORTED_CURRENCIES.forEach(currency => {
                this.#cache.set(currency, data.rates[currency]);
            });

            return data.rates;
        } catch (error) {
            console.error('Erro ao buscar taxas:', error);
            throw error;
        }
    }

    async getRate(from = 'USD', to = 'BRL') {
        try {
            if (!this.#lastUpdate || Date.now() - this.#lastUpdate > CONFIG.UPDATE_INTERVAL) {
                await this.#fetchRates();
            }

            const fromRate = this.#cache.get(from);
            const toRate = this.#cache.get(to);

            if (!fromRate || !toRate) {
                throw new Error(ERROR_MESSAGES.RATE_ERROR);
            }

            return toRate / fromRate;
        } catch (error) {
            console.error('Erro ao obter taxa:', error);
            throw error;
        }
    }

    async getHistoricalRates(days = 7) {
        try {
            const dates = [];
            const rates = [];
            const today = new Date();

            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const formattedDate = date.toISOString().split('T')[0];
                dates.push(formattedDate);
            }

            const promises = dates.map(async date => {
                const url = new URL(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.HISTORICAL}/${date}.json`);
                url.searchParams.append('app_id', CONFIG.API.APP_ID);
                url.searchParams.append('base', CONFIG.API.BASE_CURRENCY);
                url.searchParams.append('symbols', 'BRL');

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(ERROR_MESSAGES.API_ERROR);
                }

                const data = await response.json();
                return {
                    date: new Date(date),
                    rate: data.rates.BRL
                };
            });

            const results = await Promise.all(promises);
            return results.sort((a, b) => a.date - b.date);
        } catch (error) {
            console.error('Erro ao buscar dados históricos:', error);
            throw error;
        }
    }
}