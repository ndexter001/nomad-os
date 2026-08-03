/** Dark / light theme — persisted to localStorage, respects system preference */
const THEME_STORAGE_KEY = 'konverter-theme';

function getStoredTheme() {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* private mode */ }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

function applyTheme(theme) {
    const resolved = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
    return resolved;
}

function getTheme() {
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' ? 'light' : 'dark';
}

function setTheme(theme) {
    const resolved = applyTheme(theme);
    try {
        localStorage.setItem(THEME_STORAGE_KEY, resolved);
    } catch { /* quota */ }
    updateThemeToggleUI();
}

function toggleTheme() {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
}

function updateThemeToggleUI() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    const isLight = getTheme() === 'light';
    btn.dataset.themeState = isLight ? 'light' : 'dark';
    btn.setAttribute('aria-pressed', String(!isLight));

    if (typeof t === 'function') {
        const label = isLight ? t('themeSwitchDark') : t('themeSwitchLight');
        btn.setAttribute('aria-label', label);
        btn.title = label;
    }
}

function initThemeEarly() {
    applyTheme(getStoredTheme());
}

function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn || btn.dataset.themeInit) return;
    btn.dataset.themeInit = '1';
    btn.addEventListener('click', toggleTheme);
    updateThemeToggleUI();
}

if (typeof window !== 'undefined') {
    window.initThemeEarly = initThemeEarly;
    window.initThemeToggle = initThemeToggle;
    window.updateThemeToggleUI = updateThemeToggleUI;
    window.setTheme = setTheme;
    window.toggleTheme = toggleTheme;
    window.getTheme = getTheme;
}
