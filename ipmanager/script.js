document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 선택 ---
    const customerListEl = document.getElementById('customer-list');
    const addCustomerFAB = document.getElementById('add-customer-fab');
    const searchInput = document.getElementById('search-input');
    const departmentFilter = document.getElementById('department-filter');
    const customerFormContainer = document.getElementById('customer-form-container');
    const customerListContainer = document.getElementById('customer-list-container');
    const customerDetailsContainer = document.getElementById('customer-details-container');
    const presetManagerContainer = document.getElementById('preset-manager-container');
    const customerForm = document.getElementById('customer-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');
    const customerIdInput = document.getElementById('customer-id');
    const addPrinterBtnForm = document.getElementById('add-printer-btn-form');
    const addPrinterFromPresetBtn = document.getElementById('add-printer-from-preset-btn');
    const printerFormList = document.getElementById('printer-form-list');
    const managePresetsBtn = document.getElementById('manage-presets-btn');
    const presetForm = document.getElementById('preset-form');
    const presetListEl = document.getElementById('preset-list');
    const backToListFromPresetsBtn = document.getElementById('back-to-list-from-presets-btn');

    // --- 데이터 관리 ---
    let customers = JSON.parse(localStorage.getItem('customers')) || [];
    let printerPresets = JSON.parse(localStorage.getItem('printerPresets')) || [];

    const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const saveCustomers = () => saveData('customers', customers);
    const savePresets = () => saveData('printerPresets', printerPresets);

    // --- 데이터 마이그레이션 ---
    const migrateData = () => {
        let needsSave = false;
        customers.forEach(c => {
            // company -> department
            if (c.company !== undefined) {
                c.department = c.company;
                delete c.company;
                needsSave = true;
            }
            // Add backupNotes and printers if they don't exist
            if (c.backupNotes === undefined) { c.backupNotes = ''; needsSave = true; }
            if (c.printers === undefined) { c.printers = []; needsSave = true; }
        });
        if (needsSave) saveCustomers();
    };

    // --- UI 렌더링 ---
    const renderCustomers = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedDept = departmentFilter.value;

        const filteredCustomers = customers.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(searchTerm);
            const deptMatch = !selectedDept || c.department === selectedDept;
            return nameMatch && deptMatch;
        });

        customerListEl.innerHTML = '';
        if (filteredCustomers.length === 0) {
            customerListEl.innerHTML = '<li>표시할 고객 정보가 없습니다.</li>';
            return;
        }
        filteredCustomers.forEach(c => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${c.name}</strong><br><small>${c.department || ''} / ${c.ip}</small></span>`;
            li.dataset.id = c.id;
            customerListEl.appendChild(li);
        });
    };

    const populateDepartmentFilter = () => {
        const departments = ['', ...new Set(customers.map(c => c.department).filter(Boolean))];
        departmentFilter.innerHTML = departments.map(d => `<option value="${d}">${d || '전체 부서'}</option>`).join('');
    };

    const renderDetails = (customer) => {
        const printersHtml = customer.printers.map(p => `<li>${p.model} (${p.ip}:${p.port})</li>`).join('') || '<li>등록된 프린터가 없습니다.</li>';
        customerDetailsContainer.innerHTML = `
            <h2>${customer.name}</h2>
            <p><strong>소속(부서):</strong> ${customer.department || '-'}</p>
            <h3>네트워크 정보</h3>
            <p>IP: ${customer.ip}, 서브넷: ${customer.subnet || '-'}, 게이트웨이: ${customer.gateway || '-'}</p>
            <p>DNS: ${customer.dns1 || '-'} / ${customer.dns2 || '-'}</p>
            <h3>백업 정보</h3><p>${customer.backupNotes || '특이사항 없음'}</p>
            <h3>프린터 정보</h3><ul>${printersHtml}</ul>
            <div class="form-actions">
                <button type="button" class="btn-secondary" id="edit-btn" data-id="${customer.id}">수정</button>
                <button type="button" class="btn-danger" id="delete-btn" data-id="${customer.id}">삭제</button>
                <button type="button" class="btn-secondary" id="back-to-list-btn">목록으로</button>
            </div>`;
        showPage('details');
    };

    const renderPresets = () => {
        presetListEl.innerHTML = '';
        if (printerPresets.length === 0) {
            presetListEl.innerHTML = '<li>저장된 프리셋이 없습니다.</li>';
            return;
        }
        printerPresets.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${p.name}</strong><br><small>${p.model} - ${p.ip}</small></span>
                          <button class="btn-danger delete-preset-btn" data-id="${p.id}">삭제</button>`;
            li.dataset.id = p.id;
            presetListEl.appendChild(li);
        });
    };

    // --- UI 상태 변경 함수 ---
    const showPage = (page) => {
        customerListContainer.style.display = 'none';
        customerFormContainer.style.display = 'none';
        customerDetailsContainer.style.display = 'none';
        presetManagerContainer.style.display = 'none';
        addCustomerFAB.style.display = 'none';

        if (page === 'list') {
            customerListContainer.style.display = 'block';
            addCustomerFAB.style.display = 'flex';
        } else if (page === 'form') {
            customerFormContainer.style.display = 'block';
        } else if (page === 'details') {
            customerDetailsContainer.style.display = 'block';
        } else if (page === 'presets') {
            presetManagerContainer.style.display = 'block';
        }
    };

    const showForm = (customer = null) => {
        customerForm.reset();
        printerFormList.innerHTML = ''; // 프린터 폼 초기화

        if (customer) {
            formTitle.textContent = '고객 정보 수정';
            customerIdInput.value = customer.id;
            document.getElementById('customer-name').value = customer.name;
            document.getElementById('customer-department').value = customer.department;
            document.getElementById('ip-address').value = customer.ip;
            document.getElementById('subnet-mask').value = customer.subnet;
            document.getElementById('gateway').value = customer.gateway;
            document.getElementById('dns1').value = customer.dns1;
            document.getElementById('dns2').value = customer.dns2;
            document.getElementById('backup-notes').value = customer.backupNotes;
            if (customer.printers) {
                customer.printers.forEach(p => addPrinterForm(p, false));
            }
        } else {
            formTitle.textContent = '새 고객 추가';
            customerIdInput.value = '';
        }
        showPage('form');
    };

    const addPrinterForm = (printer = {}, isNew = true) => {
        const item = document.createElement('div');
        item.classList.add('printer-item');
        item.innerHTML = `
            <div class="form-group"><input type="text" class="printer-model" placeholder="모델명" value="${printer.model || ''}"></div>
            <div class="form-group"><input type="text" class="printer-ip" placeholder="IP 주소" value="${printer.ip || ''}"></div>
            <div class="form-group"><input type="text" class="printer-port" placeholder="포트" value="${printer.port || ''}"></div>
            <button type="button" class="btn-danger remove-printer-btn">삭제</button>
            ${isNew ? 
            `<div class="preset-save-option">
                <input type="checkbox" class="save-as-preset-cb">
                <label>이 프린터를 프리셋으로 저장</label>
                <input type="text" class="preset-name-input" placeholder="프리셋 이름">
            </div>` : ''}
        `;
        printerFormList.appendChild(item);
    };

    // --- 이벤트 리스너 ---
    addCustomerFAB.addEventListener('click', () => showForm());
    cancelBtn.addEventListener('click', () => showPage('list'));
    addPrinterBtnForm.addEventListener('click', () => addPrinterForm({}, true));
    managePresetsBtn.addEventListener('click', () => { renderPresets(); showPage('presets'); });
    backToListFromPresetsBtn.addEventListener('click', () => showPage('list'));
    searchInput.addEventListener('input', renderCustomers);
    departmentFilter.addEventListener('change', renderCustomers);

    customerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let newPresetsAdded = false;
        const printers = Array.from(document.querySelectorAll('.printer-item')).map(item => {
            const printerData = {
                model: item.querySelector('.printer-model').value,
                ip: item.querySelector('.printer-ip').value,
                port: item.querySelector('.printer-port').value,
            };
            const saveAsPresetCb = item.querySelector('.save-as-preset-cb');
            if (saveAsPresetCb && saveAsPresetCb.checked) {
                const presetNameInput = item.querySelector('.preset-name-input');
                if (presetNameInput && presetNameInput.value) {
                    printerPresets.push({ ...printerData, id: Date.now(), name: presetNameInput.value });
                    newPresetsAdded = true;
                }
            }
            return printerData;
        });

        if(newPresetsAdded) savePresets();

        const customerData = {
            id: customerIdInput.value ? parseInt(customerIdInput.value) : Date.now(),
            name: document.getElementById('customer-name').value,
            department: document.getElementById('customer-department').value,
            ip: document.getElementById('ip-address').value,
            subnet: document.getElementById('subnet-mask').value,
            gateway: document.getElementById('gateway').value,
            dns1: document.getElementById('dns1').value,
            dns2: document.getElementById('dns2').value,
            backupNotes: document.getElementById('backup-notes').value,
            printers: printers
        };
        const existingIndex = customers.findIndex(c => c.id == customerData.id);
        if (existingIndex > -1) customers[existingIndex] = customerData;
        else customers.push(customerData);
        
        saveCustomers();
        populateDepartmentFilter();
        renderCustomers();
        showPage('list');
    });

    customerListEl.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (li && li.dataset.id) {
            const customer = customers.find(c => c.id == li.dataset.id);
            if (customer) {
                renderDetails(customer);
            }
        }
    });

    printerFormList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-printer-btn')) e.target.closest('.printer-item').remove();
        if (e.target.classList.contains('save-as-preset-cb')) {
            const input = e.target.closest('.preset-save-option').querySelector('.preset-name-input');
            input.style.display = e.target.checked ? 'block' : 'none';
        }
    });

    customerDetailsContainer.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (e.target.id === 'back-to-list-btn') {
            showPage('list');
        } else if (e.target.id === 'edit-btn') {
            const customer = customers.find(c => c.id == id);
            showForm(customer);
        } else if (e.target.id === 'delete-btn') {
            if (confirm('정말로 이 고객 정보를 삭제하시겠습니까?')) {
                customers = customers.filter(c => c.id != id);
                saveCustomers();
                populateDepartmentFilter();
                renderCustomers();
                showPage('list');
            }
        }
    });

    presetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const presetData = {
            id: Date.now(),
            name: document.getElementById('preset-name').value,
            model: document.getElementById('preset-model').value,
            ip: document.getElementById('preset-ip').value,
            port: document.getElementById('preset-port').value,
        };
        printerPresets.push(presetData);
        savePresets();
        renderPresets();
        presetForm.reset();
    });

    presetListEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-preset-btn')) {
            printerPresets = printerPresets.filter(p => p.id != e.target.dataset.id);
            savePresets();
            renderPresets();
        }
    });

    addPrinterFromPresetBtn.addEventListener('click', () => {
        if (printerPresets.length === 0) {
            alert('저장된 프리셋이 없습니다. 먼저 프리셋을 추가해주세요.');
            return;
        }
        const select = document.createElement('select');
        select.innerHTML = '<option value="">프리셋 선택...</option>' + 
                           printerPresets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        printerFormList.appendChild(select);
        select.addEventListener('change', e => {
            const preset = printerPresets.find(p => p.id == e.target.value);
            if(preset) addPrinterForm(preset, false);
            select.remove();
        });
    });

    // --- 초기화 ---
    migrateData();
    populateDepartmentFilter();
    renderCustomers();
    showPage('list');
});
