export function initTheme(toggleThemeButton) {
    const applyTheme = (isDark) => {
        document.body.classList.toggle("dark-theme", isDark);
        toggleThemeButton.textContent = isDark ? "☀️" : "🌙";
        try {
            localStorage.setItem("theme", isDark ? "dark" : "light");
        } catch (e) {
            // Modo anônimo - não salva preferência
        }
    };

    // ... resto do código do tema ...
}