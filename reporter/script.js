const currentProfile = localStorage.getItem('currentProfile');
if (!currentProfile) {
    alert('업무 프로필이 선택되지 않았습니다. 프로필 선택 화면으로 이동합니다.');
    window.location.href = '../select_profile.html';
}

// Helper to create profile-specific keys
const getKey = (key) => `${currentProfile}_${key}`;

document.addEventListener('DOMContentLoaded', () => {
    const reportContainer = document.getElementById('report-container');
    const exportCsvBtn = document.getElementById('export-csv-btn');

    let reportData = [];

    const generateReport = () => {
        const customers = JSON.parse(localStorage.getItem(getKey('customers'))) || [];
        reportData = [];

        if (customers.length === 0) {
            reportContainer.innerHTML = '<p>표시할 고객 데이터가 없습니다.</p>';
            return;
        }

        // ... (나머지 generateReport 로직은 변경 없음)
    };

    const exportToCsv = (filename, data) => {
        // ... (exportToCsv 로직은 변경 없음)
    };

    exportCsvBtn.addEventListener('click', () => {
        // ... (CSV 내보내기 로직은 변경 없음)
    });

    generateReport();
});