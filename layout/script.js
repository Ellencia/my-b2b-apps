const currentProfile = localStorage.getItem('currentProfile');
if (!currentProfile) {
    alert('업무 프로필이 선택되지 않았습니다. 프로필 선택 화면으로 이동합니다.');
    window.location.href = '../select_profile.html';
}

// Helper to create profile-specific keys
const getKey = (key) => `${currentProfile}_${key}`;

document.addEventListener('DOMContentLoaded', () => {
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const saveImageBtnMenu = document.getElementById('save-image-btn-menu');
    const changeProfileLink = document.getElementById('change-profile-link');

    menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    saveImageBtnMenu.addEventListener('click', () => {
        if (!currentDepartment) {
            alert('부서를 먼저 선택해주세요.');
            return;
        }
        html2canvas(layoutContainer).then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `배치도_${currentDepartment}.png`;
            link.click();
        });
        dropdownMenu.classList.remove('show');
    });

    changeProfileLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('현재 프로필을 로그아웃하고 프로필 선택 화면으로 이동하시겠습니까?')) {
            localStorage.removeItem('currentProfile');
            window.location.href = '../select_profile.html';
        }
    });

    window.addEventListener('click', (e) => {
        if (dropdownMenu && !dropdownMenu.contains(e.target) && !menuToggleBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const COORDINATE_OFFSET = 1000; // Offset for mapping logical -1000 to +1000 to physical 0 to 2000
    const saveLayoutBtn = document.getElementById('save-layout-btn');

    // --- UI Mode Elements ---
    const departmentModeControls = document.getElementById('department-mode-controls');
    const integratedModeControls = document.getElementById('integrated-mode-controls');
    const changeModeBtnDept = document.getElementById('change-mode-btn');
    const changeModeBtnIntegrated = document.getElementById('change-mode-btn-integrated');
    const departmentSelect = document.getElementById('department-select');
    const layoutContainer = document.getElementById('layout-container');

    let customers = [];
    let currentDepartment = '';
    let viewMode = localStorage.getItem(getKey('layoutViewMode')) || 'department';

    // --- Integrated Mode State ---
    let layouts = [];
    let layoutAssignments = {}; // { [departmentName]: layoutId }
    let activeLayoutId = null;
    let selectedLayoutIdInManager = null;
    let zoomLevel = 1;



    // --- DOM Elements (Integrated Mode) ---
    const manageLayoutsBtn = document.getElementById('manage-layouts-btn');
    const manageLayoutsModal = document.getElementById('manage-layouts-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const layoutManagementList = document.getElementById('layout-management-list');
    const newLayoutNameInput = document.getElementById('new-layout-name');
    const addLayoutBtn = document.getElementById('add-layout-btn');
    const departmentAssignmentList = document.getElementById('department-assignment-list');
    const selectedLayoutNameEl = document.getElementById('selected-layout-name');
    const departmentFocusSelect = document.getElementById('department-focus-select');
    const toggleDeptNamesBtn = document.getElementById('toggle-dept-names-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    const layoutContainerWrapper = document.querySelector('.layout-container-wrapper');

    // --- Data Functions ---
    const loadIntegratedData = () => {
        layouts = JSON.parse(localStorage.getItem(getKey('layouts'))) || [];
        layoutAssignments = JSON.parse(localStorage.getItem(getKey('layoutAssignments'))) || {};
        activeLayoutId = localStorage.getItem(getKey('activeLayoutId')) || null;
    };

    const saveIntegratedData = () => {
        localStorage.setItem(getKey('layouts'), JSON.stringify(layouts));
        localStorage.setItem(getKey('layoutAssignments'), JSON.stringify(layoutAssignments));
        localStorage.setItem(getKey('activeLayoutId'), activeLayoutId);
    };

    // --- Modal Logic ---
    const openManageModal = () => {
        loadCustomers();
        loadIntegratedData(); // Open with the latest data
        selectedLayoutIdInManager = activeLayoutId;
        renderLayoutManagementList();
        renderDepartmentAssignmentList();
        manageLayoutsModal.style.display = 'flex';
    };

    const closeManageModal = () => {
        manageLayoutsModal.style.display = 'none';
        renderApp(); // Re-render main UI after closing
    };

    manageLayoutsBtn.addEventListener('click', openManageModal);
    closeModalBtn.addEventListener('click', closeManageModal);

    // --- Zoom Logic (Integrated Mode) ---
    const applyZoom = (newZoom) => {
        if (viewMode !== 'integrated') return;
        const oldZoom = zoomLevel;

        // Find the canvas point at the center of the viewport BEFORE the zoom
        const viewportCenterX = layoutContainerWrapper.clientWidth / 2;
        const viewportCenterY = layoutContainerWrapper.clientHeight / 2;
        const canvasX = (layoutContainerWrapper.scrollLeft + viewportCenterX) / oldZoom;
        const canvasY = (layoutContainerWrapper.scrollTop + viewportCenterY) / oldZoom;

        // Apply the new zoom level
        zoomLevel = newZoom;
        layoutContainer.style.transform = `scale(${zoomLevel})`;
        zoomResetBtn.textContent = `${Math.round(zoomLevel * 100)}%`;

        // Calculate the new scroll position to keep the canvas point centered
        const newScrollLeft = (canvasX * zoomLevel) - viewportCenterX;
        const newScrollTop = (canvasY * zoomLevel) - viewportCenterY;

        // Apply the new scroll position
        layoutContainerWrapper.scrollTo(newScrollLeft, newScrollTop);
    };

    zoomInBtn.addEventListener('click', () => applyZoom(Math.min(3, zoomLevel + 0.1)));
    zoomOutBtn.addEventListener('click', () => applyZoom(Math.max(0.2, zoomLevel - 0.1)));
    zoomResetBtn.addEventListener('click', () => applyZoom(1));

    layoutContainerWrapper.addEventListener('wheel', (e) => {
        if (viewMode === 'integrated' && e.ctrlKey) {
            e.preventDefault();
            let newZoom = zoomLevel;
            if (e.deltaY < 0) { // wheel up, zoom in
                newZoom = Math.min(3, zoomLevel + 0.1);
            } else { // wheel down, zoom out
                newZoom = Math.max(0.2, zoomLevel - 0.1);
            }
            applyZoom(newZoom);
        }
    }, { passive: false });


    // --- Layout Management Logic ---
    const renderDepartmentAssignmentList = () => {
        const allDepartments = [...new Set(customers.map(c => c.department).filter(Boolean))];
        departmentAssignmentList.innerHTML = '';

        const selectedLayout = layouts.find(l => l.id === selectedLayoutIdInManager);
        if (!selectedLayout) {
            selectedLayoutNameEl.textContent = '레이아웃을 선택하세요.';
            return;
        }
        selectedLayoutNameEl.textContent = `'${selectedLayout.name}' 레이아웃에 부서 할당`;

        allDepartments.forEach(dept => {
            const isChecked = layoutAssignments[dept] === selectedLayoutIdInManager;
            const div = document.createElement('div');
            div.className = 'department-item';
            div.innerHTML = `
                <input type="checkbox" id="dept-assign-${dept}" value="${dept}" ${isChecked ? 'checked' : ''}>
                <label for="dept-assign-${dept}">${dept}</label>
            `;
            departmentAssignmentList.appendChild(div);
        });
    };

    const renderLayoutManagementList = () => {
        layoutManagementList.innerHTML = '';
        layouts.forEach(layout => {
            const li = document.createElement('li');
            li.dataset.id = layout.id;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = layout.name;
            nameSpan.addEventListener('click', () => {
                selectedLayoutIdInManager = layout.id;
                renderLayoutManagementList();
                renderDepartmentAssignmentList();
            });

            if (layout.id === selectedLayoutIdInManager) {
                li.classList.add('selected');
            }

            const buttonsDiv = document.createElement('div');
            buttonsDiv.innerHTML = `
                <button class="btn-secondary rename-layout-btn">수정</button>
                <button class="btn-danger delete-layout-btn">삭제</button>
            `;

            li.appendChild(nameSpan);
            li.appendChild(buttonsDiv);
            layoutManagementList.appendChild(li);
        });
    };

    addLayoutBtn.addEventListener('click', () => {
        const name = newLayoutNameInput.value.trim();
        if (name && !layouts.some(l => l.name === name)) {
            const newLayout = { id: Date.now(), name };
            layouts.push(newLayout);
            newLayoutNameInput.value = '';
            saveIntegratedData();
            renderLayoutManagementList();
        }
    });

    departmentAssignmentList.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const departmentName = e.target.value;
            if (e.target.checked) {
                layoutAssignments[departmentName] = selectedLayoutIdInManager;
            } else {
                if (layoutAssignments[departmentName] === selectedLayoutIdInManager) {
                    delete layoutAssignments[departmentName];
                }
            }
            saveIntegratedData();
        }
    });

    layoutManagementList.addEventListener('click', (e) => {
        const target = e.target;
        const layoutId = parseInt(target.closest('li').dataset.id);
        if (!layoutId) return;

        if (target.classList.contains('rename-layout-btn')) {
            const layout = layouts.find(l => l.id === layoutId);
            const newName = prompt('새로운 레이아웃 이름을 입력하세요:', layout.name);
            if (newName && newName.trim() && !layouts.some(l => l.name === newName.trim())) {
                layout.name = newName.trim();
                saveIntegratedData();
                renderLayoutManagementList();
            }
        } else if (target.classList.contains('delete-layout-btn')) {
            if (confirm('정말로 이 레이아웃을 삭제하시겠습니까?\n저장된 모든 위치 정보가 영구적으로 사라집니다.')) {
                layouts = layouts.filter(l => l.id !== layoutId);
                localStorage.removeItem(getKey(`layout_${layoutId}`));
                Object.keys(layoutAssignments).forEach(dept => {
                    if (layoutAssignments[dept] === layoutId) {
                        delete layoutAssignments[dept];
                    }
                });
                if (activeLayoutId === layoutId) {
                    activeLayoutId = layouts.length > 0 ? layouts[0].id : null;
                }
                if (selectedLayoutIdInManager === layoutId) {
                    selectedLayoutIdInManager = activeLayoutId;
                }
                saveIntegratedData();
                renderLayoutManagementList();
                renderDepartmentAssignmentList();
            }
        }
    });



    const renderApp = () => {
        if (viewMode === 'department') {
            departmentModeControls.style.display = 'block';
            integratedModeControls.style.display = 'none';
            document.querySelector('main').classList.remove('integrated-mode');
            initDepartmentMode(); // 부서 모드 렌더링 시작
        } else { // integrated mode
            departmentModeControls.style.display = 'none';
            integratedModeControls.style.display = 'block';
            document.querySelector('main').classList.add('integrated-mode');
            // 통합 모드 렌더링 시작
            loadIntegratedData(); // activeLayoutId and layouts are loaded here
            // Ensure activeLayoutId is valid
            const foundActiveLayout = layouts.find(l => l.id === activeLayoutId);
            if (!foundActiveLayout && layouts.length > 0) {
                activeLayoutId = layouts[0].id; // Default to the first layout
                saveIntegratedData();
            } else if (layouts.length === 0) {
                activeLayoutId = null; // No layouts exist
                saveIntegratedData();
            }
            populateLayoutDropdown();
            renderIntegratedLayout();
            centerViewOnLogicalOrigin(); // Center view after rendering integrated layout
        }
    };

    // --- Integrated Mode Rendering ---
    const populateLayoutDropdown = () => {
        const layoutDropdown = document.getElementById('department-focus-select'); // 용도 변경
        layoutDropdown.innerHTML = '';
        if (layouts.length === 0) {
            layoutDropdown.innerHTML = '<option>레이아웃을 생성해주세요</option>';
            return;
        }

        layouts.forEach(layout => {
            const option = document.createElement('option');
            option.value = layout.id;
            option.textContent = layout.name;
            if (layout.id === activeLayoutId) {
                option.selected = true;
            }
            layoutDropdown.appendChild(option);
        });
    };

    const renderIntegratedLayout = () => {
        layoutContainer.innerHTML = '';
        if (!activeLayoutId) return;

        const departmentsInLayout = Object.keys(layoutAssignments).filter(dept => layoutAssignments[dept] === activeLayoutId);
        const customersInLayout = customers.filter(c => departmentsInLayout.includes(c.department));
        const savedPositions = JSON.parse(localStorage.getItem(getKey(`layout_${activeLayoutId}`))) || {};

        customersInLayout.forEach(customer => {
            const pcElement = document.createElement('div');
            pcElement.classList.add('pc-item');
            if (customer.isError) {
                pcElement.classList.add('pc-item-error');
            } else if (customer.isPending) {
                pcElement.classList.add('pc-item-pending');
            }
            else if (customer.isCompleted) {
                pcElement.classList.add('pc-item-completed');
            }
            pcElement.dataset.id = customer.id;
            const ipParts = customer.ip.split('.');
            const lastIpDigit = ipParts.length > 0 ? ipParts[ipParts.length - 1] : customer.ip;
            pcElement.innerHTML = `
                <strong>${customer.name}</strong><br>
                ${lastIpDigit}<br>
                <span class="pc-item-dept">${customer.department}</span>
            `;
            pcElement.style.position = 'absolute';

            if (savedPositions[customer.id]) {
                pcElement.style.left = savedPositions[customer.id].left;
                pcElement.style.top = savedPositions[customer.id].top;
            } else {
                pcElement.style.left = `${Math.random() * 400 + (COORDINATE_OFFSET - 200)}px`; // Center 400px range around COORDINATE_OFFSET
                pcElement.style.top = `${Math.random() * 400 + (COORDINATE_OFFSET - 200)}px`; // Center 400px range around COORDINATE_OFFSET
            }

            makeIntegratedDraggable(pcElement); // To be implemented
            layoutContainer.appendChild(pcElement);
        });
    };

    const centerViewOnLogicalOrigin = () => {
        const wrapper = document.querySelector('.layout-container-wrapper');
        if (wrapper) { // Ensure wrapper exists before trying to scroll
            const scrollLeft = COORDINATE_OFFSET - (wrapper.clientWidth / 2);
            const scrollTop = COORDINATE_OFFSET - (wrapper.clientHeight / 2);
            wrapper.scrollTo(scrollLeft, scrollTop);
        }
    };

    const getLayoutContentBounds = () => {
        const pcItems = layoutContainer.querySelectorAll('.pc-item');
        if (pcItems.length === 0) {
            // If no items, return a default small area around logical (0,0)
            return {
                minX: COORDINATE_OFFSET - 50,
                minY: COORDINATE_OFFSET - 50,
                maxX: COORDINATE_OFFSET + 50,
                maxY: COORDINATE_OFFSET + 50
            };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        pcItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            // Get position relative to layoutContainer
            const itemLeft = item.offsetLeft;
            const itemTop = item.offsetTop;
            const itemRight = itemLeft + item.offsetWidth;
            const itemBottom = itemTop + item.offsetHeight;

            minX = Math.min(minX, itemLeft);
            minY = Math.min(minY, itemTop);
            maxX = Math.max(maxX, itemRight);
            maxY = Math.max(maxY, itemBottom);
        });

        return { minX, minY, maxX, maxY };
    };





    document.getElementById('department-focus-select').addEventListener('change', (e) => {
        if (viewMode === 'integrated') {
            activeLayoutId = parseInt(e.target.value);
            saveIntegratedData();
            renderIntegratedLayout();
            centerViewOnLogicalOrigin(); // Center view after selecting a new layout
        }
    });

    const handleModeChange = () => {
        viewMode = viewMode === 'department' ? 'integrated' : 'department';
        localStorage.setItem(getKey('layoutViewMode'), viewMode);
        renderApp();
    };

    changeModeBtnDept.addEventListener('click', handleModeChange);
    changeModeBtnIntegrated.addEventListener('click', handleModeChange);

    function loadCustomers() {
        const storedCustomers = localStorage.getItem(getKey('customers'));
        if (storedCustomers) {
            customers = JSON.parse(storedCustomers);
        }
    }

    const loadLayout = (department) => {
        const storedLayout = localStorage.getItem(getKey(`layout_${department}`));
        return storedLayout ? JSON.parse(storedLayout) : {};
    };

    const saveLayout = (department, layoutData) => {
        localStorage.setItem(getKey(`layout_${department}`), JSON.stringify(layoutData));
    };

    const initDepartmentMode = () => {
        const departments = [...new Set(customers.map(c => c.department).filter(Boolean))];
        departmentSelect.innerHTML = departments.map(d => `<option value="${d}">${d}</option>`).join('');
        const savedDepartment = localStorage.getItem(getKey('selectedLayoutDepartment'));
        if (departments.length > 0) {
            if (savedDepartment && departments.includes(savedDepartment)) {
                currentDepartment = savedDepartment;
            } else {
                currentDepartment = departments[0];
            }
            departmentSelect.value = currentDepartment;
            renderDepartmentLayout(currentDepartment);
        }
    };

    const renderDepartmentLayout = (department) => {
        layoutContainer.innerHTML = '';
        const departmentCustomers = customers.filter(c => c.department === department);
        const savedPositions = loadLayout(department);

        departmentCustomers.forEach(customer => {
            const pcElement = document.createElement('div');
            pcElement.classList.add('pc-item');
            if (customer.isError) {
                pcElement.classList.add('pc-item-error');
            } else if (customer.isPending) {
                pcElement.classList.add('pc-item-pending');
            }
            pcElement.dataset.id = customer.id;
            const ipParts = customer.ip.split('.');
            const lastIpDigit = ipParts.length > 0 ? ipParts[ipParts.length - 1] : customer.ip;
            pcElement.innerHTML = `<strong>${customer.name}</strong><br>${lastIpDigit}`;
            pcElement.style.position = 'absolute';

            if (savedPositions[customer.id]) {
                pcElement.style.left = savedPositions[customer.id].left;
                pcElement.style.top = savedPositions[customer.id].top;
            } else {
                pcElement.style.left = `${Math.random() * 400}px`;
                pcElement.style.top = `${Math.random() * 400}px`;
            }

            makeDepartmentDraggable(pcElement);
            layoutContainer.appendChild(pcElement);
        });
    };

    // --- Drag and Drop Logic ---
    const makeDepartmentDraggable = (element) => {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let dragStartTime, startX, startY;
        const clickThreshold = 5;
        const timeThreshold = 200;

        const getClientCoords = (e) => {
            return e.touches ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } : { clientX: e.clientX, clientY: e.clientY };
        };

        const dragStart = (e) => {
            e.preventDefault();
            const coords = getClientCoords(e);
            pos3 = coords.clientX;
            pos4 = coords.clientY;
            startX = pos3;
            startY = pos4;
            dragStartTime = Date.now();

            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchmove', elementDrag, { passive: false });
            document.addEventListener('touchend', dragEnd);
        };

        const elementDrag = (e) => {
            e.preventDefault();
            const coords = getClientCoords(e);
            pos1 = pos3 - coords.clientX;
            pos2 = pos4 - coords.clientY;
            pos3 = coords.clientX;
            pos4 = coords.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        };

        const dragEnd = (e) => {
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchmove', elementDrag);
            document.removeEventListener('touchend', dragEnd);

            const timeElapsed = Date.now() - dragStartTime;
            const endCoords = e.changedTouches ? { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY } : { clientX: e.clientX, clientY: e.clientY };
            const distanceMoved = Math.sqrt(Math.pow(endCoords.clientX - startX, 2) + Math.pow(endCoords.clientY - startY, 2));

            if (timeElapsed < timeThreshold && distanceMoved < clickThreshold) {
                const customerId = element.dataset.id;
                window.location.href = `../ipmanager/index.html#customer-${customerId}`;
            }
        };

        element.addEventListener('mousedown', dragStart);
        element.addEventListener('touchstart', dragStart, { passive: false });
    };

    const makeIntegratedDraggable = (element) => {
        let dragStartTime, startX, startY;
        const clickThreshold = 5;
        const timeThreshold = 200;

        const getClientCoords = (e) => {
            return e.touches ? { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } : { clientX: e.clientX, clientY: e.clientY };
        };

        const dragStart = (e) => {
            e.preventDefault();
            const coords = getClientCoords(e);
            
            element.mouseStartX = coords.clientX;
            element.mouseStartY = coords.clientY;
            element.initialTop = element.offsetTop;
            element.initialLeft = element.offsetLeft;

            dragStartTime = Date.now();
            startX = coords.clientX;
            startY = coords.clientY;

            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchmove', elementDrag, { passive: false });
            document.addEventListener('touchend', dragEnd);
        };

        const elementDrag = (e) => {
            e.preventDefault();
            const coords = getClientCoords(e);

            const deltaX = coords.clientX - element.mouseStartX;
            const deltaY = coords.clientY - element.mouseStartY;

            const newLeft = element.initialLeft + deltaX / zoomLevel;
            const newTop = element.initialTop + deltaY / zoomLevel;

            const containerWidth = 8000;
            const containerHeight = 8000;
            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;

            const clampedLeft = Math.max(0, Math.min(newLeft, containerWidth - elementWidth));
            const clampedTop = Math.max(0, Math.min(newTop, containerHeight - elementHeight));

            element.style.left = clampedLeft + 'px';
            element.style.top = clampedTop + 'px';
        };

        const dragEnd = (e) => {
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchmove', elementDrag);
            document.removeEventListener('touchend', dragEnd);

            // Auto-save position
            const layoutData = JSON.parse(localStorage.getItem(getKey(`layout_${activeLayoutId}`))) || {};
            layoutData[element.dataset.id] = {
                left: element.style.left,
                top: element.style.top
            };
            localStorage.setItem(getKey(`layout_${activeLayoutId}`), JSON.stringify(layoutData));

            // Check for click
            const timeElapsed = Date.now() - dragStartTime;
            const endCoords = e.changedTouches ? { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY } : { clientX: e.clientX, clientY: e.clientY };
            const distanceMoved = Math.sqrt(Math.pow(endCoords.clientX - startX, 2) + Math.pow(endCoords.clientY - startY, 2));

            if (timeElapsed < timeThreshold && distanceMoved < clickThreshold) {
                const customerId = element.dataset.id;
                window.location.href = `../ipmanager/index.html#customer-${customerId}`;
            }
        };

        element.addEventListener('mousedown', dragStart);
        element.addEventListener('touchstart', dragStart, { passive: false });
    };

    departmentSelect.addEventListener('change', (e) => {
        currentDepartment = e.target.value;
        localStorage.setItem(getKey('selectedLayoutDepartment'), currentDepartment);
        renderDepartmentLayout(currentDepartment);
    });

    saveLayoutBtn.addEventListener('click', () => {
        const layoutData = {};
        layoutContainer.querySelectorAll('.pc-item').forEach(pcElement => {
            layoutData[pcElement.dataset.id] = {
                left: pcElement.style.left,
                top: pcElement.style.top
            };
        });
        saveLayout(currentDepartment, layoutData);
        alert('레이아웃이 저장되었습니다!');
    });

    // --- App Initialization ---
    loadCustomers();
    renderApp();

    // --- Panning Logic ---
    const wrapper = document.querySelector('.layout-container-wrapper');
    let isPanning = false;
    let startX, startY, scrollLeft, scrollTop;

    wrapper.addEventListener('mousedown', (e) => {
        // Only pan if clicking on the background, not on a pc item
        if (e.target.closest('.pc-item')) return;

        isPanning = true;
        wrapper.style.cursor = 'grabbing';
        startX = e.pageX - wrapper.offsetLeft;
        startY = e.pageY - wrapper.offsetTop;
        scrollLeft = wrapper.scrollLeft;
        scrollTop = wrapper.scrollTop;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    const onMouseMove = (e) => {
        if (!isPanning) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const y = e.pageY - wrapper.offsetTop;
        const walkX = x - startX;
        const walkY = y - startY;
        let newScrollLeft = scrollLeft - walkX;
        let newScrollTop = scrollTop - walkY;

        newScrollLeft = Math.max(minScrollX, Math.min(newScrollLeft, maxScrollX));
        newScrollTop = Math.max(minScrollY, Math.min(newScrollTop, maxScrollY));

        wrapper.scrollLeft = newScrollLeft;
        wrapper.scrollTop = newScrollTop;
    };

    const onMouseUp = () => {
        isPanning = false;
        wrapper.style.cursor = 'default'; // or 'grab' if we set it in CSS
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    // Set initial scroll position after the entire page is fully loaded
    window.addEventListener('load', () => {
        centerViewOnLogicalOrigin();
    });

    // --- Hamburger Menu Logic ---
    toggleDeptNamesBtn.addEventListener('click', () => {
        layoutContainer.classList.toggle('show-departments');
        const isShowing = layoutContainer.classList.contains('show-departments');
        toggleDeptNamesBtn.textContent = isShowing ? '부서 숨김' : '부서 표시';
        toggleDeptNamesBtn.classList.toggle('active', isShowing);
    });
});