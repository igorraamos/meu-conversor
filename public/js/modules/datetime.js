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