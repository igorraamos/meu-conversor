function updateChartColors(isDark) {
    const chartDefaults = {
        color: isDark ? '#E0E0E0' : '#36454F',
        borderColor: isDark ? '#404040' : '#ddd',
        backgroundColor: isDark ? '#1F1F1F' : '#ffffff'
    };

    if (window.Chart) {
        Chart.defaults.color = chartDefaults.color;
        Chart.defaults.borderColor = chartDefaults.borderColor;
        Chart.defaults.backgroundColor = chartDefaults.backgroundColor;

        // Atualizar gráficos existentes
        if (window.currentChart) {
            currentChart.options.scales.x.grid.color = chartDefaults.borderColor;
            currentChart.options.scales.y.grid.color = chartDefaults.borderColor;
            currentChart.options.scales.x.ticks.color = chartDefaults.color;
            currentChart.options.scales.y.ticks.color = chartDefaults.color;
            currentChart.update('none');
        }
    }
}

export function initTheme() {
    const toggleThemeButton = document.getElementById("toggle-theme");
    if (!toggleThemeButton) {
        console.error('Botão de tema não encontrado');
        return;
    }

    const applyTheme = (isDark) => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
        toggleThemeButton.textContent = isDark ? "☀️" : "🌙";
        updateChartColors(isDark);

        try {
            localStorage.setItem("theme", isDark ? "dark" : "light");
        } catch (e) {
            console.error('Erro ao salvar tema:', e);
        }

        // Disparar evento de mudança de tema
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { isDark }
        }));
    };

    const getPreferredTheme = () => {
        try {
            const savedTheme = localStorage.getItem("theme");
            if (savedTheme) {
                return savedTheme === "dark";
            }
            return window.matchMedia("(prefers-color-scheme: dark)").matches;
        } catch (e) {
            return false;
        }
    };

    // Aplicar tema inicial
    applyTheme(getPreferredTheme());

    // Listener para o botão de tema
    toggleThemeButton.addEventListener("click", () => {
        const isDarkMode = document.documentElement.getAttribute('data-theme') !== 'dark';
        applyTheme(isDarkMode);
    });

    // Listener para mudanças na preferência do sistema
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        if (!localStorage.getItem("theme")) {
            applyTheme(e.matches);
        }
    });
}

export function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}