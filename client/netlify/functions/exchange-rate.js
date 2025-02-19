// Usando CommonJS em vez de ESM para compatibilidade com Netlify Functions
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    if (!process.env.API_BASE_URL || !process.env.EXCHANGE_API_KEY) {
      throw new Error('API configuration missing');
    }

    const response = await fetch(
      `${process.env.API_BASE_URL}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}&base=USD&symbols=BRL`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
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
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};