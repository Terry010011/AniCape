// ============================================================
// I18N TRANSLATIONS
// ============================================================
let translations = { en: {}, zh: {} };

let currentLang = localStorage.getItem('cape_editor_lang') || detectBrowserLanguage();

function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('zh') ? 'zh' : 'en';
}

async function loadLocale(lang) {
    try {
        const response = await fetch(`./src/core/locales/${lang}.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        translations[lang] = data;
    } catch (error) {
        console.error(`Could not load translations for ${lang}:`, error);
    }
}

async function loadAllLocales() {
    await Promise.all([
        loadLocale('en'),
        loadLocale('zh')
    ]);
}

function getTranslation(key) {
    return translations[currentLang]?.[key] || translations['en']?.[key] || key;
}

function updateI18n() {
    if (!translations[currentLang]) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        if (translations[currentLang][k]) el.innerHTML = translations[currentLang][k];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const k = el.getAttribute('data-i18n-title');
        if (translations[currentLang][k]) el.title = translations[currentLang][k];
    });
}
