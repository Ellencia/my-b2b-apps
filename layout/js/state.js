const state = {
    currentProfile: localStorage.getItem('currentProfile'),
    customers: [], // Initialize as empty, will be loaded explicitly
    
    // View Mode
    viewMode: 'department', // Default, will be loaded

    // Department Mode State
    currentDepartment: '',

    // Integrated Mode State
    layouts: [],
    layoutAssignments: {},
    activeLayoutId: null,
    selectedLayoutIdInManager: null,
    zoomLevel: 1,

    // Drag & Pan State
    isPanning: false,
    dragState: {
        pos1: 0, pos2: 0, pos3: 0, pos4: 0,
        dragStartTime: null,
        startX: 0, startY: 0,
    }
};

// This function will be called from main.js after the profile is confirmed.
export function loadProfileData() {
    if (!state.currentProfile) return;
    const getKey = (key) => `${state.currentProfile}_${key}`;

    updateState({
        customers: JSON.parse(localStorage.getItem(getKey('customers'))) || [],
        viewMode: localStorage.getItem(getKey('layoutViewMode')) || 'department',
        layouts: JSON.parse(localStorage.getItem(getKey('layouts'))) || [],
        layoutAssignments: JSON.parse(localStorage.getItem(getKey('layoutAssignments'))) || {},
        activeLayoutId: localStorage.getItem(getKey('activeLayoutId')) || null,
    });
}

export function updateState(newState) {
    Object.assign(state, newState);
}

export function saveCurrentDepartment() {
    const getKey = (key) => `${state.currentProfile}_${key}`;
    localStorage.setItem(getKey('selectedLayoutDepartment'), state.currentDepartment);
}

export function loadInitialDepartment() {
    const getKey = (key) => `${state.currentProfile}_${key}`;
    const savedDepartment = localStorage.getItem(getKey('selectedLayoutDepartment'));
    const departments = [...new Set(state.customers.map(c => c.department).filter(Boolean))];
    if (departments.length > 0) {
        if (savedDepartment && departments.includes(savedDepartment)) {
            state.currentDepartment = savedDepartment;
        } else {
            state.currentDepartment = departments[0];
        }
    }
}

export function saveViewMode() {
    const getKey = (key) => `${state.currentProfile}_${key}`;
    localStorage.setItem(getKey('layoutViewMode'), state.viewMode);
}

export function saveIntegratedData() {
    const getKey = (key) => `${state.currentProfile}_${key}`;
    localStorage.setItem(getKey('layouts'), JSON.stringify(state.layouts));
    localStorage.setItem(getKey('layoutAssignments'), JSON.stringify(state.layoutAssignments));
    localStorage.setItem(getKey('activeLayoutId'), state.activeLayoutId);
};

export function validateActiveLayoutId() {
    const foundActiveLayout = state.layouts.find(l => l.id === state.activeLayoutId);
    if (!foundActiveLayout && state.layouts.length > 0) {
        state.activeLayoutId = state.layouts[0].id; // Default to the first layout
        saveIntegratedData();
    } else if (state.layouts.length === 0) {
        state.activeLayoutId = null; // No layouts exist
        saveIntegratedData();
    }
}

export default state;