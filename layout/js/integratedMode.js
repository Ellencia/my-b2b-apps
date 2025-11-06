import state, { updateState, saveIntegratedData, validateActiveLayoutId } from './state.js';
import { dom } from './dom.js';
import { makeDraggable } from './uiControl.js';
import { centerViewAt } from './uiControl.js';
import { getKey, loadLayoutData } from './utils.js';

// --- Main Initialization ---
export function initIntegratedMode() {
    validateActiveLayoutId();
    populateLayoutDropdown();
    renderIntegratedLayout();
    addEventListeners();
}

// --- Event Listeners ---
function addEventListeners() {
    dom.manageLayoutsBtn.addEventListener('click', openManageModal);
    dom.closeModalBtn.addEventListener('click', closeManageModal);
    dom.addLayoutBtn.addEventListener('click', addLayout);
    dom.departmentAssignmentList.addEventListener('change', handleDepartmentAssignmentChange);
    dom.layoutManagementList.addEventListener('click', handleLayoutManagementListClick);
    dom.departmentFocusSelect.addEventListener('change', handleLayoutFocusChange);
    dom.saveLayoutBtnIntegrated.addEventListener('click', () => {
        saveIntegratedLayout();
        alert('통합 레이아웃이 저장되었습니다!');
    });
    dom.layoutContainer.addEventListener('click', handleLayoutContainerClick);
}

// --- Rotation Logic ---
function handleLayoutContainerClick(e) {
    const target = e.target;
    if (!target.classList.contains('rotate-btn')) return;

    const deptBlock = target.closest('.department-block');
    if (!deptBlock) return;

    const departmentName = deptBlock.dataset.departmentName;
    const currentRotation = parseInt(deptBlock.dataset.rotation) || 0;
    let newRotation;

    if (target.classList.contains('rotate-cw')) {
        newRotation = (currentRotation + 90) % 360;
    } else { // rotate-ccw
        newRotation = (currentRotation - 90 + 360) % 360;
    }

    // 1. 원본 데이터 로드
    const departmentLayoutData = loadLayoutData(`layout_${departmentName}`);
    const originalPositions = departmentLayoutData.positions || {};

    // 2. 새 좌표 계산
    const { newPositions, newSize } = calculateRotatedLayout(originalPositions, newRotation);

    // 3. 통합 레이아웃 데이터에 새 정보 저장
    const layoutData = JSON.parse(localStorage.getItem(getKey(`layout_${state.activeLayoutId}`))) || { departments: {} };
    if (!layoutData.departments[departmentName]) layoutData.departments[departmentName] = {};
    
    layoutData.departments[departmentName].rotation = newRotation;
    layoutData.departments[departmentName].item_positions = newPositions;
    layoutData.departments[departmentName].lastSynced = departmentLayoutData.lastModified || 0;
    
    localStorage.setItem(getKey(`layout_${state.activeLayoutId}`), JSON.stringify(layoutData));

    // 4. 화면 다시 렌더링
    renderIntegratedLayout();
}

function calculateRotatedLayout(originalPositions, rotation) {
    const items = Object.keys(originalPositions).map(id => ({ id, ...originalPositions[id] }));
    if (items.length === 0) return { newPositions: {}, newSize: { width: 0, height: 0 } };

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    items.forEach(item => {
        const left = parseFloat(item.left);
        const top = parseFloat(item.top);
        const width = 60, height = 40;
        if (left < minX) minX = left;
        if (top < minY) minY = top;
        if (left + width > maxX) maxX = left + width;
        if (top + height > maxY) maxY = top + height;
    });

    const originalWidth = maxX - minX;
    const originalHeight = maxY - minY;
    const newPositions = {};

    items.forEach(item => {
        const normalizedX = parseFloat(item.left) - minX;
        const normalizedY = parseFloat(item.top) - minY;
        let newX, newY;

        switch (rotation) {
            case 90:
                newX = originalHeight - normalizedY - 40; // 40 is item height
                newY = normalizedX;
                break;
            case 180:
                newX = originalWidth - normalizedX - 60; // 60 is item width
                newY = originalHeight - normalizedY - 40;
                break;
            case 270:
                newX = normalizedY;
                newY = originalWidth - normalizedX - 60;
                break;
            default: // 0 degrees
                newX = normalizedX;
                newY = normalizedY;
                break;
        }
        newPositions[item.id] = { left: `${newX}px`, top: `${newY}px` };
    });

    const newSize = (rotation === 90 || rotation === 270) 
        ? { width: originalHeight, height: originalWidth } 
        : { width: originalWidth, height: originalHeight };

    return { newPositions, newSize };
}

// --- Data & Rendering Logic ---
function saveIntegratedLayout() {
    const layoutData = JSON.parse(localStorage.getItem(getKey(`layout_${state.activeLayoutId}`))) || { departments: {} };
    if (!layoutData.departments) layoutData.departments = {};

    dom.layoutContainer.querySelectorAll('.department-block').forEach(deptBlock => {
        const deptName = deptBlock.dataset.departmentName;
        if (deptName && layoutData.departments[deptName]) {
            layoutData.departments[deptName].left = deptBlock.style.left;
            layoutData.departments[deptName].top = deptBlock.style.top;
        }
    });
    localStorage.setItem(getKey(`layout_${state.activeLayoutId}`), JSON.stringify(layoutData));
}

function renderIntegratedLayout() {
    dom.layoutContainer.innerHTML = '';
    const sizer = document.createElement('div');
    sizer.style.width = '3000px'; sizer.style.height = '3000px'; sizer.style.position = 'static';
    sizer.style.visibility = 'hidden'; sizer.style.pointerEvents = 'none';
    dom.layoutContainer.appendChild(sizer);

    if (!state.activeLayoutId) { centerViewAt(0, 0); return; }

    const integratedLayoutData = JSON.parse(localStorage.getItem(getKey(`layout_${state.activeLayoutId}`))) || { departments: {} };
    const departmentsData = integratedLayoutData.departments || {};
    const departmentsInLayout = Object.keys(state.layoutAssignments).filter(dept => state.layoutAssignments[dept] === state.activeLayoutId);

    if (departmentsInLayout.length === 0) { centerViewAt(0, 0); return; }

    let needsSave = false;

    departmentsInLayout.forEach((departmentName, index) => {
        let deptSyncData = departmentsData[departmentName] || {};
        const rotation = deptSyncData.rotation || 0;

        // 1. Check for updates
        const departmentLayoutData = loadLayoutData(`layout_${departmentName}`);
        const departmentOriginalPositions = departmentLayoutData.positions || {};
        const departmentLastModified = departmentLayoutData.lastModified || 0;

        if (!deptSyncData.item_positions || departmentLastModified > (deptSyncData.lastSynced || 0)) {
            needsSave = true;
            const { newPositions } = calculateRotatedLayout(departmentOriginalPositions, rotation);
            deptSyncData.item_positions = newPositions;
            deptSyncData.lastSynced = departmentLastModified;
        }

        const itemPositions = deptSyncData.item_positions || {};
        const itemsToRender = state.customers.filter(c => c.department === departmentName && itemPositions[c.id]);

        // 2. Create and position block
        const deptBlock = document.createElement('div');
        deptBlock.className = 'department-block';
        deptBlock.dataset.departmentName = departmentName;
        deptBlock.dataset.rotation = rotation;
        deptBlock.style.position = 'absolute';
        deptBlock.innerHTML = `
            <h3 class="department-block-title">${departmentName}</h3>
            <button class="rotate-btn rotate-ccw" title="반시계 방향 회전"></button>
            <button class="rotate-btn rotate-cw" title="시계 방향 회전"></button>
        `;
        deptBlock.style.left = deptSyncData.left || `${(index % 4) * 400 + 50}px`;
        deptBlock.style.top = deptSyncData.top || `${Math.floor(index / 4) * 400 + 50}px`;

        // 3. Calculate size and render items
        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        let hasItems = false;
        itemsToRender.forEach(customer => {
            hasItems = true;
            const pos = itemPositions[customer.id];
            const left = parseFloat(pos.left); const top = parseFloat(pos.top);
            const width = 60; const height = 40;
            if (left < minX) minX = left; if (top < minY) minY = top;
            if (left + width > maxX) maxX = left + width;
            if (top + height > maxY) maxY = top + height;
        });

        if (hasItems) {
            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;
            const titleHeight = 30, padding = { x: 10, y: 10 };
            deptBlock.style.width = `${contentWidth + (padding.x * 2)}px`;
            deptBlock.style.height = `${contentHeight + titleHeight + padding.y}px`;

            itemsToRender.forEach(customer => {
                const pcElement = createPcElement(customer, itemPositions);
                const originalLeft = parseFloat(pcElement.style.left);
                const originalTop = parseFloat(pcElement.style.top);
                pcElement.style.left = `${originalLeft - minX + padding.x}px`;
                pcElement.style.top = `${originalTop - minY + titleHeight}px`;
                pcElement.style.pointerEvents = 'none';
                deptBlock.appendChild(pcElement);
            });
        }

        makeDraggable(deptBlock, saveIntegratedLayout);
        dom.layoutContainer.appendChild(deptBlock);
    });

    if (needsSave) saveIntegratedLayout();

    if (departmentsInLayout.length > 0) {
        setTimeout(() => {
            const firstBlock = dom.layoutContainer.querySelector('.department-block');
            if (firstBlock) centerViewAt(parseFloat(firstBlock.style.left) || 0, parseFloat(firstBlock.style.top) || 0);
        }, 0);
    }
}

function createPcElement(customer, savedPositions) {
    const pcElement = document.createElement('div');
    pcElement.classList.add('pc-item');
    if (customer.status === '불가' || customer.isError) {
        pcElement.classList.add('pc-item-error');
    } else if (customer.status === '보류' || customer.isPending) {
        pcElement.classList.add('pc-item-pending');
    } else if (customer.status === '완료' || customer.isCompleted) {
        pcElement.classList.add('pc-item-completed');
    }
    pcElement.dataset.id = customer.id;
    const ipParts = customer.ip.split('.');
    const lastIpDigit = ipParts.length > 0 ? ipParts[ipParts.length - 1] : customer.ip;
    pcElement.innerHTML = `<strong>${customer.name}</strong><br>${lastIpDigit}`;
    pcElement.style.position = 'absolute';
    if (savedPositions[customer.id]) {
        pcElement.style.left = savedPositions[customer.id].left;
        pcElement.style.top = savedPositions[customer.id].top;
    } else {
        pcElement.style.left = `${Math.random() * 100}px`;
        pcElement.style.top = `${Math.random() * 100 + 30}px`;
    }
    return pcElement;
}

// --- Other Functions (Modal, etc.) ---

function populateLayoutDropdown() {
    dom.departmentFocusSelect.innerHTML = '';
    if (state.layouts.length === 0) {
        dom.departmentFocusSelect.innerHTML = '<option>레이아웃을 생성해주세요</option>';
        return;
    }
    state.layouts.forEach(layout => {
        const option = document.createElement('option');
        option.value = layout.id;
        option.textContent = layout.name;
        if (layout.id === state.activeLayoutId) option.selected = true;
        dom.departmentFocusSelect.appendChild(option);
    });
}

function openManageModal() {
    updateState({ selectedLayoutIdInManager: state.activeLayoutId });
    renderLayoutManagementList();
    renderDepartmentAssignmentList();
    dom.manageLayoutsModal.style.display = 'flex';
}

function closeManageModal() {
    dom.manageLayoutsModal.style.display = 'none';
    populateLayoutDropdown();
    renderIntegratedLayout();
}

function renderLayoutManagementList() {
    dom.layoutManagementList.innerHTML = '';
    state.layouts.forEach(layout => {
        const li = document.createElement('li');
        li.dataset.id = layout.id;
        if (layout.id === state.selectedLayoutIdInManager) li.classList.add('selected');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = layout.name;
        li.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                updateState({ selectedLayoutIdInManager: layout.id });
                renderLayoutManagementList();
                renderDepartmentAssignmentList();
            }
        });
        const buttonsDiv = document.createElement('div');
        buttonsDiv.innerHTML = `<button class="btn-secondary rename-layout-btn">수정</button><button class="btn-danger delete-layout-btn">삭제</button>`;
        li.appendChild(nameSpan);
        li.appendChild(buttonsDiv);
        dom.layoutManagementList.appendChild(li);
    });
}

function renderDepartmentAssignmentList() {
    const allDepartments = [...new Set(state.customers.map(c => c.department).filter(Boolean))];
    dom.departmentAssignmentList.innerHTML = '';
    const selectedLayout = state.layouts.find(l => l.id === state.selectedLayoutIdInManager);
    if (!selectedLayout) { dom.selectedLayoutNameEl.textContent = '레이아웃을 선택하세요.'; return; }
    dom.selectedLayoutNameEl.textContent = `'${selectedLayout.name}' 레이아웃에 부서 할당`;
    allDepartments.forEach(dept => {
        const assignedLayoutId = state.layoutAssignments[dept];
        const isAssignedToCurrent = assignedLayoutId === state.selectedLayoutIdInManager;
        const isAssignedElsewhere = assignedLayoutId && !isAssignedToCurrent;
        const div = document.createElement('div');
        div.className = 'department-item';
        let assignedLayoutName = '';
        if (isAssignedElsewhere) {
            const assignedLayout = state.layouts.find(l => l.id === assignedLayoutId);
            if (assignedLayout) assignedLayoutName = `(${assignedLayout.name})`;
            div.classList.add('assigned-elsewhere');
        }
        div.innerHTML = `
            <input type="checkbox" id="dept-assign-${dept}" value="${dept}" 
                ${isAssignedToCurrent ? 'checked' : ''} 
                ${isAssignedElsewhere ? 'disabled' : ''}>
            <label for="dept-assign-${dept}">${dept}</label>
            ${isAssignedElsewhere ? `<span class="assigned-layout-name">${assignedLayoutName}</span>` : ''}
        `;
        dom.departmentAssignmentList.appendChild(div);
    });
}

function addLayout() {
    const name = dom.newLayoutNameInput.value.trim();
    if (name && !state.layouts.some(l => l.name === name)) {
        const newLayout = { id: Date.now(), name };
        state.layouts.push(newLayout);
        dom.newLayoutNameInput.value = '';
        saveIntegratedData();
        renderLayoutManagementList();
    }
}

function handleDepartmentAssignmentChange(e) {
    if (e.target.type === 'checkbox') {
        const departmentName = e.target.value;
        if (e.target.checked) {
            state.layoutAssignments[departmentName] = state.selectedLayoutIdInManager;
        } else {
            if (state.layoutAssignments[departmentName] === state.selectedLayoutIdInManager) {
                delete state.layoutAssignments[departmentName];
            }
        }
        saveIntegratedData();
    }
}

function handleLayoutManagementListClick(e) {
    const target = e.target;
    const li = target.closest('li');
    if (!li) return;
    const layoutId = parseInt(li.dataset.id);
    if (!layoutId) return;
    if (target.classList.contains('rename-layout-btn')) {
        renameLayout(layoutId);
    } else if (target.classList.contains('delete-layout-btn')) {
        deleteLayout(layoutId);
    }
}

function renameLayout(layoutId) {
    const layout = state.layouts.find(l => l.id === layoutId);
    const newName = prompt('새로운 레이아웃 이름을 입력하세요:', layout.name);
    if (newName && newName.trim() && !state.layouts.some(l => l.name === newName.trim())) {
        layout.name = newName.trim();
        saveIntegratedData();
        renderLayoutManagementList();
    }
}

function deleteLayout(layoutId) {
    if (confirm('정말로 이 레이아웃을 삭제하시겠습니까?\n저장된 모든 위치 정보가 영구적으로 사라집니다.')) {
        updateState({ layouts: state.layouts.filter(l => l.id !== layoutId) });
        const integratedLayoutData = JSON.parse(localStorage.getItem(getKey(`layout_${layoutId}`))) || {};
        const deptsToDelete = Object.keys(integratedLayoutData.departments || {});
        deptsToDelete.forEach(deptName => {
            if(state.layoutAssignments[deptName] === layoutId) delete state.layoutAssignments[deptName];
        });
        localStorage.removeItem(getKey(`layout_${layoutId}`));
        if (state.activeLayoutId === layoutId) {
            const newActiveId = state.layouts.length > 0 ? state.layouts[0].id : null;
            updateState({ activeLayoutId: newActiveId });
        }
        if (state.selectedLayoutIdInManager === layoutId) {
            updateState({ selectedLayoutIdInManager: state.activeLayoutId });
        }
        saveIntegratedData();
        renderLayoutManagementList();
        renderDepartmentAssignmentList();
    }
}

function handleLayoutFocusChange(e) {
    updateState({ activeLayoutId: parseInt(e.target.value) });
    saveIntegratedData();
    renderIntegratedLayout();
}
