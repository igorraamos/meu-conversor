export function formatNumber(value) {
    if (typeof value !== 'number' || isNaN(value)) return "0,00";
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function unformatNumber(value) {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

export function numeroParaExtenso(numero) {
    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezenas = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
    // ... resto da função numeroParaExtenso ...
}

export function valorMonetarioParaExtenso(valor, moeda) {
    // ... função valorMonetarioParaExtenso ...
}