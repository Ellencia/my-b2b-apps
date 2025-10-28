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
        window.location.href = `../ipmanager/index.html#customer-${customerId}`;
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

function applyZoom(newZoom) {
    const oldZoom = state.zoomLevel;
    const viewportCenterX = dom.layoutContainerWrapper.clientWidth / 2;
    const viewportCenterY = dom.layoutContainerWrapper.clientHeight / 2;
    const canvasX = (dom.layoutContainerWrapper.scrollLeft + viewportCenterX) / oldZoom;
    const canvasY = (dom.layoutContainerWrapper.scrollTop + viewportCenterY) / oldZoom;

    updateState({ zoomLevel: newZoom });
    dom.layoutContainer.style.transform = `scale(${state.zoomLevel})`;
    dom.zoomResetBtn.textContent = `${Math.round(state.zoomLevel * 100)}%`;

    const newScrollLeft = (canvasX * state.zoomLevel) - viewportCenterX;
    const newScrollTop = (canvasY * state.zoomLevel) - viewportCenterY;
    dom.layoutContainerWrapper.scrollTo(newScrollLeft, newScrollTop);
}

function handleWheelZoom(e) {
    if (e.ctrlKey) {
        e.preventDefault();
        let newZoom = state.zoomLevel;
        if (e.deltaY < 0) { // wheel up, zoom in
            newZoom = Math.min(3, state.zoomLevel + 0.1);
        } else { // wheel down, zoom out
            newZoom = Math.max(0.2, state.zoomLevel - 0.1);
        }
        applyZoom(newZoom);
    }
}

let panState = { isPanning: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 };

function handlePanStart(e) {
    if (e.target.closest('.pc-item')) return;
    panState.isPanning = true;
    dom.layoutContainerWrapper.style.cursor = 'grabbing';
    panState.startX = e.pageX - dom.layoutContainerWrapper.offsetLeft;
    panState.startY = e.pageY - dom.layoutContainerWrapper.offsetTop;
    panState.scrollLeft = dom.layoutContainerWrapper.scrollLeft;
    panState.scrollTop = dom.layoutContainerWrapper.scrollTop;

    document.addEventListener('mousemove', handlePanMove);
    document.addEventListener('mouseup', handlePanEnd);
}

function handlePanMove(e) {
    if (!panState.isPanning) return;
    e.preventDefault();
    const x = e.pageX - dom.layoutContainerWrapper.offsetLeft;
    const y = e.pageY - dom.layoutContainerWrapper.offsetTop;
    const walkX = x - panState.startX;
    const walkY = y - panState.startY;
    dom.layoutContainerWrapper.scrollLeft = panState.scrollLeft - walkX;
    dom.layoutContainerWrapper.scrollTop = panState.scrollTop - walkY;
}

function handlePanEnd() {
    panState.isPanning = false;
    dom.layoutContainerWrapper.style.cursor = 'default';
    document.removeEventListener('mousemove', handlePanMove);
    document.removeEventListener('mouseup', handlePanEnd);
}

export function initUiControls() {
    dom.zoomInBtn.addEventListener('click', () => applyZoom(Math.min(3, state.zoomLevel + 0.1)));
    dom.zoomOutBtn.addEventListener('click', () => applyZoom(Math.max(0.2, state.zoomLevel - 0.1)));
    dom.zoomResetBtn.addEventListener('click', () => applyZoom(1));
    dom.layoutContainerWrapper.addEventListener('wheel', handleWheelZoom, { passive: false });
    dom.layoutContainerWrapper.addEventListener('mousedown', handlePanStart);
}

export function centerViewOnLogicalOrigin(coordinate_offset) {
    const wrapper = dom.layoutContainerWrapper;
    if (wrapper) {
        const scrollLeft = coordinate_offset - (wrapper.clientWidth / 2);
        const scrollTop = coordinate_offset - (wrapper.clientHeight / 2);
        wrapper.scrollTo(scrollLeft, scrollTop);
    }
}
