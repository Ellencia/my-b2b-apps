import state, { updateState, saveCurrentDepartment } from './state.js';
import { dom } from './dom.js';
import { makeDraggable } from './uiControl.js';
import { loadLayoutData, saveLayoutData } from './utils.js';

function renderDepartmentLayout(department) {
    dom.layoutContainer.innerHTML = '';
    const departmentCustomers = state.customers.filter(c => c.department === department);
    const savedPositions = loadLayoutData(`layout_${department}`);

    departmentCustomers.forEach(customer => {
        const pcElement = createPcElement(customer, savedPositions);
        makeDraggable(pcElement, null, false); // No special onDragEnd needed for department mode
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
    pcElement.innerHTML = `<strong>${customer.name}</strong><br>${lastIpDigit}`;
    pcElement.style.position = 'absolute';

    if (savedPositions[customer.id]) {
        pcElement.style.left = savedPositions[customer.id].left;
        pcElement.style.top = savedPositions[customer.id].top;
    } else {
        pcElement.style.left = `${Math.random() * 400}px`;
        pcElement.style.top = `${Math.random() * 400}px`;
    }
    return pcElement;
}

function saveDepartmentLayout() {
    const layoutData = {};
    dom.layoutContainer.querySelectorAll('.pc-item').forEach(pcElement => {
        layoutData[pcElement.dataset.id] = {
            left: pcElement.style.left,
            top: pcElement.style.top
        };
    });
    saveLayoutData(`layout_${state.currentDepartment}`, layoutData);
    alert('레이아웃이 저장되었습니다!');
}

function handleDepartmentChange(e) {
    updateState({ currentDepartment: e.target.value });
    saveCurrentDepartment();
    renderDepartmentLayout(state.currentDepartment);
}

export function initDepartmentMode() {
    const departments = [...new Set(state.customers.map(c => c.department).filter(Boolean))];
    dom.departmentSelect.innerHTML = departments.map(d => `<option value="${d}">${d}</option>`).join('');
    
    if (state.currentDepartment) {
        dom.departmentSelect.value = state.currentDepartment;
    }

    renderDepartmentLayout(state.currentDepartment);

    dom.departmentSelect.addEventListener('change', handleDepartmentChange);
    dom.saveLayoutBtn.addEventListener('click', saveDepartmentLayout);
}
