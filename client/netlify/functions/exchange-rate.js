const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Log para debug
  console.log('API_BASE_URL:', process.env.API_BASE_URL);
  console.log('Exchange API Key configurada:', !!process.env.EXCHANGE_API_KEY);

  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/latest.json?app_id=${process.env.EXCHANGE_API_KEY}&base=USD&symbols=BRL`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    // Log para debug
    console.log('Status da resposta:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log para debug
    console.log('Dados recebidos:', JSON.stringify(data));

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
};