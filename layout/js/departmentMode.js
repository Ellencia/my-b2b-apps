import state, { updateState, saveCurrentDepartment } from './state.js';
import { dom } from './dom.js';
import { makeDraggable } from './uiControl.js';
import { loadLayoutData, saveLayoutData } from './utils.js';
import { centerViewAt } from './uiControl.js';
import { COORDINATE_OFFSET } from './utils.js';

function renderDepartmentLayout(department) {
    dom.layoutContainer.innerHTML = '';

    // ▼▼▼ [추가] 3000x3000 스크롤 영역을 강제하는 Sizer 추가 ▼▼▼
    const sizer = document.createElement('div');
    sizer.style.width = '1000px';
    sizer.style.height = '1000px';
    sizer.style.position = 'static'; // absolute가 아니므로 캔버스 크기를 정의함
    sizer.style.visibility = 'hidden'; // 보이지 않게
    sizer.style.pointerEvents = 'none'; // 클릭/터치 이벤트 무시
    dom.layoutContainer.appendChild(sizer);
    // ▲▲▲ Sizer 추가 끝 ▲▲▲

    const departmentCustomers = state.customers.filter(c => c.department === department);
    const { positions: savedPositions, lastModified } = loadLayoutData(`layout_${department}`);
    
    const hasSavedData = Object.keys(savedPositions).length > 0;

    // ▼ [추가] 아이템들의 경계를 계산하기 위한 변수
    let minLeft = Infinity, minTop = Infinity;
    let maxLeft = -Infinity, maxTop = -Infinity;
    let hasItems = false;

    departmentCustomers.forEach(customer => {
        const pcElement = createPcElement(customer, savedPositions, hasSavedData);
        makeDraggable(pcElement, null);
        dom.layoutContainer.appendChild(pcElement);

        // ▼ [추가] 렌더링된 요소의 실제 위치를 읽어 경계 계산
        const left = parseFloat(pcElement.style.left);
        const top = parseFloat(pcElement.style.top);
        
        if (!isNaN(left) && !isNaN(top)) {
            hasItems = true;
            if (left < minLeft) minLeft = left;
            if (top < minTop) minTop = top;
            if (left > maxLeft) maxLeft = left;
            if (top > maxTop) maxTop = top;
        }
    });

    // ▼ [수정] 계산된 경계의 중앙으로 카메라 이동
    if (hasItems) {
        // 아이템들의 평균 중앙 위치 계산
        const centerX = (minLeft + maxLeft) / 2;
        const centerY = (minTop + maxTop) / 2;

        // ▼ [수정] 렌더링 다음 틱(tick)에서 스크롤 실행 (타이밍 문제 해결)
        setTimeout(() => {
            centerViewAt(centerX, centerY);
        }, 0);

        centerViewAt(centerX, centerY);
    } else if (hasSavedData) {
        // "옛날 부서" (아이템 없음): (0, 0)으로 스크롤
        centerViewAt(0, 0);
    } else {
        // "새 부서" (아이템 없음): (1000, 1000)으로 중앙 정렬
        centerViewAt(COORDINATE_OFFSET, COORDINATE_OFFSET);
    }
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
        // ▼ [수정] (1000, 1000) 근처에 랜덤 배치
        pcElement.style.left = `${Math.random() * 200}px`;
        pcElement.style.top = `${Math.random() * 200}px`;
    }
    return pcElement;
}

function saveDepartmentLayout() {
    const positions = {};
    dom.layoutContainer.querySelectorAll('.pc-item').forEach(pcElement => {
        positions[pcElement.dataset.id] = {
            left: pcElement.style.left,
            top: pcElement.style.top
        };
    });

    const layoutData = {
        positions: positions,
        lastModified: Date.now() // Add timestamp
    };

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
