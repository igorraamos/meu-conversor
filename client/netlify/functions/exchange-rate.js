// Usando ESM em vez de CommonJS
import fetch from 'node-fetch';

// Usando export default em vez de exports.handler
export default async function handler(event, context) {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}&base=USD&symbols=BRL`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Erro na função:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Erro ao buscar taxa de câmbio',
        details: error.message
      })
    };
  }
}