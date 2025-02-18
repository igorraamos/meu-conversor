export function showError(message, duration = 5000) {
    const errorContainer = document.getElementById('error-container');
    if (!errorContainer) return;

    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    errorContainer.classList.add('show-error');

    setTimeout(() => {
        errorContainer.classList.remove('show-error');
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 300);
    }, duration);
}

export function valorMonetarioParaExtenso(valor, moeda) {
    const inteiro = Math.floor(valor);
    const centavos = Math.round((valor - inteiro) * 100);
    
    let resultado = [];
    
    if (inteiro > 0) {
        const extensoInteiro = numeroParaExtenso(inteiro);
        resultado.push(inteiro === 1 
            ? `${extensoInteiro} ${moeda === 'USD' ? 'dólar' : 'real'}`
            : `${extensoInteiro} ${moeda === 'USD' ? 'dólares' : 'reais'}`);
    }
    
    if (centavos > 0) {
        const extensoCentavos = numeroParaExtenso(centavos);
        if (inteiro > 0) resultado.push("e");
        resultado.push(centavos === 1 ? `${extensoCentavos} centavo` : `${extensoCentavos} centavos`);
    }
    
    return resultado.join(" ");
}

function numeroParaExtenso(numero) {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const especiais = {
        "11": "onze", "12": "doze", "13": "treze", "14": "quatorze", "15": "quinze",
        "16": "dezesseis", "17": "dezessete", "18": "dezoito", "19": "dezenove"
    };

    if (numero === 0) return "zero";
    if (numero < 10) return unidades[numero];
    if (numero in especiais) return especiais[numero];
    
    const dezena = Math.floor(numero / 10);
    const unidade = numero % 10;
    
    if (unidade === 0) return dezenas[dezena];
    return `${dezenas[dezena]} e ${unidades[unidade]}`;
}