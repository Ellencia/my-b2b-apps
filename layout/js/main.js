import state, { updateState, saveViewMode, loadInitialDepartment, loadProfileData } from './state.js';
import { dom } from './dom.js';
import { initHeader } from './header.js';
import { initDepartmentMode } from './departmentMode.js';
import { initIntegratedMode } from './integratedMode.js';
import { initUiControls } from './uiControl.js';

// 1. Check for profile on initial load
if (!state.currentProfile) {
    alert('업무 프로필이 선택되지 않았습니다. 프로필 선택 화면으로 이동합니다.');
    window.location.href = '../select_profile.html';
} else {
    // Load all profile-specific data right after confirming the profile
    loadProfileData();
}

// 2. Main App Rendering Logic
function renderApp() {
    if (state.viewMode === 'department') {
        dom.departmentModeControls.style.display = 'flex';
        dom.integratedModeControls.style.display = 'none';
        document.querySelector('main').classList.remove('integrated-mode');
        initDepartmentMode();
    } else { // integrated mode
        dom.departmentModeControls.style.display = 'none';
        dom.integratedModeControls.style.display = 'block';
        document.querySelector('main').classList.add('integrated-mode');
        initIntegratedMode();
    }
}

// 3. Mode Switching
function handleModeChange() {
    const newMode = state.viewMode === 'department' ? 'integrated' : 'department';
    updateState({ viewMode: newMode });
    saveViewMode();
    renderApp();
}

// 4. App Initialization
document.addEventListener('DOMContentLoaded', () => {
    // This function now uses the data loaded by loadProfileData
    loadInitialDepartment();

    // Initialize header and UI controls
    initHeader();
    initUiControls();

    // Add mode change listeners
    dom.changeModeBtnDept.addEventListener('click', handleModeChange);
    dom.changeModeBtnIntegrated.addEventListener('click', handleModeChange);

    // Initial render
    renderApp();
});
