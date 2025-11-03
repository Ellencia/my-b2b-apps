import state, { updateState } from './state.js';
import { dom } from './dom.js';
import { getClientCoords, getKey } from './utils.js';

const CLICK_THRESHOLD = 5;
const TIME_THRESHOLD = 200;

// --- Drag and Drop --- //

function elementDrag(e) {
    e.preventDefault();
    const coords = getClientCoords(e);
    const { dragState } = state;

    dragState.pos1 = dragState.pos3 - coords.clientX;
    dragState.pos2 = dragState.pos4 - coords.clientY;
    dragState.pos3 = coords.clientX;
    dragState.pos4 = coords.clientY;

    const element = e.target.closest('.pc-item');
    element.style.top = (element.offsetTop - dragState.pos2) + "px";
    element.style.left = (element.offsetLeft - dragState.pos1) + "px";
}

function integratedElementDrag(e) {
    e.preventDefault();
    const coords = getClientCoords(e);
    const element = e.target.closest('.pc-item');

    const deltaX = coords.clientX - element.mouseStartX;
    const deltaY = coords.clientY - element.mouseStartY;

    const newLeft = element.initialLeft + deltaX / state.zoomLevel;
    const newTop = element.initialTop + deltaY / state.zoomLevel;

    const containerWidth = 8000;
    const containerHeight = 8000;
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;

    const clampedLeft = Math.max(0, Math.min(newLeft, containerWidth - elementWidth));
    const clampedTop = Math.max(0, Math.min(newTop, containerHeight - elementHeight));

    element.style.left = clampedLeft + 'px';
    element.style.top = clampedTop + 'px';
}

let dragEndListener = null;

function dragEnd(e, onDragEnd) {
    document.removeEventListener('mousemove', elementDrag);
    document.removeEventListener('mouseup', dragEndListener);
    document.removeEventListener('touchmove', elementDrag);
    document.removeEventListener('touchend', dragEndListener);
    
    document.removeEventListener('mousemove', integratedElementDrag);
    document.removeEventListener('touchmove', integratedElementDrag);

    const { dragState } = state;
    const timeElapsed = Date.now() - dragState.dragStartTime;
    const endCoords = e.changedTouches ? { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY } : { clientX: e.clientX, clientY: e.clientY };
    const distanceMoved = Math.sqrt(Math.pow(endCoords.clientX - dragState.startX, 2) + Math.pow(endCoords.clientY - dragState.startY, 2));

    if (timeElapsed < TIME_THRESHOLD && distanceMoved < CLICK_THRESHOLD) {
        const customerId = e.target.closest('.pc-item').dataset.id;
        window.location.href = `../ipmanager/ipmanager.html#customer-${customerId}`;
    }

    if (onDragEnd) {
        onDragEnd(e.target.closest('.pc-item'));
    }
}

function dragStart(e, onDragEnd, useIntegratedDrag = false) {
    e.preventDefault();
    const coords = getClientCoords(e);
    const element = e.target.closest('.pc-item');

    updateState({
        dragState: {
            pos3: coords.clientX,
            pos4: coords.clientY,
            startX: coords.clientX,
            startY: coords.clientY,
            dragStartTime: Date.now(),
        }
    });

    dragEndListener = (event) => dragEnd(event, onDragEnd);

    if (useIntegratedDrag) {
        element.mouseStartX = coords.clientX;
        element.mouseStartY = coords.clientY;
        element.initialTop = element.offsetTop;
        element.initialLeft = element.offsetLeft;
        document.addEventListener('mousemove', integratedElementDrag);
        document.addEventListener('touchmove', integratedElementDrag, { passive: false });
    } else {
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('touchmove', elementDrag, { passive: false });
    }

    document.addEventListener('mouseup', dragEndListener);
    document.addEventListener('touchend', dragEndListener);
}

export function makeDraggable(element, onDragEnd, useIntegratedDrag = false) {
    const start = (e) => dragStart(e, onDragEnd, useIntegratedDrag);
    element.addEventListener('mousedown', start);
    element.addEventListener('touchstart', start, { passive: false });
}

export function onIntegratedDragEnd(element) {
    const layoutData = JSON.parse(localStorage.getItem(getKey(`layout_${state.activeLayoutId}`))) || {};
    layoutData[element.dataset.id] = {
        left: element.style.left,
        top: element.style.top
    };
    localStorage.setItem(getKey(`layout_${state.activeLayoutId}`), JSON.stringify(layoutData));
}

// --- Zoom & Pan --- //

let panzoomInstance = null;
/**
 * 통합 모드 UI (Panzoom)를 초기화합니다.
 */
export function initIntegratedModeUI() {
    // 1. Panzoom 인스턴스 생성
    panzoomInstance = Panzoom(dom.layoutContainer, {
        canvas: true, // layoutContainer가 wrapper보다 큼
        maxScale: 3,
        minScale: 0.2,
        step: 0.1, // 줌 버튼용 스텝
        // ★★★ 중요 ★★★
        // '.pc-item'에서 시작된 드래그는 맵 패닝을 무시합니다.
        // 이를 통해 기존의 makeDraggable이 정상 동작합니다.
        exclude: ['.pc-item'] 
    });

    // 2. Panzoom의 휠 이벤트를 wrapper에 연결
    dom.layoutContainerWrapper.addEventListener('wheel', (event) => {
        if (!panzoomInstance) return;
        // Panzoom의 내장 휠 핸들러 호출
        panzoomInstance.zoomWithWheel(event);
    }, { passive: false });

    // 3. 줌 버튼 연결
    dom.zoomInBtn.addEventListener('click', () => panzoomInstance && panzoomInstance.zoomIn());
    dom.zoomOutBtn.addEventListener('click', () => panzoomInstance && panzoomInstance.zoomOut());
    dom.zoomResetBtn.addEventListener('click', () => panzoomInstance && panzoomInstance.zoom(1, { animate: true }));

    // 4. Panzoom의 'zoom' 이벤트를 감지하여 state와 UI 업데이트
    dom.layoutContainer.addEventListener('panzoomzoom', (event) => {
        const newZoom = event.detail.scale;
        updateState({ zoomLevel: newZoom });
        dom.zoomResetBtn.textContent = `${Math.round(newZoom * 100)}%`;
    });
}

/**
 * 통합 모드 UI (Panzoom)를 파괴합니다.
 * (부서 모드로 전환 시, 이벤트 리스너 중복 방지)
 */
export function destroyIntegratedModeUI() {
    if (panzoomInstance) {
        panzoomInstance.destroy();
        panzoomInstance = null;
    }
    
    // 버튼 이벤트 리스너를 확실히 제거하기 위해 버튼을 복제/교체합니다.
    // (이벤트 리스너 중복 등록 방지)
    dom.zoomInBtn.replaceWith(dom.zoomInBtn.cloneNode(true));
    dom.zoomOutBtn.replaceWith(dom.zoomOutBtn.cloneNode(true));
    dom.zoomResetBtn.replaceWith(dom.zoomResetBtn.cloneNode(true));
}

export function centerViewOnLogicalOrigin(coordinate_offset) {
    const wrapper = dom.layoutContainerWrapper;
    if (wrapper) {
        const scrollLeft = coordinate_offset - (wrapper.clientWidth / 2);
        const scrollTop = coordinate_offset - (wrapper.clientHeight / 2);
        wrapper.scrollTo(scrollLeft, scrollTop);
    }
}
