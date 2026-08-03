/** Languages with full UI translations in i18n.js */
const LANG_OPTIONS = [
    { code: 'no', flag: '🇳🇴', label: 'Norsk', locale: 'nb-NO' },
    { code: 'en', flag: '🇬🇧', label: 'English', locale: 'en-US' },
    { code: 'de', flag: '🇩🇪', label: 'Deutsch', locale: 'de-DE' },
    { code: 'es', flag: '🇪🇸', label: 'Español', locale: 'es-ES' },
    { code: 'fr', flag: '🇫🇷', label: 'Français', locale: 'fr-FR' }
];

const LANG_BY_CODE = Object.fromEntries(LANG_OPTIONS.map((l) => [l.code, l]));

const LOCALE_MAP = Object.fromEntries(
    LANG_OPTIONS.map((l) => [l.code, l.locale])
);

const RTL_LANGS = new Set();

/** Map browser / regional codes to a supported language */
const LANG_ALIASES = {
    nb: 'no',
    nn: 'no',
    'en-US': 'en',
    'en-GB': 'en',
    'en-AU': 'en',
    'en-CA': 'en',
    'en-IN': 'en',
    'de-AT': 'de',
    'de-CH': 'de',
    'es-MX': 'es',
    'es-AR': 'es',
    'fr-CA': 'fr'
};

function resolveLangCode(code) {
    if (!code) return null;
    if (LANG_BY_CODE[code]) return code;
    if (LANG_ALIASES[code]) return LANG_ALIASES[code];
    const base = code.split('-')[0];
    if (LANG_BY_CODE[base]) return base;
    if (LANG_ALIASES[base]) return LANG_ALIASES[base];
    return null;
}

function getLangFlag(code) {
    return LANG_BY_CODE[code]?.flag ?? '🌍';
}

function getLangLabel(code) {
    return LANG_BY_CODE[code]?.label ?? code;
}
