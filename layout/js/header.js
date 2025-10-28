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

    // 캡처 전 패닝/줌 스타일 임시 제거
    const originalTransform = dom.layoutContainer.style.transform;
    dom.layoutContainer.style.transform = '';

    html2canvas(dom.layoutContainer).then(canvas => {
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = fileName;
        link.click();
        // 캡처 후 스타일 복원
        dom.layoutContainer.style.transform = originalTransform;
    }).catch(error => {
        console.error('Error generating image:', error);
        alert('이미지 생성 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
        // 오류 발생 시에도 스타일 복원
        dom.layoutContainer.style.transform = originalTransform;
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
