const currentProfile = localStorage.getItem('currentProfile');
if (!currentProfile) {
    alert('업무 프로필이 선택되지 않았습니다. 프로필 선택 화면으로 이동합니다.');
    window.location.href = '../select_profile.html';
}

const getKey = (key) => `${currentProfile}_${key}`;

document.addEventListener('DOMContentLoaded', () => {
    const reportContainer = document.getElementById('report-container');
    
    let reportData = []; // Store data for CSV export

    const generateReport = () => {
        const customers = JSON.parse(localStorage.getItem(getKey('customers'))) || [];
        reportData = []; // Reset data

        if (customers.length === 0) {
            reportContainer.innerHTML = '<p>표시할 고객 데이터가 없습니다.</p>';
            return;
        }

        const customersByDept = customers.reduce((acc, customer) => {
            const dept = customer.department || '미지정';
            if (!acc[dept]) {
                acc[dept] = [];
            }
            acc[dept].push(customer);
            return acc;
        }, {});

        let reportHtml = '';
        const sortedDepts = Object.keys(customersByDept).sort();

        sortedDepts.forEach(dept => {
            reportHtml += `<div class="department-section">
                             <h2>${dept}</h2>
                             <ul>`;
            
            const deptCustomers = customersByDept[dept];
            deptCustomers.forEach(customer => {
                let statusText = '';
                if (customer.isCompleted) {
                    statusText = '완료';
                } else if (customer.isError) {
                    statusText = '불가능';
                } else if (customer.isPending) {
                    statusText = '보류';
                }

                reportData.push({
                    createdAt: customer.createdAt,
                    department: dept,
                    name: customer.name,
                    pcId: customer.pcId || '',
                    ip: customer.ip || '',
                    workername: customer.workerName,
                    backupNotes: customer.backupNotes || '',
                    status: statusText
                });

                let statusHtml = '';
                if (statusText) {
                    let statusClass = '';
                    if (statusText === '완료') {
                        statusClass = 'status-complete';
                    } else if (statusText === '보류') {
                        statusClass = 'status-pending';
                    } else if (statusText === '불가능') {
                        statusClass = 'status-impossible';
                    }
                    statusHtml = `<span class="status ${statusClass}">${statusText}</span>`;
                }

                reportHtml += `<li>${customer.name}${statusHtml}</li>`;
            });

            reportHtml += `</ul></div>`;
        });

        reportContainer.innerHTML = reportHtml;
    };

    const exportToCsv = (filename, data) => {
            const header = ['작업일', '부서', '이름', 'PC ID', 'IP 주소', '상태', '작업자', '비고'];
            const csvRows = [header.join(',')];
        
            data.forEach(row => {
                    const values = [
                        row.createdAt,
                        row.department,
                        row.name,
                        row.pcId,
                        row.ip,
                        row.status,
                        row.workername,
                        row.backupNotes
                    ];
                    csvRows.push(values.join(','));
                });
        const csvString = csvRows.join('\r\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // --- Hamburger Menu Logic ---
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const exportCsvBtnMenu = document.getElementById('export-csv-btn-menu');
    const changeProfileLink = document.getElementById('change-profile-link');

    menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    exportCsvBtnMenu.addEventListener('click', () => {
        const today = new Date();
        const dateString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        exportToCsv(`고객_현황_보고서_${dateString}.csv`, reportData);
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

    generateReport();
});
