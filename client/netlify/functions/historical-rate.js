import fetch from 'node-fetch';

exports.handler = async (event, context) => {
  try {
    const date = event.path.split('/').pop();
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Data inválida' })
      };
    }

    const response = await fetch(
      `${process.env.API_BASE_URL}/historical/${date}.json?app_id=${process.env.EXCHANGE_API_KEY}&base=USD&symbols=BRL`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Meu-Conversor/1.0'
        },
        timeout: 5000
      }
    );

    if (!response.ok) {
      throw new Error(`API respondeu com status ${response.status}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      body: JSON.stringify({
        rates: {
          BRL: data.rates?.BRL || null
        },
        timestamp: data.timestamp,
        base: data.base || 'USD',
        historical: true,
        date: date
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar dados históricos' })
    };
  }
};