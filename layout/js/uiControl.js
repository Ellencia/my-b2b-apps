import state, { updateState } from './state.js';
import { dom } from './dom.js';
import { getClientCoords, getKey } from './utils.js';

const CLICK_THRESHOLD = 5;
const TIME_THRESHOLD = 200;
let _activeDragElement = null; // saves the currently dragged element
// --- ▼ [재설계] 줌(Zoom)을 지원하는 새 드래그 로직 ---
/**
 * 1. 드래그 시작 (pointerdown)
 * Panzoom보다 먼저 이벤트를 '캡처'해서 가로챕니다.
 */
function dragStart(e, onDragEndCallback) {
    // 1. 이벤트 차단: Panzoom이 맵 패닝을 시작하지 못하게 막음
    e.stopPropagation();
    e.preventDefault();

    const element = e.target.closest('.pc-item');
    if (!element) return;
    
    _activeDragElement = element; // 현재 드래그 중인 요소 저장

    const coords = getClientCoords(e);
    
    // 2. 드래그 상태 초기화: '현재 줌 레벨'과 '시작 좌표' 저장
    updateState({
        dragState: {
            // 마우스 시작 좌표 (화면 기준)
            startX: coords.clientX,
            startY: coords.clientY,
            // 요소의 시작 위치 (맵 기준)
            startTop: element.offsetTop,
            startLeft: element.offsetLeft,
            // 클릭 시간 (클릭/드래그 구분용)
            dragStartTime: Date.now(),
            // 이 드래그가 끝났을 때 실행할 콜백 (저장 함수)
            onDragEnd: onDragEndCallback 
        }
    });

    // 3. 'document'에 Move, End 리스너 등록
    //    (마우스가 박스를 벗어나도 드래그가 유지되도록)
    document.addEventListener('pointermove', dragMove);
    document.addEventListener('pointerup', dragEnd);
}

/**
 * 2. 드래그 중 (pointermove)
 * '줌 레벨'을 반영하여 요소의 위치를 계산합니다.
 */
function dragMove(e) {
    if (!_activeDragElement) return; // 드래그 중이 아니면 종료

    const { dragState } = state;
    const coords = getClientCoords(e);

    // 1. 마우스가 화면에서 움직인 거리 (delta) 계산
    const deltaX = coords.clientX - dragState.startX;
    const deltaY = coords.clientY - dragState.startY;

    // 2. ★ 핵심 ★
    //    마우스 이동 거리를 '현재 줌 레벨'로 나눠서
    //    맵 안에서의 실제 이동 거리를 계산합니다.
    //    (부서 모드에서는 state.zoomLevel이 1이므로 deltaX / 1 이 됨)
    const newLeft = dragState.startLeft + (deltaX / state.zoomLevel);
    const newTop = dragState.startTop + (deltaY / state.zoomLevel);

    // 3. 요소 위치 업데이트
    _activeDragElement.style.left = `${newLeft}px`;
    _activeDragElement.style.top = `${newTop}px`;
}

/**
 * 3. 드래그 종료 (pointerup)
 * 리스너를 제거하고, 클릭/드래그를 구분하여 처리합니다.
 */
function dragEnd(e) {
    if (!_activeDragElement) return; // 드래그 중이 아니면 종료

    const { dragState } = state;

    // 1. Move, End 리스너 제거
    document.removeEventListener('pointermove', dragMove);
    document.removeEventListener('pointerup', dragEnd);

    // 2. 클릭/드래그 구분
    const timeElapsed = Date.now() - dragState.dragStartTime;
    const endCoords = getClientCoords(e);
    const distanceMoved = Math.sqrt(Math.pow(endCoords.clientX - dragState.startX, 2) + Math.pow(endCoords.clientY - dragState.startY, 2));

    if (timeElapsed < TIME_THRESHOLD && distanceMoved < CLICK_THRESHOLD) {
        // "클릭"으로 판정
        const customerId = _activeDragElement.dataset.id;
        window.location.href = `../ipmanager/ipmanager.html#customer-${customerId}`;
    } else {
        // "드래그"로 판정
        // 3. 저장 콜백 실행 (onDragEnd)
        if (dragState.onDragEnd) {
            dragState.onDragEnd(_activeDragElement);
        }
    }

    // 4. 활성 요소 초기화
    _activeDragElement = null;
    updateState({ dragState: {} });
}
// --- ▲ [재설계] ---

export function makeDraggable(element, onDragEnd) {
    const start = (e) => dragStart(e, onDragEnd);
    // ▼ [수정] 'pointerdown' 이벤트 하나로 마우스/터치 모두 처리
    element.addEventListener('pointerdown', start, { capture: true });
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
