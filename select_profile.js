document.addEventListener('DOMContentLoaded', () => {
    const profileListEl = document.getElementById('profile-list');
    const newProfileNameInput = document.getElementById('new-profile-name');
    const addProfileBtn = document.getElementById('add-profile-btn');

    // --- 데이터 마이그레이션 UI ---
    const migrationPrompt = document.getElementById('migration-prompt');
    const migrationProfileNameInput = document.getElementById('migration-profile-name');
    const migrateBtn = document.getElementById('migrate-btn');

    let profiles = JSON.parse(localStorage.getItem('b2b_app_profiles')) || [];

    const saveProfiles = () => {
        localStorage.setItem('b2b_app_profiles', JSON.stringify(profiles));
    };

    const renderProfiles = () => {
        profileListEl.innerHTML = '';
        profiles.forEach(profile => {
            const li = document.createElement('li');
            li.textContent = profile;
            li.dataset.profile = profile;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '삭제';
            deleteBtn.className = 'delete-profile-btn';
            deleteBtn.dataset.profile = profile;

            li.appendChild(deleteBtn);
            profileListEl.appendChild(li);
        });
    };

    const selectProfile = (profileName) => {
        localStorage.setItem('currentProfile', profileName);
        window.location.href = 'index.html';
    };

    // --- 이벤트 리스너 ---
    addProfileBtn.addEventListener('click', () => {
        const newProfileName = newProfileNameInput.value.trim();
        if (newProfileName && !profiles.includes(newProfileName)) {
            profiles.push(newProfileName);
            saveProfiles();
            renderProfiles();
            newProfileNameInput.value = '';
        } else if (profiles.includes(newProfileName)) {
            alert('이미 존재하는 프로필 이름입니다.');
        }
    });

    profileListEl.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            selectProfile(e.target.dataset.profile);
        } else if (e.target.classList.contains('delete-profile-btn')) {
            e.stopPropagation();
            const profileToDelete = e.target.dataset.profile;
            if (confirm(`'${profileToDelete}' 프로필을 삭제하시겠습니까?
관련된 모든 데이터가 영구적으로 삭제됩니다.`)) {
                // 1. 프로필 목록에서 삭제
                profiles = profiles.filter(p => p !== profileToDelete);
                saveProfiles();

                // 2. 관련된 모든 데이터 삭제
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(profileToDelete + '_')) {
                        localStorage.removeItem(key);
                    }
                });

                renderProfiles();
            }
        }
    });

    // --- 기존 데이터 마이그레이션 로직 ---
    const checkForMigration = () => {
        const oldCustomers = localStorage.getItem('customers');
        // profiles 배열이 비어있고, 기존 'customers' 데이터가 있을 때만 마이그레이션 제안
        if (oldCustomers && profiles.length === 0) {
            migrationPrompt.style.display = 'block';
        }
    };

    migrateBtn.addEventListener('click', () => {
        const newProfileName = migrationProfileNameInput.value.trim();
        if (!newProfileName) {
            alert('프로필 이름을 입력해주세요.');
            return;
        }

        if (profiles.includes(newProfileName)) {
            alert('이미 존재하는 프로필 이름입니다.');
            return;
        }

        // 1. 기존 데이터를 새 프로필 이름으로 복사
        const keysToMigrate = ['customers', 'printerPresets', 'selectedDepartment', 'selectedLayoutDepartment'];
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('layout_')) {
                keysToMigrate.push(key);
            }
        });

        keysToMigrate.forEach(key => {
            const oldData = localStorage.getItem(key);
            if (oldData) {
                localStorage.setItem(`${newProfileName}_${key}`, oldData);
                localStorage.removeItem(key); // 이전 키 삭제
            }
        });

        // 2. 새 프로필을 목록에 추가하고 저장
        profiles.push(newProfileName);
        saveProfiles();

        // 3. UI 업데이트
        alert(`'${newProfileName}' 프로필을 생성하고 기존 데이터를 성공적으로 이전했습니다.`);
        migrationPrompt.style.display = 'none';
        renderProfiles();
    });

    // --- 초기화 ---
    checkForMigration();
    renderProfiles();
});
