require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const app = express();

// Configurações de segurança
app.use(helmet());
app.use(cors({
    origin: 'https://seu-dominio.com' // Ajuste para seu domínio
}));

// Servir arquivos estáticos
app.use(express.static('public'));

// Rota proxy para a API de câmbio
app.get('/api/exchange-rate', async (req, res) => {
    try {
        const response = await fetch(
            `${process.env.API_BASE_URL}/latest?base=USD`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.EXCHANGE_API_KEY}`
                }
            }
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar taxa de câmbio' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});