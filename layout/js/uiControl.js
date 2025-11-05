import state, { updateState } from './state.js';
import { dom } from './dom.js';
import { getClientCoords, getKey, COORDINATE_OFFSET } from './utils.js';

const CLICK_THRESHOLD = 5;
const TIME_THRESHOLD = 200;
let _activeDragElement = null; // saves the currently dragged element

// ▼ [수정] dragStart가 드래그할 요소를 직접 받도록 변경
function dragStart(e, elementToDrag, onDragEndCallback) {
    e.stopPropagation();
    e.preventDefault();

    // const element = e.target.closest('.pc-item'); // OLD
    const element = elementToDrag; // NEW
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
            startTop: parseFloat(element.style.top) || 0,
            startLeft: parseFloat(element.style.left) || 0,
            // 클릭 시간 (클릭/드래그 구분용)
            dragStartTime: Date.now(),
            // 이 드래그가 끝났을 때 실행할 콜백 (저장 함수)
            onDragEnd: onDragEndCallback
        }
    });

    // 3. 'document'에 Move, End 리스너 등록
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
        // ▼ [수정] 드래그된 요소가 '.pc-item'일 경우에만 네비게이션 실행
        if (_activeDragElement.classList.contains('pc-item')) {
            const customerId = _activeDragElement.dataset.id;
            window.location.href = `../ipmanager/ipmanager.html#customer-${customerId}`;
        }
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

// ▼ [수정] dragStart에 드래그할 요소를 직접 전달
export function makeDraggable(element, onDragEnd) {
    const start = (e) => dragStart(e, element, onDragEnd);
    element.addEventListener('pointerdown', start, { capture: true });
}

// ▼ [수정] 지정한 좌표 (x, y)가 뷰의 중앙에 오도록 스크롤하는 함수
export function centerViewAt(logicalX, logicalY) {
    const wrapper = dom.layoutContainerWrapper;
    if (wrapper) {
        // (logicalX, logicalY) 지점이 뷰포트 중앙에 오도록 스크롤 위치 계산
        const scrollLeft = logicalX - (wrapper.clientWidth / 2);
        const scrollTop = logicalY - (wrapper.clientHeight / 2);
        wrapper.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'smooth' });
    }
}
