document.addEventListener('DOMContentLoaded', () => {
    const logbookForm = document.getElementById('logbook-form');
    const logbookTableBody = document.querySelector('#logbook-table tbody');
    const exportAdifBtn = document.getElementById('export-adif');
    const contestSelector = document.getElementById('contest');
    const exchSentInput = document.getElementById('exch-sent');

    const contests = {
        'generic-serial': { type: 'serial' },
        'sac': { type: 'serial' },
        'cq-wpx': { type: 'serial' },
        'cq-ww-dx': { type: 'static', placeholder: 'Your CQ Zone' },
        'iaru-hf': { type: 'static', placeholder: 'Your ITU Zone' },
        'peruskisa': { type: 'static', placeholder: 'Your Municipality Code' },
        'generic-static': { type: 'static', placeholder: 'Exchange' }
    };

    let currentContest = contests[contestSelector.value];

    const getQsos = () => {
        return JSON.parse(localStorage.getItem('qsos')) || [];
    };

    const saveQsos = (qsos) => {
        localStorage.setItem('qsos', JSON.stringify(qsos));
    };

    const getSerialNumber = () => {
        return parseInt(localStorage.getItem('serialNumber') || '1', 10);
    };

    const saveSerialNumber = (number) => {
        localStorage.setItem('serialNumber', String(number));
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
        if (currentContest.type === 'serial') {
            const serial = getSerialNumber();
            exchSentInput.value = String(serial).padStart(3, '0');
            exchSentInput.readOnly = true;
            exchSentInput.placeholder = '';
        } else {
            exchSentInput.value = localStorage.getItem('staticExchange') || '';
            exchSentInput.readOnly = false;
            exchSentInput.placeholder = currentContest.placeholder || 'Exchange';
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

        if (currentContest.type === 'serial') {
            const currentSerial = getSerialNumber();
            saveSerialNumber(currentSerial + 1);
        }

        renderQsos();
        logbookForm.reset();
        setDateTime();
        updateExchangeSentField();
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
        localStorage.setItem('selectedMode', e.target.value);
    });

    exchSentInput.addEventListener('input', (e) => {
        if (currentContest.type === 'static') {
            localStorage.setItem('staticExchange', e.target.value);
        }
    });

    const toAdif = (qsos) => {
        let adif = `ADIF Export from OH3CYT Web Logbook\n<EOH>\n\n`;
        qsos.forEach(qso => {
            adif += `<QSO_DATE:${qso.date.length}>${qso.date.replace(/-/g, '')}\n`;
            adif += `<TIME_ON:${qso.time.length}>${qso.time.replace(/:/g, '')}\n`;
            adif += `<CALL:${qso.call.length}>${qso.call.toUpperCase()}\n`;
            adif += `<BAND:${qso.band.length}>${qso.band.toUpperCase()}\n`;
            adif += `<MODE:${qso.mode.length}>${qso.mode.toUpperCase()}\n`;
            adif += `<RST_SENT:${qso.rstSent.length}>${qso.rstSent}\n`;
            adif += `<RST_RCVD:${qso.rstRcvd.length}>${qso.rstRcvd}\n`;
            adif += `<SRX_STRING:${qso.exchRcvd.length}>${qso.exchRcvd}\n`;
            adif += `<STX_STRING:${qso.exchSent.length}>${qso.exchSent}\n`;
            adif += `<EOR>\n\n`;
        });
        return adif;
    };

    exportAdifBtn.addEventListener('click', () => {
        const qsos = getQsos();
        if (qsos.length === 0) {
            alert('Logbook is empty!');
            return;
        }
        const adifData = toAdif(qsos);
        const blob = new Blob([adifData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oh3cyt_log_${new Date().toISOString().slice(0,10)}.adi`;
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

        if (currentContest.type === 'static') {
            const staticExchange = localStorage.getItem('staticExchange');
            if (staticExchange) {
                exchSentInput.value = staticExchange;
            }
        }
    };

    // Initial render and setup
    loadFormState();
    renderQsos();
    setDateTime();
    updateExchangeSentField();
});
