import state from './state.js';

export const COORDINATE_OFFSET = 1000; // Offset for mapping logical -1000 to +1000 to physical 0 to 2000

export const getKey = (key) => `${state.currentProfile}_${key}`;

export const getClientCoords = (e) => {
    return e.touches ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } : { clientX: e.clientX, clientY: e.clientY };
};

// localStorage에서 레이아웃 데이터를 불러오는 함수
export const loadLayoutData = (key) => {
    const storedData = localStorage.getItem(getKey(key));
    return storedData ? JSON.parse(storedData) : {};
};

// localStorage에 레이아웃 데이터를 저장하는 함수
export const saveLayoutData = (key, data) => {
    localStorage.setItem(getKey(key), JSON.stringify(data));
};
