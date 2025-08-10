document.addEventListener('DOMContentLoaded', () => {
    const langEnBtn = document.getElementById('lang-en');
    const langFiBtn = document.getElementById('lang-fi');

    const setLanguage = async (lang) => {
        const path = window.location.pathname.includes('/pages/') ? '../js/' : 'js/';
        const response = await fetch(`${path}${lang}.json`);
        const translations = await response.json();

        document.querySelectorAll('[data-lang]').forEach(element => {
            const key = element.getAttribute('data-lang');
            if (translations[key]) {
                element.textContent = translations[key];
            }
        });

        localStorage.setItem('language', lang);
    };

    langEnBtn.addEventListener('click', () => setLanguage('en'));
    langFiBtn.addEventListener('click', () => setLanguage('fi'));

    // Load the stored language or default to English
    const storedLang = localStorage.getItem('language') || 'en';
    setLanguage(storedLang);
});
