import state, { updateState, saveIntegratedData, validateActiveLayoutId } from './state.js';
import { dom } from './dom.js';
import { makeDraggable, onIntegratedDragEnd, centerViewOnLogicalOrigin } from './uiControl.js';
import { COORDINATE_OFFSET, getKey } from './utils.js';

// --- Main Initialization ---
export function initIntegratedMode() {
    validateActiveLayoutId();
    populateLayoutDropdown();
    renderIntegratedLayout();
    centerViewOnLogicalOrigin(COORDINATE_OFFSET);
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
    dom.toggleDeptNamesBtn.addEventListener('click', toggleDepartmentNames);
}

// --- UI Rendering ---
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

function renderIntegratedLayout() {
    dom.layoutContainer.innerHTML = '';
    if (!state.activeLayoutId) return;

    const departmentsInLayout = Object.keys(state.layoutAssignments).filter(dept => state.layoutAssignments[dept] === state.activeLayoutId);
    const customersInLayout = state.customers.filter(c => departmentsInLayout.includes(c.department));
    const savedPositions = JSON.parse(localStorage.getItem(getKey(`layout_${state.activeLayoutId}`))) || {};

    customersInLayout.forEach(customer => {
        const pcElement = createPcElement(customer, savedPositions);
        makeDraggable(pcElement, onIntegratedDragEnd, true);
        dom.layoutContainer.appendChild(pcElement);
    });
}

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
        ${lastIpDigit}<br>
        <span class="pc-item-dept">${customer.department}</span>
    `;
    pcElement.style.position = 'absolute';

    if (savedPositions[customer.id]) {
        pcElement.style.left = savedPositions[customer.id].left;
        pcElement.style.top = savedPositions[customer.id].top;
    } else {
        pcElement.style.left = `${Math.random() * 400 + (COORDINATE_OFFSET - 200)}px`;
        pcElement.style.top = `${Math.random() * 400 + (COORDINATE_OFFSET - 200)}px`;
    }
    return pcElement;
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
        nameSpan.addEventListener('click', () => {
            updateState({ selectedLayoutIdInManager: layout.id });
            renderLayoutManagementList();
            renderDepartmentAssignmentList();
        });

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
        const isChecked = state.layoutAssignments[dept] === state.selectedLayoutIdInManager;
        const div = document.createElement('div');
        div.className = 'department-item';
        div.innerHTML = `
            <input type="checkbox" id="dept-assign-${dept}" value="${dept}" ${isChecked ? 'checked' : ''}>
            <label for="dept-assign-${dept}">${dept}</label>
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
    const layoutId = parseInt(target.closest('li').dataset.id);
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
    centerViewOnLogicalOrigin(COORDINATE_OFFSET);
}

function toggleDepartmentNames() {
    dom.layoutContainer.classList.toggle('show-departments');
    const isShowing = dom.layoutContainer.classList.contains('show-departments');
    dom.toggleDeptNamesBtn.textContent = isShowing ? '부서 숨김' : '부서 표시';
    dom.toggleDeptNamesBtn.classList.toggle('active', isShowing);
}