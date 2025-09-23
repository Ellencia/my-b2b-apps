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
            pcElement.dataset.id = customer.id;
            pcElement.innerHTML = `<strong>${customer.name}</strong><br>${customer.ip}`;
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

        const dragMouseDown = (e) => {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        const elementDrag = (e) => {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };

        element.onmousedown = dragMouseDown;
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
