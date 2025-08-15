window.translations = {};

const getDescendantProp = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const getTranslation = (key) => {
    return getDescendantProp(window.translations, key) || key;
};

const setLanguage = async (lang) => {
    const path = window.location.pathname.includes('/pages/') ? '../js/' : 'js/';
    const response = await fetch(`${path}${lang}.json`);
    const translations = await response.json();
    window.translations = translations;

    document.querySelectorAll('[data-lang]').forEach(element => {
        const key = element.getAttribute('data-lang');
        const translation = getDescendantProp(translations, key);
        if (translation) {
            if (typeof translation === 'string' && (translation.includes('<') || translation.includes('&'))) {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        }
    });

    localStorage.setItem('language', lang);
};

document.addEventListener('DOMContentLoaded', () => {
    const langEnBtn = document.getElementById('lang-en');
    const langFiBtn = document.getElementById('lang-fi');

    langEnBtn.addEventListener('click', () => setLanguage('en'));
    langFiBtn.addEventListener('click', () => setLanguage('fi'));

    const loadSolarData = async () => {
        try {
            const [sfiRes, kIndexRes, aIndexRes] = await Promise.all([
                fetch('https://services.swpc.noaa.gov/json/f107_cm_flux.json'),
                fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'),
                fetch('https://services.swpc.noaa.gov/json/predicted_fredericksburg_a_index.json')
            ]);

            const sfiData = await sfiRes.json();
            const kIndexData = await kIndexRes.json();
            const aIndexData = await aIndexRes.json();

            // Get the latest values
            const sfi = sfiData.length > 0 ? sfiData[0].flux : '--';
            const kIndex = kIndexData.length > 0 ? kIndexData[0].kp_index : '--';
            const aIndex = aIndexData.length > 0 ? aIndexData[0].afred_1_day : '--';

            document.getElementById('sfi-value').textContent = sfi;
            document.getElementById('k-index-value').textContent = kIndex;
            document.getElementById('a-index-value').textContent = aIndex;

            // Check for solar storm alerts
            const stormAlertElement = document.getElementById('solar-storm-alert');
            const stormInProgress = kIndexData.length > 0 && parseInt(kIndexData[0].kp_index, 10) >= 5;

            if (stormInProgress) {
                stormAlertElement.style.display = 'block';
            } else {
                stormAlertElement.style.display = 'none';
            }

        } catch (error) {
            console.error('Error loading solar data:', error);
        }
    };

    // Load the stored language or default to English, then load solar data
    const storedLang = localStorage.getItem('language') || 'en';
    setLanguage(storedLang).then(() => {
        // Only load solar data if we are on the index page
        if (document.getElementById('sfi-value')) {
            loadSolarData();
        }
    });
});
