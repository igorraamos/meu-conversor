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

export function showError(message) {
    const errorContainer = document.getElementById("error-container");
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = "block";
        setTimeout(() => {
            errorContainer.style.display = "none";
        }, 5000);
    }
}

export function updateLocalTime() {
    const localTimeElement = document.getElementById("local-time-value");
    if (localTimeElement) {
        const now = new Date();
        localTimeElement.textContent = now.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }
}

// Atualizar hora a cada segundo
export function initializeLocalTime() {
    updateLocalTime();
    setInterval(updateLocalTime, 1000);
}