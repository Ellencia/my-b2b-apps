document.addEventListener('DOMContentLoaded', () => {
    const departmentSelect = document.getElementById('department-select');
    const layoutContainer = document.getElementById('layout-container');
    const saveLayoutBtn = document.getElementById('save-layout-btn');

    let customers = [];
    let currentDepartment = '';

    // --- 데이터 로드 및 저장 ---
    const loadCustomers = () => {
        const storedCustomers = localStorage.getItem('customers');
        if (storedCustomers) {
            customers = JSON.parse(storedCustomers);
        }
    };

    const loadLayout = (department) => {
        const storedLayout = localStorage.getItem(`layout_${department}`);
        return storedLayout ? JSON.parse(storedLayout) : {};
    };

    const saveLayout = (department, layoutData) => {
        localStorage.setItem(`layout_${department}`, JSON.stringify(layoutData));
    };

    // --- UI 렌더링 ---
    const populateDepartmentSelect = () => {
        const departments = [...new Set(customers.map(c => c.department).filter(Boolean))];
        departmentSelect.innerHTML = departments.map(d => `<option value="${d}">${d}</option>`).join('');
        if (departments.length > 0) {
            currentDepartment = departments[0];
            departmentSelect.value = currentDepartment;
            renderLayout(currentDepartment);
        }
    };

    const renderLayout = (department) => {
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
            pcElement.style.position = 'absolute'; // 드래그를 위해 absolute 포지셔닝

            // 저장된 위치가 있으면 적용
            if (savedPositions[customer.id]) {
                pcElement.style.left = savedPositions[customer.id].left;
                pcElement.style.top = savedPositions[customer.id].top;
            } else {
                // 저장된 위치가 없으면 기본 위치 설정 (예: 무작위 또는 그리드)
                pcElement.style.left = `${Math.random() * (layoutContainer.offsetWidth - 100)}px`; // 임시
                pcElement.style.top = `${Math.random() * (layoutContainer.offsetHeight - 50)}px`; // 임시
            }

            makeDraggable(pcElement);
            layoutContainer.appendChild(pcElement);
        });
    };

    // --- 드래그 기능 ---
    const makeDraggable = (element) => {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let dragStartTime, startX, startY;
        const clickThreshold = 5; // Max pixels moved to be considered a click
        const timeThreshold = 200; // Max ms to be considered a click

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

    // --- 이벤트 리스너 ---
    departmentSelect.addEventListener('change', (e) => {
        currentDepartment = e.target.value;
        renderLayout(currentDepartment);
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

    // --- 초기화 ---
    loadCustomers();
    populateDepartmentSelect();
});
