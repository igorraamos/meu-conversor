import fetch from 'node-fetch';

exports.handler = async (event, context) => {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}&base=USD&symbols=BRL`,
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
        base: data.base || 'USD'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar taxa de câmbio' })
    };
  }
};