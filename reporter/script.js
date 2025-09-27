document.addEventListener('DOMContentLoaded', () => {
    const reportContainer = document.getElementById('report-container');
    const exportCsvBtn = document.getElementById('export-csv-btn');

    let reportData = []; // Store data for CSV export

    const generateReport = () => {
        const customers = JSON.parse(localStorage.getItem('customers')) || [];
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
                if (customer.isError) {
                    statusText = '불가능';
                } else if (customer.isPending) {
                    statusText = '보류';
                }

                // Add data for CSV export
                reportData.push({ department: dept, name: customer.name, status: statusText });

                let statusHtml = '';
                if (statusText) {
                    let statusClass = statusText === '보류' ? 'status-pending' : 'status-impossible';
                    statusHtml = `<span class="status ${statusClass}">${statusText}</span>`;
                }

                reportHtml += `<li>${customer.name}${statusHtml}</li>`;
            });

            reportHtml += `</ul></div>`;
        });

        reportContainer.innerHTML = reportHtml;
    };

    const exportToCsv = (filename, data) => {
        const header = ['부서', '이름', '상태'];
        const csvRows = [header.join(',')];

        data.forEach(row => {
            const values = [row.department, row.name, row.status];
            csvRows.push(values.join(','));
        });

        const csvString = csvRows.join('\r\n');
        const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        if (link.download !== undefined) { // Feature detection
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    exportCsvBtn.addEventListener('click', () => {
        const today = new Date();
        const dateString = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        exportToCsv(`고객_현황_보고서_${dateString}.csv`, reportData);
    });

    generateReport();
});