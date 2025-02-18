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