document.addEventListener('DOMContentLoaded', () => {
    // Form and table elements
    const logbookForm = document.getElementById('logbook-form');
    const logbookTableBody = document.querySelector('#logbook-table tbody');
    const exportBtn = document.getElementById('export-cabrillo');
    const contestSelector = document.getElementById('contest');
    const exchSentInput = document.getElementById('exch-sent');
    const provinceCodeContainer = document.querySelector('.province-code');

    // Cabrillo category selectors
    const categoryOperator = document.getElementById('category-operator');
    const categoryBand = document.getElementById('category-band');
    const categoryMode = document.getElementById('category-mode');
    const categoryPower = document.getElementById('category-power');

    // Modal elements
    const cabrilloModal = document.getElementById('cabrillo-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const cabrilloInfoForm = document.getElementById('cabrillo-info-form');
    const cabrilloNameInput = document.getElementById('cabrillo-name');
    const cabrilloAddressInput = document.getElementById('cabrillo-address');
    const cabrilloSoapboxInput = document.getElementById('cabrillo-soapbox');

    const contests = {
        'generic-serial': { type: 'serial' },
        'sral-peruskisa': { type: 'serial-province' },
        'sral-talvi': { type: 'serial' },
        'sral-kalakukko': { type: 'serial' },
        'sral-sainio': { type: 'serial' },
        'sral-kesakisa': { type: 'serial' },
        'sral-syysottelu': { type: 'serial' },
        'sral-joulu': { type: 'static', exchange: 'HYVÄÄ JOULUA' },
        'sac': { type: 'serial' },
        'cq-wpx': { type: 'serial' },
        'cq-ww-dx': { type: 'static', placeholder: 'Your CQ Zone' },
        'iaru-hf': { type: 'static', placeholder: 'Your ITU Zone' },
        'generic-static': { type: 'static', placeholder: 'Exchange' }
    };

    let currentContest = contests[contestSelector.value];

    const getQsos = () => JSON.parse(localStorage.getItem('qsos')) || [];
    const saveQsos = (qsos) => localStorage.setItem('qsos', JSON.stringify(qsos));
    const getSerialNumber = (mode) => parseInt(localStorage.getItem(`serialNumber_${mode}`) || '1', 10);
    const saveSerialNumber = (mode, number) => localStorage.setItem(`serialNumber_${mode}`, String(number));

    const renderQsos = () => {
        logbookTableBody.innerHTML = '';
        const qsos = getQsos();
        qsos.forEach((qso, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${qso.date}</td>
                <td>${qso.time}</td>
                <td>${qso.call}</td>
                <td>${qso.band}</td>
                <td>${qso.mode}</td>
                <td>${qso.rstSent}</td>
                <td>${qso.rstRcvd}</td>
                <td>${qso.exchSent}</td>
                <td>${qso.exchRcvd}</td>
                <td><button class="delete-qso" data-index="${index}">X</button></td>
            `;
            logbookTableBody.appendChild(row);
        });
    };

    const setDateTime = () => {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = String(now.getUTCMonth() + 1).padStart(2, '0');
        const day = String(now.getUTCDate()).padStart(2, '0');
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        document.getElementById('date').value = `${year}-${month}-${day}`;
        document.getElementById('time').value = `${hours}:${minutes}`;
    };

    const updateExchangeSentField = () => {
        const mode = document.getElementById('mode').value;
        const rstSent = document.getElementById('rst-sent').value;

        if (currentContest.type === 'serial') {
            exchSentInput.value = String(getSerialNumber(mode)).padStart(3, '0');
            exchSentInput.readOnly = true;
            exchSentInput.placeholder = '';
        } else if (currentContest.type === 'serial-province') {
            const provinceCode = document.getElementById('province-code').value.toUpperCase();
            exchSentInput.value = `${rstSent} ${String(getSerialNumber(mode)).padStart(3, '0')} ${provinceCode}`;
            exchSentInput.readOnly = true;
            exchSentInput.placeholder = '';
        } else { // static
            if (currentContest.exchange) {
                exchSentInput.value = currentContest.exchange;
                exchSentInput.readOnly = true;
            } else {
                exchSentInput.value = localStorage.getItem('staticExchange') || '';
                exchSentInput.readOnly = false;
                exchSentInput.placeholder = currentContest.placeholder || 'Exchange';
            }
        }
    };

    logbookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newQso = {
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            call: document.getElementById('call').value,
            band: document.getElementById('band').value,
            mode: document.getElementById('mode').value,
            rstSent: document.getElementById('rst-sent').value,
            rstRcvd: document.getElementById('rst-rcvd').value,
            exchSent: document.getElementById('exch-sent').value,
            exchRcvd: document.getElementById('exch-rcvd').value,
        };

        const qsos = getQsos();
        qsos.push(newQso);
        saveQsos(qsos);

        if (currentContest.type === 'serial' || currentContest.type === 'serial-province') {
            const mode = document.getElementById('mode').value;
            saveSerialNumber(mode, getSerialNumber(mode) + 1);
        }

        renderQsos();
        document.getElementById('call').value = '';
        document.getElementById('rst-rcvd').value = '59';
        document.getElementById('exch-rcvd').value = '';
        setDateTime();
        updateExchangeSentField();
        document.getElementById('call').focus();
    });

    logbookTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-qso')) {
            const index = parseInt(e.target.getAttribute('data-index'), 10);
            let qsos = getQsos();
            qsos.splice(index, 1);
            saveQsos(qsos);
            renderQsos();
        }
    });

    const saveAndApplySelection = (element) => {
        localStorage.setItem(element.id, element.value);
    };

    const updateProvinceCodeVisibility = () => {
        if (contests[contestSelector.value].type === 'serial-province') {
            provinceCodeContainer.classList.remove('hidden');
        } else {
            provinceCodeContainer.classList.add('hidden');
        }
    };

    [contestSelector, categoryOperator, categoryBand, categoryMode, categoryPower, document.getElementById('mode'), document.getElementById('band')].forEach(sel => {
        sel.addEventListener('change', () => {
            saveAndApplySelection(sel);
            if (sel.id === 'contest') {
                currentContest = contests[contestSelector.value];
                updateProvinceCodeVisibility();
                updateExchangeSentField();
            }
        });
    });

    document.getElementById('mode').addEventListener('change', () => {
        const rstSentInput = document.getElementById('rst-sent');
        rstSentInput.value = document.getElementById('mode').value === 'CW' ? '599' : '59';
        updateExchangeSentField();
    });

    exchSentInput.addEventListener('input', (e) => {
        if (currentContest.type === 'static') localStorage.setItem('staticExchange', e.target.value);
    });

    document.getElementById('province-code').addEventListener('input', (e) => {
        localStorage.setItem('provinceCode', e.target.value.toUpperCase());
        updateExchangeSentField();
    });

    const toCabrillo = (qsos) => {
        const cabrilloInfo = JSON.parse(localStorage.getItem('cabrilloInfo')) || {};
        let cabrillo = `START-OF-LOG: 3.0\n`;
        cabrillo += `CALLSIGN: OH3CYT\n`; // Placeholder
        cabrillo += `CONTEST: ${contestSelector.value.toUpperCase()}\n`;
        cabrillo += `CATEGORY-OPERATOR: ${categoryOperator.value}\n`;
        cabrillo += `CATEGORY-BAND: ${categoryBand.value}\n`;
        cabrillo += `CATEGORY-MODE: ${categoryMode.value}\n`;
        cabrillo += `CATEGORY-POWER: ${categoryPower.value}\n`;
        cabrillo += `CREATED-BY: OH3CYT Web Logbook\n`;
        cabrillo += `NAME: ${cabrilloInfo.name || ''}\n`;
        cabrillo += `ADDRESS: ${cabrilloInfo.address || ''}\n`;
        cabrillo += `SOAPBOX: ${(cabrilloInfo.soapbox || '').replace(/\n/g, '\nSOAPBOX: ')}\n`;

        qsos.forEach(qso => {
            const freq = qso.band.replace('m', '');
            const mode = qso.mode === 'SSB' ? 'PH' : qso.mode.toUpperCase();
            const time = qso.time.replace(':', '');
            cabrillo += `QSO: ${freq} ${mode} ${qso.date} ${time} OH3CYT ${qso.rstSent} ${qso.exchSent} ${qso.call.toUpperCase()} ${qso.rstRcvd} ${qso.exchRcvd}\n`;
        });

        cabrillo += `END-OF-LOG:\n`;
        return cabrillo;
    };

    const performExport = () => {
        const qsos = getQsos();
        if (qsos.length === 0) {
            alert('Logbook is empty!');
            return;
        }
        const cabrilloData = toCabrillo(qsos);
        const blob = new Blob([cabrilloData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oh3cyt_log_${new Date().toISOString().slice(0,10)}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    exportBtn.addEventListener('click', () => {
        const cabrilloInfo = JSON.parse(localStorage.getItem('cabrilloInfo')) || {};
        if (!cabrilloInfo.name || !cabrilloInfo.address) {
            cabrilloModal.style.display = 'block';
        } else {
            performExport();
        }
    });

    closeModalBtn.addEventListener('click', () => {
        cabrilloModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == cabrilloModal) {
            cabrilloModal.style.display = 'none';
        }
    });

    cabrilloInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const cabrilloInfo = {
            name: cabrilloNameInput.value,
            address: cabrilloAddressInput.value,
            soapbox: cabrilloSoapboxInput.value
        };
        localStorage.setItem('cabrilloInfo', JSON.stringify(cabrilloInfo));
        cabrilloModal.style.display = 'none';
        performExport();
    });

    const loadFormState = () => {
        const cabrilloInfo = JSON.parse(localStorage.getItem('cabrilloInfo')) || {};
        cabrilloNameInput.value = cabrilloInfo.name || '';
        cabrilloAddressInput.value = cabrilloInfo.address || '';
        cabrilloSoapboxInput.value = cabrilloInfo.soapbox || '';

        document.getElementById('contest').value = localStorage.getItem('contest') || 'generic-serial';
        document.getElementById('mode').value = localStorage.getItem('mode') || 'SSB';
        document.getElementById('band').value = localStorage.getItem('band') || '20m';
        categoryOperator.value = localStorage.getItem('category-operator') || 'SINGLE-OP';
        categoryBand.value = localStorage.getItem('category-band') || 'ALL';
        categoryMode.value = localStorage.getItem('category-mode') || 'MIXED';
        categoryPower.value = localStorage.getItem('category-power') || 'LOW';

        currentContest = contests[contestSelector.value];
        updateProvinceCodeVisibility(); // Set initial visibility
        if (currentContest.type === 'static') {
            exchSentInput.value = localStorage.getItem('staticExchange') || '';
        }
        document.getElementById('province-code').value = localStorage.getItem('provinceCode') || '';
    };

    // Initial render and setup
    loadFormState();
    renderQsos();
    setDateTime();
    updateExchangeSentField();
    setInterval(setDateTime, 1000);
});
