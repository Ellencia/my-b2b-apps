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
            const profileNameSpan = document.createElement('span');
            profileNameSpan.textContent = profile;
            li.appendChild(profileNameSpan);

            const btnContainer = document.createElement('div');

            const exportBtn = document.createElement('button');
            exportBtn.textContent = '내보내기';
            exportBtn.className = 'export-profile-btn';
            exportBtn.dataset.profile = profile;
            btnContainer.appendChild(exportBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '삭제';
            deleteBtn.className = 'delete-profile-btn';
            deleteBtn.dataset.profile = profile;
            btnContainer.appendChild(deleteBtn);

            li.appendChild(btnContainer);
            li.dataset.profile = profile;
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
        const targetProfile = e.target.dataset.profile;

        if (e.target.classList.contains('export-profile-btn')) {
            e.stopPropagation();
            const profileData = {};
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(targetProfile + '_')) {
                    try {
                        profileData[key] = JSON.parse(localStorage.getItem(key));
                    } catch (err) {
                        profileData[key] = localStorage.getItem(key);
                    }
                }
            });

            const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${targetProfile}_backup.json`;
            link.click();

        } else if (e.target.classList.contains('delete-profile-btn')) {
            e.stopPropagation();
            if (confirm(`'${targetProfile}' 프로필을 삭제하시겠습니까?\n관련된 모든 데이터가 영구적으로 삭제됩니다.`)) {
                profiles = profiles.filter(p => p !== targetProfile);
                saveProfiles();
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith(targetProfile + '_')) {
                        localStorage.removeItem(key);
                    }
                });
                renderProfiles();
            }
        } else if (e.target.closest('li')) {
            selectProfile(e.target.closest('li').dataset.profile);
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

    // --- 데이터 관리 로직 ---
    const exportDataBtn = document.getElementById('export-data-btn');
    const importFileInput = document.getElementById('import-file-input');
    const importDataBtn = document.getElementById('import-data-btn');

    exportDataBtn.addEventListener('click', () => {
        const backupData = {};
        const profileNames = JSON.parse(localStorage.getItem('b2b_app_profiles')) || [];

        // 1. 프로필 목록 자체를 백업
        backupData['b2b_app_profiles'] = profileNames;

        // 2. 각 프로필에 종속된 모든 데이터를 백업
        profileNames.forEach(profile => {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(profile + '_')) {
                    try {
                        // Try to parse as JSON, if it fails, it's likely a plain string
                        backupData[key] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        // Store as plain string if JSON.parse fails
                        backupData[key] = localStorage.getItem(key);
                    }
                }
            });
        });

        // 3. JSON 파일로 다운로드
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'b2b_backup.json';
        link.click();
    });

    importDataBtn.addEventListener('click', () => {
        const file = importFileInput.files[0];
        if (!file) {
            alert('먼저 백업 파일을 선택해주세요.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);

                if (importedData.b2b_app_profiles) {
                    // --- 전체 데이터 복원 ---
                    if (confirm('전체 백업 파일을 가져오시겠습니까?\n현재 앱의 모든 데이터가 백업 파일의 내용으로 대체됩니다. 이 작업은 되돌릴 수 없습니다.')) {
                        // 1. 기존 관련 데이터 모두 삭제
                        const currentProfiles = JSON.parse(localStorage.getItem('b2b_app_profiles')) || [];
                        currentProfiles.forEach(profile => {
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith(profile + '_')) {
                                    localStorage.removeItem(key);
                                }
                            });
                        });
                        localStorage.removeItem('b2b_app_profiles');

                        // 2. 새 데이터로 복원
                        Object.keys(importedData).forEach(key => {
                            const value = importedData[key];
                            if (typeof value === 'object' && value !== null) {
                                localStorage.setItem(key, JSON.stringify(value));
                            } else {
                                localStorage.setItem(key, value);
                            }
                        });

                        alert('전체 데이터를 성공적으로 가져왔습니다. 페이지를 새로고침합니다.');
                        window.location.reload();
                    }
                } else {
                    // --- 특정 프로필 데이터 복원 ---
                    const firstKey = Object.keys(importedData)[0];
                    if (!firstKey || !firstKey.includes('_')) throw new Error('프로필 정보를 식별할 수 없는 백업 파일입니다.');
                    
                    const profileName = firstKey.split('_')[0];

                    if (confirm(`'${profileName}' 프로필의 데이터를 가져오시겠습니까?\n기존에 있던 '${profileName}' 프로필의 데이터는 모두 대체됩니다.`)) {
                        // 1. 해당 프로필의 기존 데이터만 삭제
                        Object.keys(localStorage).forEach(key => {
                            if (key.startsWith(profileName + '_')) {
                                localStorage.removeItem(key);
                            }
                        });

                        // 2. 새 데이터로 복원
                        Object.keys(importedData).forEach(key => {
                            const value = importedData[key];
                            if (typeof value === 'object' && value !== null) {
                                localStorage.setItem(key, JSON.stringify(value));
                            } else {
                                localStorage.setItem(key, value);
                            }
                        });

                        // 3. 프로필 목록에 프로필 이름 추가 (없는 경우)
                        let existingProfiles = JSON.parse(localStorage.getItem('b2b_app_profiles')) || [];
                        if (!existingProfiles.includes(profileName)) {
                            existingProfiles.push(profileName);
                            localStorage.setItem('b2b_app_profiles', JSON.stringify(existingProfiles));
                        }

                        alert(`'${profileName}' 프로필 데이터를 성공적으로 가져왔습니다. 페이지를 새로고침합니다.`);
                        window.location.reload();
                    }
                }
            } catch (error) {
                alert('파일을 읽는 중 오류가 발생했습니다. 올바른 백업 파일인지 확인해주세요.\n\n' + error.message);
            }
        };
        reader.readAsText(file);
    });
});
