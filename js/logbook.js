document.addEventListener('DOMContentLoaded', () => {
    const logbookForm = document.getElementById('logbook-form');
    const logbookTableBody = document.querySelector('#logbook-table tbody');
    const exportBtn = document.getElementById('export-cabrillo');
    const contestSelector = document.getElementById('contest');
    const exchSentInput = document.getElementById('exch-sent');

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

    const getQsos = () => {
        return JSON.parse(localStorage.getItem('qsos')) || [];
    };

    const saveQsos = (qsos) => {
        localStorage.setItem('qsos', JSON.stringify(qsos));
    };

    const getSerialNumber = (mode) => {
        const key = `serialNumber_${mode}`;
        return parseInt(localStorage.getItem(key) || '1', 10);
    };

    const saveSerialNumber = (mode, number) => {
        const key = `serialNumber_${mode}`;
        localStorage.setItem(key, String(number));
    };

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
            const serial = getSerialNumber(mode);
            exchSentInput.value = String(serial).padStart(3, '0');
            exchSentInput.readOnly = true;
            exchSentInput.placeholder = '';
        } else if (currentContest.type === 'serial-province') {
            const serial = getSerialNumber(mode);
            const provinceCode = document.getElementById('province-code').value.toUpperCase();
            exchSentInput.value = `${rstSent} ${String(serial).padStart(3, '0')} ${provinceCode}`;
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
            const currentSerial = getSerialNumber(mode);
            saveSerialNumber(mode, currentSerial + 1);
        }

        renderQsos();

        // Manually clear only the necessary fields for fast contest logging
        document.getElementById('call').value = '';
        document.getElementById('rst-rcvd').value = '59';
        document.getElementById('exch-rcvd').value = '';

        // Restore selections that might have been cleared by reset() if it were used
        // This is now handled by not calling reset()
        const selectedContest = localStorage.getItem('selectedContest');
        if (selectedContest) contestSelector.value = selectedContest;
        const selectedMode = localStorage.getItem('selectedMode');
        if (selectedMode) document.getElementById('mode').value = selectedMode;
        const selectedBand = localStorage.getItem('selectedBand');
        if (selectedBand) document.getElementById('band').value = selectedBand;


        setDateTime(); // Update date/time for next entry
        updateExchangeSentField(); // Update serial number for next entry
        document.getElementById('call').focus(); // Set focus to callsign field for next entry
    });

    logbookTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-qso')) {
            const index = parseInt(e.target.getAttribute('data-index'), 10);
            let qsos = getQsos();
            qsos.splice(index, 1);
            saveQsos(qsos);
            renderQsos();
            // Note: Serial number does not decrement on delete, which is correct for contest logs.
        }
    });

    contestSelector.addEventListener('change', (e) => {
        currentContest = contests[e.target.value];
        localStorage.setItem('selectedContest', e.target.value);
        updateExchangeSentField();
    });

    document.getElementById('mode').addEventListener('change', (e) => {
        const mode = e.target.value;
        localStorage.setItem('selectedMode', mode);

        // Automatically update RST based on mode
        const rstSentInput = document.getElementById('rst-sent');
        if (mode === 'CW') {
            rstSentInput.value = '599';
        } else {
            rstSentInput.value = '59';
        }

        updateExchangeSentField();
    });

    document.getElementById('band').addEventListener('change', (e) => {
        localStorage.setItem('selectedBand', e.target.value);
    });

    exchSentInput.addEventListener('input', (e) => {
        if (currentContest.type === 'static') {
            localStorage.setItem('staticExchange', e.target.value);
        }
    });

    document.getElementById('province-code').addEventListener('input', (e) => {
        localStorage.setItem('provinceCode', e.target.value.toUpperCase());
        updateExchangeSentField(); // Update exchange in real-time as province code is typed
    });

    const toCabrillo = (qsos) => {
        const contest = contestSelector.value.toUpperCase();
        let cabrillo = `START-OF-LOG: 3.0\n`;
        cabrillo += `CONTEST: ${contest}\n`;
        cabrillo += `CALLSIGN: OH3CYT\n`; // Placeholder
        cabrillo += `CATEGORY-OPERATOR: SINGLE-OP\n`;
        cabrillo += `CATEGORY-BAND: ALL\n`;
        cabrillo += `CATEGORY-MODE: MIXED\n`;
        cabrillo += `CATEGORY-POWER: LOW\n`;
        cabrillo += `CREATED-BY: OH3CYT Web Logbook\n`;
        cabrillo += `NAME: \n`;
        cabrillo += `ADDRESS: \n`;
        cabrillo += `SOAPBOX: \n`;

        qsos.forEach(qso => {
            const freq = qso.band.replace('m', '');
            const mode = qso.mode === 'SSB' ? 'PH' : qso.mode;
            const time = qso.time.replace(':', '');
            cabrillo += `QSO: ${freq} ${mode} ${qso.date} ${time} OH3CYT ${qso.rstSent} ${qso.exchSent} ${qso.call.toUpperCase()} ${qso.rstRcvd} ${qso.exchRcvd}\n`;
        });

        cabrillo += `END-OF-LOG:\n`;
        return cabrillo;
    };

    exportBtn.addEventListener('click', () => {
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
    });

    const loadFormState = () => {
        const selectedContest = localStorage.getItem('selectedContest');
        if (selectedContest) {
            contestSelector.value = selectedContest;
            currentContest = contests[selectedContest];
        }

        const selectedMode = localStorage.getItem('selectedMode');
        if (selectedMode) {
            document.getElementById('mode').value = selectedMode;
        }

        const selectedBand = localStorage.getItem('selectedBand');
        if (selectedBand) {
            document.getElementById('band').value = selectedBand;
        }

        if (currentContest.type === 'static') {
            const staticExchange = localStorage.getItem('staticExchange');
            if (staticExchange) {
                exchSentInput.value = staticExchange;
            }
        }

        const provinceCode = localStorage.getItem('provinceCode');
        if (provinceCode) {
            document.getElementById('province-code').value = provinceCode;
        }
    };

    // Initial render and setup
    loadFormState();
    renderQsos();
    setDateTime();
    updateExchangeSentField();

    // Keep date and time updated
    setInterval(setDateTime, 1000);
});
