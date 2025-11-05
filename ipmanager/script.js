const currentProfile = localStorage.getItem('currentProfile');
if (!currentProfile) {
    alert('업무 프로필이 선택되지 않았습니다. 프로필 선택 화면으로 이동합니다.');
    window.location.href = '../select_profile.html';
}

const getKey = (key) => `${currentProfile}_${key}`;

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 선택 ---
    const mainEl = document.querySelector('main');
    const customerListEl = document.getElementById('customer-list');
    const addCustomerFAB = document.getElementById('add-customer-fab');
    const searchInput = document.getElementById('search-input');
    const departmentFilter = document.getElementById('department-filter');
    const sortOrderFilter = document.getElementById('sort-order-filter'); // 추가
    const customerFormContainer = document.getElementById('customer-form-container');
    const departmentInput = document.getElementById('customer-department'); // ▼ [추가]
    const departmentResultsEl = document.getElementById('department-autocomplete-results'); // ▼ [추가]
    const workerNameInput = document.getElementById('worker-name'); // ▼ [추가]
    const workerResultsEl = document.getElementById('worker-autocomplete-results'); // ▼ [추가]
    const customerListContainer = document.getElementById('customer-list-container');
    const customerDetailsContainer = document.getElementById('customer-details-container');
    const presetManagerContainer = document.getElementById('preset-manager-container');
    const customerForm = document.getElementById('customer-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');
    const customerIdInput = document.getElementById('customer-id');
    const createdAtInput = document.getElementById('created-at');
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

    // --- 유틸리티 함수 ---
    const toLocalISOString = (timestamp) => {
        const date = new Date(timestamp);
        // 로컬 시간대에 맞게 오프셋을 조정합니다.
        const tzOffset = date.getTimezoneOffset() * 60000; // 분 -> 밀리초
        const localDate = new Date(date.getTime() - tzOffset);
        // 'YYYY-MM-DDTHH:MM' 형식으로 자릅니다.
        return localDate.toISOString().slice(0, 16);
    };

    // --- 데이터 관리 ---
    let customers = JSON.parse(localStorage.getItem(getKey('customers'))) || [];
    let printerPresets = JSON.parse(localStorage.getItem(getKey('printerPresets'))) || [];
    let departmentPresets = JSON.parse(localStorage.getItem(getKey('departmentPresets'))) || [];
    let workerNames = JSON.parse(localStorage.getItem(getKey('workerNames'))) || []; // ▼ [추가]

    const saveData = (key, data) => localStorage.setItem(getKey(key), JSON.stringify(data));
    const saveCustomers = () => saveData('customers', customers);
    const savePresets = () => saveData('printerPresets', printerPresets);
    const saveDepartmentPresets = () => saveData('departmentPresets', departmentPresets);
    const saveWorkerNames = () => saveData('workerNames', workerNames); // ▼ [추가]

    // --- 데이터 마이그레이션 ---
    const migrateData = () => {};

    // --- UI 렌더링 ---
    const renderCustomers = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedDept = departmentFilter.value;

        // --- ▼ [수정] 검색 로직 (기능 1) ▼ ---
        const filteredCustomers = customers.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(searchTerm);
            const ipMatch = (c.ip || '').toLowerCase().includes(searchTerm);
            const pcIdMatch = (c.pcId || '').toLowerCase().includes(searchTerm);
            const workerNameMatch = (c.workerName || '').toLowerCase().includes(searchTerm);
            const searchMatch = nameMatch || ipMatch || pcIdMatch || workerNameMatch;

            const deptMatch = !selectedDept || c.department === selectedDept;
            return searchMatch && deptMatch;
        });
        // --- ▲ [수정] ▲ ---

        // --- ▼ [추가] 정렬 로직 (기능 2) ▼ ---
        const sortOrder = sortOrderFilter.value;
        let sortedCustomers = [...filteredCustomers]; // 정렬을 위해 배열 복사
        if (sortOrder === 'oldest') {
            // 오래된순 (createdAt 오름차순)
            sortedCustomers.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        } else if (sortOrder === 'latest') {
            // 최신순 (createdAt 타임스탬프 기준, 내림차순)
            sortedCustomers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else if (sortOrder === 'name-asc') {
            // 이름 (오름차순)
            sortedCustomers.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'department-asc') {
            // 부서 (오름차순), 부서 같으면 이름순
            sortedCustomers.sort((a, b) => {
                const deptCompare = (a.department || '').localeCompare(b.department || '');
                if (deptCompare !== 0) return deptCompare;
                return a.name.localeCompare(b.name);
            });
        }

        customerCountSpan.textContent = `(${sortedCustomers.length}명)`; // sortedCustomers 사용
        customerListEl.innerHTML = '';
        if (sortedCustomers.length === 0) { // sortedCustomers 사용
            customerListEl.innerHTML = '<li>표시할 고객 정보가 없습니다.</li>';
            return;
        }
        
        // sortedCustomers를 사용해 목록 렌더링
        sortedCustomers.forEach(c => { 
            const li = document.createElement('li');
            if (c.isCompleted) {
                li.classList.add('customer-list-completed');
            } else if (c.isError) {
                li.classList.add('customer-list-error');
            } else if (c.isPending) {
                li.classList.add('customer-list-pending');
            }
            let pcIdDisplay = c.pcId ? ` <small class="customer-pc-id-display">(${c.pcId})</small>` : '';
            let workerNameDisplay = c.workerName ? ` <small class="customer-worker-name-display">(${c.workerName})</small>` : '';
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

            let createdAtDisplay = '등록일: 날짜 없음'; // 기본값
            // c.createdAt의 타입이 'number'인 경우에만 날짜로 변환 시도
            if (typeof c.createdAt === 'number') { 
                createdAtDisplay = `등록일: ${new Date(c.createdAt).toLocaleDateString()}`;
            }
            // ▲▲▲
            // 고객 목록 항목 구성
            li.innerHTML = `<span><strong>${c.name}</strong>${departmentDisplay}${pcIdDisplay}${workerNameDisplay}<br><small>${c.ip}</small><br><small>${createdAtDisplay}</small>${extraInfoBlock}</span>`;
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

    // 고객 상세 정보 렌더링
    const renderDetails = (customer) => {
        const printersHtml = customer.printers.map(p => `<li>${p.model} (${p.ip}:${p.port})</li>`).join('') || '<li>등록된 프린터가 없습니다.</li>';
        customerDetailsContainer.innerHTML = `
            <h2>${customer.name}</h2>
            <p><strong>등록일:</strong> ${new Date(customer.createdAt).toLocaleString()}</p>
            <p><strong>소속(부서):</strong> ${customer.department || '-'}</p>
            <p><strong>PC ID:</strong> ${customer.pcId || '-'}</p>
            <p><strong>PC 작업자:</strong> ${customer.workerName || '-'}</p>
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
                    li.innerHTML = `<span><strong>${p.name}</strong>
                          <br><small>IP: ${p.ipPrefix || 'N/A'} | SN: ${p.subnet || 'N/A'}</small>
                          <br><small>GW: ${p.gateway || 'N/A'} | DNS: ${p.dns1 || 'N/A'}</small>
                          </span>
                          <div>
                            <button class="btn-secondary edit-department-preset-btn" data-id="${p.id}">수정</button>
                            <button class="btn-danger delete-department-preset-btn" data-id="${p.id}">삭제</button>
                          </div>`;
            li.dataset.id = p.id;
            departmentPresetListEl.appendChild(li);
        });
    };

    const showPage = (page) => {
        const isDesktop = window.innerWidth >= 768;

        // On mobile, the FAB is hidden on all pages except the list
        addCustomerFAB.style.display = 'none';

        if (isDesktop) {
            // On desktop, the list is always visible. We just control the right column.
            customerFormContainer.style.display = 'none';
            customerDetailsContainer.style.display = 'none';
            presetManagerContainer.style.display = 'none';
            departmentPresetManagerContainer.style.display = 'none';
            mainEl.classList.remove('details-visible');

            if (page === 'form') {
                customerFormContainer.style.display = 'block';
                mainEl.classList.add('details-visible');
            } else if (page === 'details') {
                customerDetailsContainer.style.display = 'block';
                mainEl.classList.add('details-visible');
            } else if (page === 'presets') {
                presetManagerContainer.style.display = 'block';
                mainEl.classList.add('details-visible');
            } else if (page === 'department-presets') {
                departmentPresetManagerContainer.style.display = 'block';
                mainEl.classList.add('details-visible');
            }
            // If page is 'list', we do nothing, as the right column is already hidden.
            
            // FAB is always visible on desktop
            addCustomerFAB.style.display = 'flex';

        } else {
            // Mobile behavior (the original logic)
            customerListContainer.style.display = 'none';
            customerFormContainer.style.display = 'none';
            customerDetailsContainer.style.display = 'none';
            presetManagerContainer.style.display = 'none';
            departmentPresetManagerContainer.style.display = 'none';

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
        }
    };

    // 제출 폼 표시하기
    const showForm = (customer = null) => {
        customerForm.reset();
        printerFormList.innerHTML = '';

        const createdAtContainer = createdAtInput.parentElement;

        // ▼ [수정] datalist 코드 삭제, 자동완성 div 초기화
        departmentResultsEl.innerHTML = '';
        departmentResultsEl.classList.remove('show');
        
        // ▼ [추가] 작업자 자동완성 div 초기화
        workerResultsEl.innerHTML = '';
        workerResultsEl.classList.remove('show');
        
        if (customer) {
            formTitle.textContent = '고객 정보 수정';
            createdAtContainer.style.display = 'block'; // [추가] 등록일 필드 보이기
            customerIdInput.value = customer.id;
            createdAtInput.value = toLocalISOString(customer.createdAt || Date.now());
            document.getElementById('customer-name').value = customer.name;
            document.getElementById('worker-name').value = customer.workerName || '';
            pcIdInput.value = customer.pcId || ''; // Populate PC ID
            document.getElementById('customer-department').value = customer.department;
            document.getElementById('ip-address').value = customer.ip;
            document.getElementById('subnet-mask').value = customer.subnet;
            document.getElementById('gateway').value = customer.gateway;
            document.getElementById('dns1').value = customer.dns1;
            document.getElementById('dns2').value = customer.dns2;
            document.getElementById('backup-notes').value = customer.backupNotes;

            // --- ▼ [수정] 상태 라디오 버튼 로딩 (기능 3) ▼ ---
            if (customer.isCompleted) {
                document.getElementById('status-completed').checked = true;
            } else if (customer.isPending) {
                document.getElementById('status-pending').checked = true;
            } else if (customer.isError) {
                document.getElementById('status-error').checked = true;
            } else {
                document.getElementById('status-none').checked = true; // 기본값
            }

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
            createdAtContainer.style.display = 'none'; // [추가] 등록일 필드 숨기기
            customerIdInput.value = '';
            pcIdInput.value = ''; // Clear PC ID for new customer
            document.getElementById('status-none').checked = true; // 새 고객 폼의 상태 초기화 (기능 3)
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
    sortOrderFilter.addEventListener('change', renderCustomers); // 추가
    departmentFilter.addEventListener('change', () => {
        localStorage.setItem(getKey('selectedDepartment'), departmentFilter.value);
        renderCustomers();
    });

    // ▼ 부서 자동완성 로직
    // (공용 함수) 부서 이름으로 네트워크 정보 채우기
    const triggerDepartmentAutofill = (departmentName) => {
        const preset = departmentPresets.find(p => p.name === departmentName);
        if (preset) {
            document.getElementById('ip-address').value = preset.ipPrefix || '';   
            document.getElementById('subnet-mask').value = preset.subnet || '';   
            document.getElementById('gateway').value = preset.gateway || '';
            document.getElementById('dns1').value = preset.dns1 || '';
            document.getElementById('dns2').value = preset.dns2 || '';
        }
    };

    // (공용 함수) 자동완성 목록 표시/필터링
    const showDepartmentAutocomplete = (filter = '') => {
        const lowerFilter = filter.toLowerCase();
        const filteredPresets = departmentPresets.filter(p => 
            p.name.toLowerCase().includes(lowerFilter)
        );

        if (filteredPresets.length === 0) {
            departmentResultsEl.classList.remove('show');
            return;
        }

        departmentResultsEl.innerHTML = filteredPresets.map(p => 
            // data-name 속성에 정확한 프리셋 이름을 저장
            `<div class="autocomplete-item" data-name="${p.name}">${p.name}</div>`
        ).join('');
        departmentResultsEl.classList.add('show');
    };

    // 1. 부서 입력창에 타이핑할 때: 목록 필터링 + 자동완성 시도
    departmentInput.addEventListener('input', () => {
        const currentName = departmentInput.value;
        showDepartmentAutocomplete(currentName); // 목록 필터링
        triggerDepartmentAutofill(currentName.trim()); // 타이핑 중에도 자동완성 시도
    });

    // 2. 부서 입력창을 '포커스'할 때 (모바일에서 중요): 전체 목록 표시
    departmentInput.addEventListener('focus', () => {
        showDepartmentAutocomplete(''); // 빈 값으로 검색 = 전체 목록 표시
    });

    // 3. 자동완성 목록(@)을 클릭(터치)할 때
    departmentResultsEl.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item && item.dataset.name) {
            const selectedName = item.dataset.name;
            departmentInput.value = selectedName;          // 1. 입력창에 값 채우기
            triggerDepartmentAutofill(selectedName);       // 2. 네트워크 정보 채우기
            departmentResultsEl.classList.remove('show'); // 3. 목록 숨기기
        }
    });

    // ▼ 작업자 이름 자동완성 로직
    // (공용 함수) 작업자 자동완성 목록 표시/필터링
    const showWorkerAutocomplete = (filter = '') => {
        const lowerFilter = filter.toLowerCase();
        // workerNames는 문자열 배열이므로 필터링이 더 간단함
        const filteredNames = workerNames.filter(name => 
            name.toLowerCase().includes(lowerFilter)
        );

        // 정렬: 최근 사용한 이름이 위로 오도록 (배열의 뒤쪽)
        filteredNames.reverse(); 

        if (filteredNames.length === 0) {
            workerResultsEl.classList.remove('show');
            return;
        }

        workerResultsEl.innerHTML = filteredNames.map(name => 
            `<div class="autocomplete-item" data-name="${name}">${name}</div>`
        ).join('');
        workerResultsEl.classList.add('show');
    };

    // 1. 작업자 입력창에 타이핑할 때: 목록 필터링
    workerNameInput.addEventListener('input', () => {
        showWorkerAutocomplete(workerNameInput.value);
    });

    // 2. 작업자 입력창을 '포커스'할 때: 전체 목록 표시
    workerNameInput.addEventListener('focus', () => {
        showWorkerAutocomplete(''); // 전체 목록 표시
    });

    // 3. 자동완성 목록(@)을 클릭(터치)할 때
    workerResultsEl.addEventListener('click', (e) => {
        const item = e.target.closest('.autocomplete-item');
        if (item && item.dataset.name) {
            const selectedName = item.dataset.name;
            workerNameInput.value = selectedName;          // 1. 입력창에 값 채우기
            workerResultsEl.classList.remove('show'); // 2. 목록 숨기기
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

        // --- ▼ [추가] 유효성 검사 (기능 4) ▼ ---
        const customerName = document.getElementById('customer-name').value.trim(); // 이름(앞뒤 공백 제거)
        const departmentName = document.getElementById('customer-department').value.trim(); // ▼ [추가]
        const workerName = workerNameInput.value.trim(); // ▼ [추가]
        const ipAddress = document.getElementById('ip-address').value;
        const pcId = pcIdInput.value;

        // 1. IP 주소 유효성 검사 (필수)
        if (!customerName) {
            alert('고객 이름은 필수 항목입니다.');
            document.getElementById('customer-name').focus();
            return; // 저장 중단
        }
        // 0-255 사이의 숫자 4개로 이루어진 형식인지 확인
        const ipRegex = /^(?:(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // ▼ [수정] ipAddress가 비어있지 않을 때만 검사
        if (ipAddress && !ipRegex.test(ipAddress)) {
            alert('IP 주소 형식이 올바르지 않습니다. (예: 192.168.0.1)');
            document.getElementById('ip-address').focus();
            return; // 저장 중단
        }

        // 2. PC ID 유효성 검사 (선택 사항, 하지만 입력 시 숫자여야 함)
        if (pcId && !/^\d+$/.test(pcId)) {
            alert('PC ID는 숫자만 입력해야 합니다.');
            pcIdInput.focus();
            return; // 저장 중단
        }

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

        // --- 상태 라디오 버튼 값 읽기 (기능 3) ▼ ---
        const selectedStatus = document.querySelector('input[name="status-group"]:checked').value;

        // 등록일 처리
        const createdAtValue = createdAtInput.value;
        let newCreatedAtTimestamp;

        if (createdAtValue) {
            // 입력값이 있으면 해당 시간을 타임스탬프로 변환
            newCreatedAtTimestamp = new Date(createdAtValue).getTime();
        } else {
            // 입력값이 비어있으면(사용자가 지웠으면) 현재 시간으로 저장
            newCreatedAtTimestamp = Date.now();
        }

        const customerData = {
            id: customerIdInput.value ? parseInt(customerIdInput.value) : Date.now(),
            createdAt: newCreatedAtTimestamp,
            name: customerName, // trim 처리된 변수 사용
            workerName: workerName, // ▼ [수정] trim 처리된 변수 사용
            pcId: pcIdInput.value, // Store PC ID
            department: departmentName, // 공백 제거된 변수 사용
            
            // --- 상태 저장 로직 (기능 3) ▼ ---
            isCompleted: selectedStatus === 'completed',
            isPending: selectedStatus === 'pending',
            isError: selectedStatus === 'error',

            hasBackup: document.getElementById('has-backup').checked,
            isRestored: document.getElementById('has-backup').checked ? document.getElementById('is-restored').checked : false,
            ip: document.getElementById('ip-address').value, // 유효성 검사 완료된 값
            subnet: document.getElementById('subnet-mask').value,
            gateway: document.getElementById('gateway').value,
            dns1: document.getElementById('dns1').value,
            dns2: document.getElementById('dns2').value,
            backupNotes: document.getElementById('backup-notes').value,
            printers: printers
        };

        // --- 새 부서 자동 저장 로직 ---
        if (departmentName) { // 1. 부서 이름이 비어있지 않고,
            const isNewDepartment = !departmentPresets.some(p => p.name.toLowerCase() === departmentName.toLowerCase());
            
            if (isNewDepartment) { // 2. 프리셋에 없는 새 부서 이름이라면,

                // --- ▼ [추가] 현재 폼의 네트워크 값 읽어오기 ---
                const currentIp = document.getElementById('ip-address').value;       
                const currentSubnet = document.getElementById('subnet-mask').value; 
                const currentGateway = document.getElementById('gateway').value;
                const currentDns1 = document.getElementById('dns1').value;
                const currentDns2 = document.getElementById('dns2').value;

                // IP 주소 처리 (마지막 . 뒷부분 제거. 예: 192.168.0.123 -> 192.168.0.)
                let processedIpPrefix = '';
                const lastDotIndex = currentIp.lastIndexOf('.');
                if (currentIp && lastDotIndex !== -1) {
                    processedIpPrefix = currentIp.substring(0, lastDotIndex + 1);
                }

                // 3. 새 프리셋 객체 생성
                const newPreset = {
                    id: Date.now(),
                    name: departmentName,
                    ipPrefix: processedIpPrefix, // [수정] IP 접두사
                    subnet: currentSubnet,       // [추가] 서브넷 마스크
                    gateway: currentGateway,     // [수정] 전체 게이트웨이
                    dns1: currentDns1,
                    dns2: currentDns2
                };
                departmentPresets.push(newPreset); // 4. 프리셋 배열에 추가
                saveDepartmentPresets(); // 5. LocalStorage에 저장
            }
        }

        // --- ▼ 새 작업자 이름 자동 저장 로직 ---
        if (workerName) { // 1. 작업자 이름이 비어있지 않고,
            const isNewWorker = !workerNames.some(name => name.toLowerCase() === workerName.toLowerCase());
            
            if (isNewWorker) { // 2. 목록에 없는 새 이름이라면,
                workerNames.push(workerName); // 3. 배열에 추가
                saveWorkerNames(); // 4. LocalStorage에 저장
            }
        }

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
            ipPrefix: document.getElementById('department-preset-ip-prefix').value, 
            subnet: document.getElementById('department-preset-subnet').value,  
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
                document.getElementById('department-preset-ip-prefix').value = preset.ipPrefix || ''; 
                document.getElementById('department-preset-subnet').value = preset.subnet || '';   
                document.getElementById('department-preset-gateway').value = preset.gateway || '';  
                document.getElementById('department-preset-dns1').value = preset.dns1 || '';      
                document.getElementById('department-preset-dns2').value = preset.dns2 || '';     
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

        // ▼ 부서 입력창이나 자동완성 목록 '바깥'을 클릭하면 목록 숨기기
        if (departmentResultsEl && !departmentResultsEl.contains(e.target) && !departmentInput.contains(e.target)) {
            departmentResultsEl.classList.remove('show');
        }
        // ▼ 작업자 자동완성 목록 '바깥'을 클릭하면 목록 숨기기
        if (workerResultsEl && !workerResultsEl.contains(e.target) && !workerNameInput.contains(e.target)) {
            workerResultsEl.classList.remove('show');
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