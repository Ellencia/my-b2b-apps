const currentProfile = localStorage.getItem('currentProfile');
if (!currentProfile) {
    alert('업무 프로필이 선택되지 않았습니다. 프로필 선택 화면으로 이동합니다.');
    window.location.href = '../select_profile.html';
}

const getKey = (key) => `${currentProfile}_${key}`;

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
    const pcIdInput = document.getElementById('pc-id'); // New PC ID input
    const addPrinterBtnForm = document.getElementById('add-printer-btn-form');
    const addPrinterFromPresetBtn = document.getElementById('add-printer-from-preset-btn');
    const printerFormList = document.getElementById('printer-form-list');
    const presetForm = document.getElementById('preset-form');
    const presetListEl = document.getElementById('preset-list');
    const backToListFromPresetsBtn = document.getElementById('back-to-list-from-presets-btn');
    const customerCountSpan = document.getElementById('customer-count');
    const presetIdInput = document.getElementById('preset-id');
    const cancelPresetEditBtn = document.getElementById('cancel-preset-edit-btn');
    const presetFormSubmitBtn = presetForm.querySelector('button[type="submit"]');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const managePresetsBtnMenu = document.getElementById('manage-presets-btn-menu');
    const manageDepartmentPresetsBtnMenu = document.getElementById('manage-department-presets-btn-menu');
    const departmentPresetManagerContainer = document.getElementById('department-preset-manager-container');
    const departmentPresetForm = document.getElementById('department-preset-form');
    const departmentPresetListEl = document.getElementById('department-preset-list');
    const backToListFromDepartmentPresetsBtn = document.getElementById('back-to-list-from-department-presets-btn');
    const departmentPresetIdInput = document.getElementById('department-preset-id');
    const cancelDepartmentPresetEditBtn = document.getElementById('cancel-department-preset-edit-btn');
    const changeProfileLink = document.getElementById('change-profile-link');

    // --- 데이터 관리 ---
    let customers = JSON.parse(localStorage.getItem(getKey('customers'))) || [];
    let printerPresets = JSON.parse(localStorage.getItem(getKey('printerPresets'))) || [];
    let departmentPresets = JSON.parse(localStorage.getItem(getKey('departmentPresets'))) || [];

    const saveData = (key, data) => localStorage.setItem(getKey(key), JSON.stringify(data));
    const saveCustomers = () => saveData('customers', customers);
    const savePresets = () => saveData('printerPresets', printerPresets);
    const saveDepartmentPresets = () => saveData('departmentPresets', departmentPresets);

    // --- 데이터 마이그레이션 ---
    const migrateData = () => {};

    // --- UI 렌더링 ---
    const renderCustomers = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedDept = departmentFilter.value;
        const filteredCustomers = customers.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(searchTerm);
            const deptMatch = !selectedDept || c.department === selectedDept;
            return nameMatch && deptMatch;
        });
        customerCountSpan.textContent = `(${filteredCustomers.length}명)`;
        customerListEl.innerHTML = '';
        if (filteredCustomers.length === 0) {
            customerListEl.innerHTML = '<li>표시할 고객 정보가 없습니다.</li>';
            return;
        }
        filteredCustomers.forEach(c => {
            const li = document.createElement('li');
            if (c.isCompleted) {
                li.classList.add('customer-list-completed');
            } else if (c.isError) {
                li.classList.add('customer-list-error');
            } else if (c.isPending) {
                li.classList.add('customer-list-pending');
            }
            let pcIdDisplay = c.pcId ? ` <small class="customer-pc-id-display">(${c.pcId})</small>` : '';
            let departmentDisplay = c.department ? ` <small class="customer-department-display">(${c.department})</small>` : '';
            let allExtraInfoHtml = [];
            const printerDisplayHtmls = c.printers.map(printer => {
                let displayString = '';
                if (printer.presetId) {
                    const preset = printerPresets.find(p => p.id == printer.presetId);
                    if (preset) {
                        displayString = `${preset.name} (${preset.ip})`;
                    } else {
                        displayString = `${printer.model || '프린터'} (${printer.ip || 'IP 없음'}) - 프리셋 삭제됨`;
                    }
                } else {
                    displayString = `${printer.model || '프린터'} (${printer.ip || 'IP 없음'})`;
                }
                return displayString ? `<small class="customer-list-extra">🖨️ ${displayString}</small>` : null;
            }).filter(Boolean);
            allExtraInfoHtml = allExtraInfoHtml.concat(printerDisplayHtmls);

            // 백업 및 원복 상태 표시
            if (c.hasBackup && c.isRestored) {
                allExtraInfoHtml.push(`<small class="customer-list-extra">🔄 원복완료</small>`);
            } else if (c.hasBackup) {
                allExtraInfoHtml.push(`<small class="customer-list-extra">💾 백업있음</small>`);
            }

            if (c.backupNotes && c.backupNotes.trim() !== '') {
                allExtraInfoHtml.push(`<small class="customer-list-extra">📝 ${c.backupNotes}</small>`);
            }
            const extraInfoBlock = allExtraInfoHtml.length > 0 ? `<br>${allExtraInfoHtml.join('')}` : '';
            li.innerHTML = `<span><strong>${c.name}</strong>${pcIdDisplay}${departmentDisplay}<br><small>${c.ip}</small>${extraInfoBlock}</span>`;
            li.dataset.id = c.id;
            customerListEl.appendChild(li);
        });
    };

    const populateDepartmentFilter = () => {
        const departments = ['', ...new Set(customers.map(c => c.department).filter(Boolean))];
        departmentFilter.innerHTML = departments.map(d => `<option value="${d}">${d || '전체 부서'}</option>`).join('');
        const savedDepartment = localStorage.getItem(getKey('selectedDepartment'));
        if (savedDepartment) {
            departmentFilter.value = savedDepartment;
        }
    };

    const renderDetails = (customer) => {
        const printersHtml = customer.printers.map(p => `<li>${p.model} (${p.ip}:${p.port})</li>`).join('') || '<li>등록된 프린터가 없습니다.</li>';
        customerDetailsContainer.innerHTML = `
            <h2>${customer.name}</h2>
            <p><strong>PC ID:</strong> ${customer.pcId || '-'}</p>
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
                          <div>
                            <button class="btn-secondary edit-preset-btn" data-id="${p.id}">수정</button>
                            <button class="btn-danger delete-preset-btn" data-id="${p.id}">삭제</button>
                          </div>`;
            li.dataset.id = p.id;
            presetListEl.appendChild(li);
        });
    };

    const renderDepartmentPresets = () => {
        departmentPresetListEl.innerHTML = '';
        if (departmentPresets.length === 0) {
            departmentPresetListEl.innerHTML = '<li>저장된 부서 프리셋이 없습니다.</li>';
            return;
        }
        departmentPresets.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${p.name}</strong><br><small>GW: ${p.gateway || ''} / DNS: ${p.dns1 || ''}</small></span>
                          <div>
                            <button class="btn-secondary edit-department-preset-btn" data-id="${p.id}">수정</button>
                            <button class="btn-danger delete-department-preset-btn" data-id="${p.id}">삭제</button>
                          </div>`;
            li.dataset.id = p.id;
            departmentPresetListEl.appendChild(li);
        });
    };

    const showPage = (page) => {
        customerListContainer.style.display = 'none';
        customerFormContainer.style.display = 'none';
        customerDetailsContainer.style.display = 'none';
        presetManagerContainer.style.display = 'none';
        departmentPresetManagerContainer.style.display = 'none';
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
        } else if (page === 'department-presets') {
            departmentPresetManagerContainer.style.display = 'block';
        }
    };

    const showForm = (customer = null) => {
        customerForm.reset();
        printerFormList.innerHTML = '';

        const departmentDatalist = document.getElementById('department-presets-list');
        departmentDatalist.innerHTML = departmentPresets.map(p => `<option value="${p.name}"></option>`).join('');

        if (customer) {
            formTitle.textContent = '고객 정보 수정';
            customerIdInput.value = customer.id;
            document.getElementById('customer-name').value = customer.name;
            pcIdInput.value = customer.pcId || ''; // Populate PC ID
            document.getElementById('customer-department').value = customer.department;
            document.getElementById('ip-address').value = customer.ip;
            document.getElementById('subnet-mask').value = customer.subnet;
            document.getElementById('gateway').value = customer.gateway;
            document.getElementById('dns1').value = customer.dns1;
            document.getElementById('dns2').value = customer.dns2;
            document.getElementById('backup-notes').value = customer.backupNotes;
            document.getElementById('is-completed').checked = customer.isCompleted || false;
            document.getElementById('is-pending-update').checked = customer.isPending || false;
            document.getElementById('is-error-state').checked = customer.isError || false;

            // 백업 및 원복 상태 처리
            const hasBackup = customer.hasBackup || false;
            document.getElementById('has-backup').checked = hasBackup;
            document.getElementById('is-restored').checked = customer.isRestored || false;

            if (hasBackup) {
                document.getElementById('restore-status-container').style.display = 'inline-block';
            } else {
                document.getElementById('restore-status-container').style.display = 'none';
            }

            if (customer.printers) {
                customer.printers.forEach(p => addPrinterForm(p, false));
            }
        } else {
            formTitle.textContent = '새 고객 추가';
            customerIdInput.value = '';
            pcIdInput.value = ''; // Clear PC ID for new customer
            document.getElementById('is-pending-update').checked = false;
            document.getElementById('is-error-state').checked = false;
        }
        showPage('form');
    };

    const addPrinterForm = (printer = {}, isNew = true) => {
        const item = document.createElement('div');
        item.classList.add('printer-item');
        const idToStore = printer.presetId || printer.id;
        if (idToStore) {
            item.dataset.presetId = idToStore;
        }
        item.innerHTML = `
            <div class="form-group"><input type="text" class="printer-model" placeholder="모델명" value="${printer.model || ''}"></div>
            <div class="form-group"><input type="text" class="printer-ip" placeholder="IP 주소" value="${printer.ip || ''}" inputmode="numeric"></div>
            <div class="form-group"><input type="text" class="printer-port" placeholder="포트" value="${printer.port || ''}" inputmode="numeric"></div>
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

    addCustomerFAB.addEventListener('click', () => showForm());
    cancelBtn.addEventListener('click', () => showPage('list'));
    addPrinterBtnForm.addEventListener('click', () => addPrinterForm({}, true));
    backToListFromPresetsBtn.addEventListener('click', () => showPage('list'));
    backToListFromDepartmentPresetsBtn.addEventListener('click', () => showPage('list'));

    manageDepartmentPresetsBtnMenu.addEventListener('click', () => {
        renderDepartmentPresets();
        showPage('department-presets');
        dropdownMenu.classList.remove('show');
    });

    searchInput.addEventListener('input', renderCustomers);
    departmentFilter.addEventListener('change', () => {
        localStorage.setItem(getKey('selectedDepartment'), departmentFilter.value);
        renderCustomers();
    });

    document.getElementById('customer-department').addEventListener('input', (e) => {
        const departmentName = e.target.value.trim();
        const preset = departmentPresets.find(p => p.name === departmentName);
        if (preset) {
            document.getElementById('gateway').value = preset.gateway || '';
            document.getElementById('dns1').value = preset.dns1 || '';
            document.getElementById('dns2').value = preset.dns2 || '';
        }
    });

    const restoreStatusContainer = document.getElementById('restore-status-container');
    const hasBackupCheckbox = document.getElementById('has-backup');
    const isRestoredCheckbox = document.getElementById('is-restored');

    hasBackupCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            restoreStatusContainer.style.display = 'inline-block';
        } else {
            restoreStatusContainer.style.display = 'none';
            isRestoredCheckbox.checked = false; // 백업 없으면 원복도 해제
        }
    });

    customerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let newPresetsAdded = false;
        const printers = Array.from(document.querySelectorAll('.printer-item')).map(item => {
            const printerData = {
                model: item.querySelector('.printer-model').value,
                ip: item.querySelector('.printer-ip').value,
                port: item.querySelector('.printer-port').value,
                presetId: item.dataset.presetId || null
            };
            const saveAsPresetCb = item.querySelector('.save-as-preset-cb');
            if (saveAsPresetCb && saveAsPresetCb.checked) {
                const presetNameInput = item.querySelector('.preset-name-input');
                if (presetNameInput && presetNameInput.value) {
                    const newPresetId = Date.now();
                    const newPreset = {
                        model: printerData.model,
                        ip: printerData.ip,
                        port: printerData.port,
                        id: newPresetId,
                        name: presetNameInput.value
                    };
                    printerPresets.push(newPreset);
                    newPresetsAdded = true;
                    printerData.presetId = newPresetId;
                }
            }
            return printerData;
        });
        if (newPresetsAdded) savePresets();

        const customerData = {
            id: customerIdInput.value ? parseInt(customerIdInput.value) : Date.now(),
            name: document.getElementById('customer-name').value,
            pcId: pcIdInput.value, // Store PC ID
            department: document.getElementById('customer-department').value,
            isCompleted: document.getElementById('is-completed').checked,
            isPending: document.getElementById('is-pending-update').checked,
            isError: document.getElementById('is-error-state').checked,
            hasBackup: document.getElementById('has-backup').checked,
            isRestored: document.getElementById('has-backup').checked ? document.getElementById('is-restored').checked : false,
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

    const resetPresetForm = () => {
        presetForm.reset();
        presetIdInput.value = '';
        presetFormSubmitBtn.textContent = '프리셋 저장';
        cancelPresetEditBtn.style.display = 'none';
    }

    presetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const presetId = presetIdInput.value;
        const presetData = {
            name: document.getElementById('preset-name').value,
            model: document.getElementById('preset-model').value,
            ip: document.getElementById('preset-ip').value,
            port: document.getElementById('preset-port').value,
        };
        if (presetId) {
            const index = printerPresets.findIndex(p => p.id == presetId);
            if (index > -1) {
                printerPresets[index] = { ...printerPresets[index], ...presetData };
                let wasAnyCustomerModified = false;
                customers.forEach(customer => {
                    customer.printers.forEach(printer => {
                        if (printer.presetId && printer.presetId == presetId) {
                            printer.model = presetData.model;
                            printer.ip = presetData.ip;
                            printer.port = presetData.port;
                            wasAnyCustomerModified = true;
                        }
                    });
                });
                if (wasAnyCustomerModified) {
                    saveCustomers();
                    alert('이 프리셋을 사용하는 고객들의 프린터 정보가 업데이트되었습니다.');
                }
            }
        } else {
            printerPresets.push({ ...presetData, id: Date.now() });
        }
        savePresets();
        renderPresets();
        resetPresetForm();
    });

    presetListEl.addEventListener('click', (e) => {
        const presetId = e.target.dataset.id;
        if (e.target.classList.contains('delete-preset-btn')) {
            if (confirm('정말로 이 프리셋을 삭제하시겠습니까?')) {
                printerPresets = printerPresets.filter(p => p.id != presetId);
                savePresets();
                renderPresets();
            }
        } else if (e.target.classList.contains('edit-preset-btn')) {
            const preset = printerPresets.find(p => p.id == presetId);
            if (preset) {
                presetIdInput.value = preset.id;
                document.getElementById('preset-name').value = preset.name;
                document.getElementById('preset-model').value = preset.model;
                document.getElementById('preset-ip').value = preset.ip;
                document.getElementById('preset-port').value = preset.port;
                presetFormSubmitBtn.textContent = '프리셋 수정';
                cancelPresetEditBtn.style.display = 'inline-block';
            }
        }
    });

    cancelPresetEditBtn.addEventListener('click', resetPresetForm);

    const resetDepartmentPresetForm = () => {
        departmentPresetForm.reset();
        departmentPresetIdInput.value = '';
        departmentPresetForm.querySelector('button[type="submit"]').textContent = '부서 프리셋 저장';
        cancelDepartmentPresetEditBtn.style.display = 'none';
    }

    departmentPresetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const presetId = departmentPresetIdInput.value;
        const presetData = {
            name: document.getElementById('department-preset-name').value.trim(),
            gateway: document.getElementById('department-preset-gateway').value,
            dns1: document.getElementById('department-preset-dns1').value,
            dns2: document.getElementById('department-preset-dns2').value,
        };
        if (presetId) {
            const index = departmentPresets.findIndex(p => p.id == presetId);
            if (index > -1) {
                departmentPresets[index] = { ...departmentPresets[index], ...presetData };
            }
        } else {
            departmentPresets.push({ ...presetData, id: Date.now() });
        }
        saveDepartmentPresets();
        renderDepartmentPresets();
        resetDepartmentPresetForm();
    });

    departmentPresetListEl.addEventListener('click', (e) => {
        const presetId = e.target.dataset.id;
        if (e.target.classList.contains('delete-department-preset-btn')) {
            if (confirm('정말로 이 부서 프리셋을 삭제하시겠습니까?')) {
                departmentPresets = departmentPresets.filter(p => p.id != presetId);
                saveDepartmentPresets();
                renderDepartmentPresets();
            }
        } else if (e.target.classList.contains('edit-department-preset-btn')) {
            const preset = departmentPresets.find(p => p.id == presetId);
            if (preset) {
                departmentPresetIdInput.value = preset.id;
                document.getElementById('department-preset-name').value = preset.name;
                document.getElementById('department-preset-gateway').value = preset.gateway;
                document.getElementById('department-preset-dns1').value = preset.dns1;
                document.getElementById('department-preset-dns2').value = preset.dns2;
                departmentPresetForm.querySelector('button[type="submit"]').textContent = '부서 프리셋 수정';
                cancelDepartmentPresetEditBtn.style.display = 'inline-block';
            }
        }
    });

    cancelDepartmentPresetEditBtn.addEventListener('click', resetDepartmentPresetForm);

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

    // --- Hamburger Menu Logic ---
    menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    managePresetsBtnMenu.addEventListener('click', () => {
        renderPresets();
        showPage('presets');
        dropdownMenu.classList.remove('show');
    });

    changeProfileLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('현재 프로필을 로그아웃하고 프로필 선택 화면으로 이동하시겠습니까?')) {
            localStorage.removeItem('currentProfile');
            window.location.href = '../select_profile.html';
        }
    });

    window.addEventListener('click', (e) => {
        if (dropdownMenu && !dropdownMenu.contains(e.target) && !menuToggleBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });

    // --- 초기화 ---
    migrateData();
    populateDepartmentFilter();
    renderCustomers();
    showPage('list');

    const hash = window.location.hash;
    if (hash && hash.startsWith('#customer-')) {
        const customerId = hash.substring(10);
        const customer = customers.find(c => c.id == customerId);
        if (customer) {
            renderDetails(customer);
        }
    }
});