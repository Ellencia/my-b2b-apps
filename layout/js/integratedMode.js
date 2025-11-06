import state, { updateState, saveIntegratedData, validateActiveLayoutId } from './state.js';
import { dom } from './dom.js';
import { makeDraggable } from './uiControl.js';
import { centerViewAt } from './uiControl.js';
import { COORDINATE_OFFSET, getKey } from './utils.js';

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
    dom.saveLayoutBtnIntegrated.addEventListener('click', saveIntegratedLayout);
}

// ▼▼▼ [MAJOR CHANGE] ▼▼▼
// --- New Save/Render Logic for Department Blocks ---

function saveIntegratedLayout() {
    if (!state.activeLayoutId) {
        alert('저장할 레이아웃을 먼저 선택해주세요.');
        return;
    }
    const layoutData = {
        departments: {}
    };
    // 이제 .department-block의 위치를 저장합니다.
    dom.layoutContainer.querySelectorAll('.department-block').forEach(deptBlock => {
        const deptName = deptBlock.dataset.departmentName;
        if (deptName) {
            layoutData.departments[deptName] = {
                left: deptBlock.style.left,
                top: deptBlock.style.top
            };
        }
    });

    localStorage.setItem(getKey(`layout_${state.activeLayoutId}`), JSON.stringify(layoutData));
    alert('통합 레이아웃이 저장되었습니다!');
}

function renderIntegratedLayout() {
    dom.layoutContainer.innerHTML = '';

    const sizer = document.createElement('div');
    sizer.style.width = '3000px';
    sizer.style.height = '3000px';
    sizer.style.position = 'static';
    sizer.style.visibility = 'hidden';
    sizer.style.pointerEvents = 'none';
    dom.layoutContainer.appendChild(sizer);

    if (!state.activeLayoutId) {
        centerViewAt(0, 0);
        return;
    }

    const savedLayoutData = JSON.parse(localStorage.getItem(getKey(`layout_${state.activeLayoutId}`))) || {};
    const savedDepartmentPositions = savedLayoutData.departments || {};
    const departmentsInLayout = Object.keys(state.layoutAssignments).filter(dept => state.layoutAssignments[dept] === state.activeLayoutId);

    if (departmentsInLayout.length === 0) {
        centerViewAt(0, 0);
        return;
    }

    departmentsInLayout.forEach((departmentName, index) => {
        const deptBlock = document.createElement('div');
        deptBlock.classList.add('department-block');
        deptBlock.dataset.departmentName = departmentName;
        deptBlock.style.position = 'absolute';
        deptBlock.innerHTML = `<h3 class="department-block-title">${departmentName}</h3>`;

        if (savedDepartmentPositions[departmentName]) {
            deptBlock.style.left = savedDepartmentPositions[departmentName].left;
            deptBlock.style.top = savedDepartmentPositions[departmentName].top;
        } else {
            const x = (index % 4) * 400 + 50;
            const y = Math.floor(index / 4) * 400 + 50;
            deptBlock.style.left = `${x}px`;
            deptBlock.style.top = `${y}px`;
        }

        const departmentCustomers = state.customers.filter(c => c.department === departmentName);
        const departmentItemLayout = JSON.parse(localStorage.getItem(getKey(`layout_${departmentName}`))) || {};

        // ▼▼▼ NEW NORMALIZATION LOGIC ▼▼▼
        let minLeft = Infinity, minTop = Infinity, maxRight = 0, maxBottom = 0;
        let hasItems = false;
        const itemsToRender = [];

        departmentCustomers.forEach(customer => {
            if (departmentItemLayout[customer.id]) {
                hasItems = true;
                const pos = departmentItemLayout[customer.id];
                const left = parseFloat(pos.left);
                const top = parseFloat(pos.top);
                const width = 60; // pc-item width
                const height = 40; // pc-item height

                if (left < minLeft) minLeft = left;
                if (top < minTop) minTop = top;
                if (left + width > maxRight) maxRight = left + width;
                if (top + height > maxBottom) maxBottom = top + height;
                
                itemsToRender.push(customer);
            }
        });

        if (hasItems) {
            const contentWidth = maxRight - minLeft;
            const contentHeight = maxBottom - minTop;
            const titleHeight = 30; // From CSS padding-top
            const padding = { x: 10, y: 10 };

            deptBlock.style.width = `${contentWidth + (padding.x * 2)}px`;
            deptBlock.style.height = `${contentHeight + titleHeight + padding.y}px`;

            itemsToRender.forEach(customer => {
                const pcElement = createPcElement(customer, departmentItemLayout);
                const originalLeft = parseFloat(pcElement.style.left);
                const originalTop = parseFloat(pcElement.style.top);

                pcElement.style.left = `${originalLeft - minLeft + padding.x}px`;
                pcElement.style.top = `${originalTop - minTop + titleHeight}px`;

                pcElement.style.pointerEvents = 'none';
                deptBlock.appendChild(pcElement);
            });
        }
        // ▲▲▲ END OF NEW LOGIC ▲▲▲

        makeDraggable(deptBlock, null);
        dom.layoutContainer.appendChild(deptBlock);
    });

    setTimeout(() => {
        const firstBlock = dom.layoutContainer.querySelector('.department-block');
        if (firstBlock) {
            centerViewAt(parseFloat(firstBlock.style.left) || 0, parseFloat(firstBlock.style.top) || 0);
        } else {
            centerViewAt(0, 0);
        }
    }, 0);
}

// createPcElement는 거의 동일하지만, 세 번째 인자(hasSavedData)는 더 이상 필요 없습니다.
function createPcElement(customer, savedPositions) {
    const pcElement = document.createElement('div');
    pcElement.classList.add('pc-item');
    if (customer.isError) pcElement.classList.add('pc-item-error');
    else if (customer.isPending) pcElement.classList.add('pc-item-pending');
    else if (customer.isCompleted) pcElement.classList.add('pc-item-completed');

    pcElement.dataset.id = customer.id;
    const ipParts = customer.ip.split('.');
    const lastIpDigit = ipParts.length > 0 ? ipParts[ipParts.length - 1] : customer.ip;
    pcElement.innerHTML = `
        <strong>${customer.name}</strong><br>
        ${lastIpDigit}
    `;
    pcElement.style.position = 'absolute';

    if (savedPositions[customer.id]) {
        pcElement.style.left = savedPositions[customer.id].left;
        pcElement.style.top = savedPositions[customer.id].top;
    } else {
        // 부서 내 레이아웃 정보가 없을 경우, 블록 내에서 랜덤 배치
        pcElement.style.left = `${Math.random() * 100}px`;
        pcElement.style.top = `${Math.random() * 100 + 20}px`; // Title height 고려
    }
    return pcElement;
}

// ▲▲▲ [MAJOR CHANGE] ▲▲▲


// --- UI Rendering (Dropdown) ---
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
        if (layout.id === state.activeLayoutId) {
            option.selected = true;
        }
        dom.departmentFocusSelect.appendChild(option);
    });
}


// --- Modal Logic ---
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
        if (layout.id === state.selectedLayoutIdInManager) {
            li.classList.add('selected');
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = layout.name;
        // The click listener is now handled by handleLayoutManagementListClick

        const buttonsDiv = document.createElement('div');
        buttonsDiv.innerHTML = `
            <button class="btn-secondary rename-layout-btn">수정</button>
            <button class="btn-danger delete-layout-btn">삭제</button>
        `;

        li.appendChild(nameSpan);
        li.appendChild(buttonsDiv);
        dom.layoutManagementList.appendChild(li);
    });
}

function renderDepartmentAssignmentList() {
    const allDepartments = [...new Set(state.customers.map(c => c.department).filter(Boolean))];
    dom.departmentAssignmentList.innerHTML = '';

    const selectedLayout = state.layouts.find(l => l.id === state.selectedLayoutIdInManager);
    if (!selectedLayout) {
        dom.selectedLayoutNameEl.textContent = '레이아웃을 선택하세요.';
        return;
    }
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
            if (assignedLayout) {
                assignedLayoutName = `(${assignedLayout.name})`;
            }
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

// --- Modal Actions ---
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

    // Handle button clicks
    if (target.classList.contains('rename-layout-btn')) {
        renameLayout(layoutId);
    } else if (target.classList.contains('delete-layout-btn')) {
        deleteLayout(layoutId);
    } else {
        // Otherwise, handle as a selection click
        updateState({ selectedLayoutIdInManager: layoutId });
        renderLayoutManagementList();
        renderDepartmentAssignmentList();
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
        localStorage.removeItem(getKey(`layout_${layoutId}`));

        Object.keys(state.layoutAssignments).forEach(dept => {
            if (state.layoutAssignments[dept] === layoutId) {
                delete state.layoutAssignments[dept];
            }
        });

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

// --- View Actions ---
function handleLayoutFocusChange(e) {
    updateState({ activeLayoutId: parseInt(e.target.value) });
    saveIntegratedData();
    renderIntegratedLayout();
}
