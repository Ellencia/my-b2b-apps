import { dom } from './dom.js';
import state from './state.js';

function saveLayoutAsImage() {
    let fileName = '배치도'; // Default filename

    if (state.viewMode === 'department') {
        if (!state.currentDepartment) {
            alert('부서를 먼저 선택해주세요.');
            return;
        }
        fileName = `배치도_${state.currentDepartment}.png`;
    } else { // integrated mode
        if (!state.activeLayoutId) {
            alert('레이아웃을 먼저 선택해주세요.');
            return;
        }
        const activeLayout = state.layouts.find(l => l.id === state.activeLayoutId);
        if (activeLayout) {
            fileName = `배치도_${activeLayout.name}.png`;
        } else {
            fileName = `배치도_통합모드.png`;
        }
    }

    // ▼▼▼ NEW Bounding Box Calculation ▼▼▼
    const elementsToCaptureSelector = state.viewMode === 'department' ? '.pc-item' : '.department-block';
    const elementsToCapture = dom.layoutContainer.querySelectorAll(elementsToCaptureSelector);

    if (elementsToCapture.length === 0) {
        alert('저장할 아이템이 없습니다.');
        dom.dropdownMenu.classList.remove('show');
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;

    elementsToCapture.forEach(el => {
        const left = parseFloat(el.style.left) || 0;
        const top = parseFloat(el.style.top) || 0;
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        if (left < minX) minX = left;
        if (top < minY) minY = top;
        if (left + width > maxX) maxX = left + width;
        if (top + height > maxY) maxY = top + height;
    });

    const padding = 20; // 여백
    const captureOptions = {
        x: minX - padding,
        y: minY - padding,
        width: (maxX - minX) + (padding * 2),
        height: (maxY - minY) + (padding * 2),
        backgroundColor: window.getComputedStyle(dom.layoutContainerWrapper).backgroundColor || '#f4f4f4' // 배경색 지정
    };
    // ▲▲▲ End of Bounding Box Calculation ▲▲▲

    // 캡처 전 패닝/줌 스타일 임시 제거 및 캡처 모드 활성화
    const originalTransform = dom.layoutContainer.style.transform;
    dom.layoutContainer.style.transform = '';
    if (state.viewMode === 'integrated') {
        elementsToCapture.forEach(el => el.classList.add('image-capture-mode'));
    }

    html2canvas(dom.layoutContainer, captureOptions).then(canvas => {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = fileName;
        link.click();
    }).catch(error => {
        console.error('Error generating image:', error);
        alert('이미지 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
    }).finally(() => {
        // 캡처 후 스타일 복원 및 캡처 모드 비활성화
        dom.layoutContainer.style.transform = originalTransform;
        if (state.viewMode === 'integrated') {
            elementsToCapture.forEach(el => el.classList.remove('image-capture-mode'));
        }
    });
    dom.dropdownMenu.classList.remove('show');
}

function changeProfile() {
    if (confirm('현재 프로필을 로그아웃하고 프로필 선택 화면으로 이동하시겠습니까?')) {
        localStorage.removeItem('currentProfile');
        window.location.href = '../select_profile.html';
    }
}

function toggleMenu(e) {
    e.stopPropagation();
    dom.dropdownMenu.classList.toggle('show');
}

function closeMenuOnClickOutside(e) {
    if (dom.dropdownMenu && !dom.dropdownMenu.contains(e.target) && !dom.menuToggleBtn.contains(e.target)) {
        dom.dropdownMenu.classList.remove('show');
    }
}

export function initHeader() {
    dom.menuToggleBtn.addEventListener('click', toggleMenu);
    dom.saveImageBtnMenu.addEventListener('click', saveLayoutAsImage);
    dom.changeProfileLink.addEventListener('click', (e) => {
        e.preventDefault();
        changeProfile();
    });
    window.addEventListener('click', closeMenuOnClickOutside);
}
