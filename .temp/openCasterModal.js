// このファイルは実況解説者編集モーダルの新しい実装を含みます
// admin.jsからopenCasterModal関数を置き換える際に使用します

// 実況解説者編集モーダルを開く
async function openCasterModal(caster) {
    const modal = document.getElementById('casterModal');
    const container = document.getElementById('casterFormContainer');
    
    // 大会一覧を取得
    const tournaments = await getTournaments();
    
    // 選択済みの武器
    const selectedWeapons = caster.main_weapons || [];
    
    // 選択済みの大会履歴（拡張版: {tournament_id, role} の配列）
    const selectedHistory = caster.tournament_history_extended || [];
    
    // アイコンURLを取得
    const iconUrl = caster.icon_type === 'discord' ? caster.discord_avatar_url : 
                   caster.icon_type === 'url' ? caster.icon_url : null;
    
    container.innerHTML = `
        <form id="formCaster">
            <div class="form-group">
                <label class="form-label">アイコン</label>
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    ${iconUrl ? 
                        \`<img src="\${escapeHtml(iconUrl)}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;">\` : 
                        \`<div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;">🎙️</div>\`
                    }
                    <div>
                        <div style="font-weight: 600; font-size: 1.1rem;">\${escapeHtml(caster.name)}</div>
                        <div style="font-size: 0.85rem; color: #666;">実況解説者</div>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label required">名前</label>
                <input type="text" id="casterName" name="name" class="form-input" value="\${escapeHtml(caster.name)}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">アイコン設定タイプ</label>
                <select id="iconType" name="icon_type" class="form-input">
                    <option value="discord" \${caster.icon_type === 'discord' || !caster.icon_type ? 'selected' : ''}>Discordアイコンを使用</option>
                    <option value="url" \${caster.icon_type === 'url' ? 'selected' : ''}>URLを指定</option>
                    <option value="other" \${caster.icon_type === 'other' ? 'selected' : ''}>その他（運営対応）</option>
                </select>
            </div>
            
            <div class="form-group" id="iconUrlGroup" style="display: \${caster.icon_type === 'url' ? 'block' : 'none'};">
                <label class="form-label">アイコンURL</label>
                <input type="url" id="iconUrl" name="icon_url" class="form-input" value="\${escapeHtml(caster.icon_url || '')}" placeholder="https://example.com/icon.png">
            </div>
            
            <div class="form-group">
                <label class="form-label required">Xアカウ​ントID</label>
                <div style="display: flex; align-items: center;">
                    <span style="padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-right: none; border-radius: 4px 0 0 4px;">@</span>
                    <input type="text" id="xAccountId" name="x_account_id" class="form-input" value="\${escapeHtml(caster.x_account_id || '')}" placeholder="username" required style="border-radius: 0 4px 4px 0;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">YoutubeアカウントID（任意）</label>
                <div style="display: flex; align-items: center;">
                    <span style="padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-right: none; border-radius: 4px 0 0 4px;">@</span>
                    <input type="text" id="youtubeAccountId" name="youtube_account_id" class="form-input" value="\${escapeHtml(caster.youtube_account_id || '')}" placeholder="channelname" style="border-radius: 0 4px 4px 0;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">各ガチルールの最高XP（任意）</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">エリア</label>
                        <input type="number" id="xpArea" name="xp_area" class="form-input" placeholder="0" min="0" max="9999" value="\${caster.xp_area || ''}">
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">ヤグラ</label>
                        <input type="number" id="xpYagura" name="xp_yagura" class="form-input" placeholder="0" min="0" max="9999" value="\${caster.xp_yagura || ''}">
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">ホコ</label>
                        <input type="number" id="xpHoko" name="xp_hoko" class="form-input" placeholder="0" min="0" max="9999" value="\${caster.xp_hoko || ''}">
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">アサリ</label>
                        <input type="number" id="xpAsari" name="xp_asari" class="form-input" placeholder="0" min="0" max="9999" value="\${caster.xp_asari || ''}">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label required">モチブキ（最大3つ、1つは必須）</label>
                
                <!-- 選択された武器のプレビュー -->
                <div id="selectedWeaponsPreview" style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                    <!-- JavaScript で動的に生成 -->
                </div>
                
                <!-- 武器選択アコーディオン -->
                <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; padding: 12px; background: rgba(30, 55, 153, 0.05); border-radius: 8px; margin-bottom: 10px;" onclick="document.getElementById('weaponGridContainer').classList.toggle('u-hidden'); this.querySelector('.accordion-icon').textContent = document.getElementById('weaponGridContainer').classList.contains('u-hidden') ? '▼' : '▲';">
                    <label style="margin: 0; cursor: pointer; font-weight: 600;">武器を選択</label>
                    <span class="accordion-icon" style="font-size: 0.8rem; color: var(--c-primary);">▼</span>
                </div>
                <div class="u-hidden" id="weaponGridContainer">
                    <div style="margin-bottom: 10px;">
                        <input type="text" id="weaponSearch" placeholder="武器名で検索..." style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;">
                    </div>
                    <div id="weaponGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                        <!-- JavaScript で動的に生成 -->
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">大会実績（任意、最大3つ）</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="text" id="achievement1" name="achievement1" class="form-input" placeholder="1つ目の実績" value="\${caster.tournament_achievements && caster.tournament_achievements[0] ? escapeHtml(caster.tournament_achievements[0]) : ''}">
                    <input type="text" id="achievement2" name="achievement2" class="form-input" placeholder="2つ目の実績" value="\${caster.tournament_achievements && caster.tournament_achievements[1] ? escapeHtml(caster.tournament_achievements[1]) : ''}">
                    <input type="text" id="achievement3" name="achievement3" class="form-input" placeholder="3つ目の実績" value="\${caster.tournament_achievements && caster.tournament_achievements[2] ? escapeHtml(caster.tournament_achievements[2]) : ''}">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">実況解説実績（任意、最大3つ）</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="text" id="casting1" name="casting1" class="form-input" placeholder="1つ目の実績" value="\${caster.casting_history && caster.casting_history[0] ? escapeHtml(caster.casting_history[0]) : ''}">
                    <input type="text" id="casting2" name="casting2" class="form-input" placeholder="2つ目の実績" value="\${caster.casting_history && caster.casting_history[1] ? escapeHtml(caster.casting_history[1]) : ''}">
                    <input type="text" id="casting3" name="casting3" class="form-input" placeholder="3つ目の実績" value="\${caster.casting_history && caster.casting_history[2] ? escapeHtml(caster.casting_history[2]) : ''}">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">運営への伝達事項（任意）</label>
                <textarea id="notes" name="notes_to_staff" class="form-input" placeholder="運営に伝えておきたいことがあればご記入ください" rows="4" style="resize: vertical;">\${escapeHtml(caster.notes_to_staff || '')}</textarea>
            </div>
            
            <hr style="margin: 20px 0; border: 0; border-top: 2px solid #e0e0e0;">
            
            <h4 style="color: var(--c-primary-dark); margin-bottom: 15px;">運営専用フィールド</h4>
            
            <div class="form-group box-light">
                <label class="form-label">運営メモ（実況解説者本人は閲覧不可）</label>
                <textarea name="staff_notes" class="form-input" placeholder="運営内部での共有事項など..." rows="4" style="resize: vertical;">\${escapeHtml(caster.staff_notes || '')}</textarea>
            </div>
            
            <div class="form-group box-light">
                <label class="form-label">大学杯実況解説履歴</label>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px; background: white;">
                    \${tournaments.map(t => {
                        // 既存の履歴から該当する大会を見つける
                        const historyItem = selectedHistory.find(h => h.tournament_id === t.id);
                        const isChecked = historyItem ? true : false;
                        const role = historyItem ? historyItem.role : 'caster';
                        
                        return \`
                            <div style="padding: 8px; margin-bottom: 5px; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
                                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                                    <input type="checkbox" class="tournament-checkbox" data-tournament-id="\${t.id}" \${isChecked ? 'checked' : ''} style="margin-right: 10px;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600;">\${escapeHtml(t.name || t.title)}</div>
                                        <div style="font-size: 0.85rem; color: #666;">\${t.eventDate ? new Date(t.eventDate).toLocaleDateString('ja-JP') : '日時未定'} - \${getStatusLabel(t.status)}</div>
                                    </div>
                                </label>
                                <div class="role-select" style="margin-left: 30px; \${isChecked ? '' : 'display: none;'}">
                                    <select class="tournament-role form-input" data-tournament-id="\${t.id}" style="width: 100%;">
                                        <option value="caster" \${role === 'caster' ? 'selected' : ''}>実況</option>
                                        <option value="commentator" \${role === 'commentator' ? 'selected' : ''}>解説</option>
                                    </select>
                                </div>
                            </div>
                        \`;
                    }).join('')}
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="submit" class="btn-primary" style="background:#1e3799; color:#fff; padding:10px 40px; border-radius:100px; font-weight:bold;">保存</button>
            </div>
        </form>
        
        <style>
            .weapon-item {
                position: relative;
                cursor: pointer;
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 5px;
                transition: all 0.2s;
                background: white;
            }
            
            .weapon-item:hover {
                border-color: #1e3799;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(30, 55, 153, 0.2);
            }
            
            .weapon-item.selected {
                border-color: #1e3799;
                background: rgba(30, 55, 153, 0.1);
            }
            
            .weapon-item img {
                width: 100%;
                height: auto;
                display: block;
                border-radius: 4px;
            }
            
            .weapon-item .weapon-name {
                font-size: 0.7rem;
                text-align: center;
                margin-top: 4px;
                color: #333;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .weapon-item .selection-badge {
                position: absolute;
                top: 2px;
                right: 2px;
                background: #1e3799;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.7rem;
                font-weight: bold;
            }
            
            .selected-weapon-card {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: white;
                border: 2px solid #1e3799;
                border-radius: 8px;
                font-size: 0.9rem;
            }
            
            .selected-weapon-card img {
                width: 40px;
                height: 40px;
                object-fit: contain;
            }
            
            .selected-weapon-card .remove-btn {
                cursor: pointer;
                color: #e74c3c;
                font-weight: bold;
                margin-left: 8px;
            }
        </style>
    \`;
    
    modal.classList.remove('u-hidden');
    
    // モーダルクローズイベント
    const closeBtn = document.getElementById('closeCasterModal');
    closeBtn.onclick = () => modal.classList.add('u-hidden');
    
    // 武器選択の初期化
    let modalSelectedWeapons = [...selectedWeapons];
    initModalWeaponGrid();
    updateModalSelectedWeaponsPreview();
    updateModalWeaponGridSelection();
    
    // 大会履歴チェックボックスの処理
    document.querySelectorAll('.tournament-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const tournamentId = e.target.dataset.tournamentId;
            const roleSelect = document.querySelector(\`.tournament-role[data-tournament-id="\${tournamentId}"]\`);
            const roleSelectContainer = roleSelect.closest('.role-select');
            
            if (e.target.checked) {
                roleSelectContainer.style.display = 'block';
            } else {
                roleSelectContainer.style.display = 'none';
            }
        });
    });
    
    // アイコンタイプ変更時の処理
    document.getElementById('iconType').addEventListener('change', (e) => {
        const iconUrlGroup = document.getElementById('iconUrlGroup');
        if (e.target.value === 'url') {
            iconUrlGroup.style.display = 'block';
        } else {
            iconUrlGroup.style.display = 'none';
        }
    });
    
    // 武器検索
    document.getElementById('weaponSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.weapon-item').forEach(item => {
            const weaponName = item.querySelector('.weapon-name').textContent.toLowerCase();
            item.style.display = weaponName.includes(searchTerm) ? 'block' : 'none';
        });
    });
    
    // フォーム送信
    const form = document.getElementById('formCaster');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        // バリデーション
        const name = fd.get('name').trim();
        const xAccountId = fd.get('x_account_id').trim();
        
        if (!name) {
            alert('名前を入力してください。');
            return;
        }
        
        if (!xAccountId) {
            alert('XアカウントIDを入力してください。');
            return;
        }
        
        if (modalSelectedWeapons.length === 0) {
            alert('モチブキを最低1つ選択してください。');
            return;
        }
        
        // 大会履歴を取得（拡張版）
        const tournamentHistoryExtended = [];
        document.querySelectorAll('.tournament-checkbox:checked').forEach(checkbox => {
            const tournamentId = parseInt(checkbox.dataset.tournamentId);
            const roleSelect = document.querySelector(\`.tournament-role[data-tournament-id="\${tournamentId}"]\`);
            const role = roleSelect ? roleSelect.value : 'caster';
            
            tournamentHistoryExtended.push({
                tournament_id: tournamentId,
                role: role
            });
        });
        
        // 大会実績と実況解説実績を配列にまとめる
        const achievements = [
            fd.get('achievement1'),
            fd.get('achievement2'),
            fd.get('achievement3')
        ].filter(a => a && a.trim() !== '');
        
        const castingHistory = [
            fd.get('casting1'),
            fd.get('casting2'),
            fd.get('casting3')
        ].filter(c => c && c.trim() !== '');
        
        const updates = {
            name: name,
            icon_type: fd.get('icon_type'),
            icon_url: fd.get('icon_url') || null,
            x_account_id: xAccountId,
            youtube_account_id: fd.get('youtube_account_id') || null,
            xp_area: fd.get('xp_area') ? parseInt(fd.get('xp_area')) : null,
            xp_yagura: fd.get('xp_yagura') ? parseInt(fd.get('xp_yagura')) : null,
            xp_hoko: fd.get('xp_hoko') ? parseInt(fd.get('xp_hoko')) : null,
            xp_asari: fd.get('xp_asari') ? parseInt(fd.get('xp_asari')) : null,
            main_weapons: modalSelectedWeapons,
            tournament_achievements: achievements.length > 0 ? achievements : null,
            casting_history: castingHistory.length > 0 ? castingHistory : null,
            notes_to_staff: fd.get('notes_to_staff') || null,
            staff_notes: fd.get('staff_notes') || null,
            tournament_history_extended: tournamentHistoryExtended.length > 0 ? tournamentHistoryExtended : null,
            updated_at: new Date().toISOString()
        };
        
        try {
            await updateCaster(caster.id, updates);
            alert('実況解説者情報を更新しました');
            modal.classList.add('u-hidden');
            await loadTab('accounts');
        } catch (err) {
            console.error('Failed to update caster:', err);
            alert('更新に失敗しました: ' + err.message);
        }
    };
    
    // === 武器選択関連の関数 ===
    function initModalWeaponGrid() {
        const grid = document.getElementById('weaponGrid');
        
        grid.innerHTML = WEAPONS.map(weapon => \`
            <div class="weapon-item" data-weapon-id="\${weapon.id}" onclick="toggleModalWeaponSelection('\${weapon.id}')">
                <img src="assets/weapons/\${weapon.image}" alt="\${weapon.name}" onerror="this.src='assets/placeholder.png'">
                <div class="weapon-name">\${weapon.name}</div>
            </div>
        \`).join('');
    }
    
    window.toggleModalWeaponSelection = function(weaponId) {
        const index = modalSelectedWeapons.indexOf(weaponId);
        
        if (index > -1) {
            // 既に選択されている場合は削除
            modalSelectedWeapons.splice(index, 1);
        } else {
            // 新規選択
            if (modalSelectedWeapons.length >= 3) {
                alert('モチブキは最大3つまで選択できます。');
                return;
            }
            modalSelectedWeapons.push(weaponId);
        }
        
        updateModalSelectedWeaponsPreview();
        updateModalWeaponGridSelection();
    };
    
    function updateModalSelectedWeaponsPreview() {
        const preview = document.getElementById('selectedWeaponsPreview');
        
        if (modalSelectedWeapons.length === 0) {
            preview.innerHTML = '<p style="color: #999; font-size: 0.9rem;">武器が選択されていません</p>';
            return;
        }
        
        preview.innerHTML = modalSelectedWeapons.map((weaponId, index) => {
            const weapon = WEAPONS.find(w => w.id === weaponId);
            if (!weapon) return '';
            
            return \`
                <div class="selected-weapon-card">
                    <span style="font-weight: bold; color: #1e3799;">\${index + 1}</span>
                    <img src="assets/weapons/\${weapon.image}" alt="\${weapon.name}">
                    <span>\${weapon.name}</span>
                    <span class="remove-btn" onclick="removeModalWeapon('\${weaponId}')">×</span>
                </div>
            \`;
        }).join('');
    }
    
    window.removeModalWeapon = function(weaponId) {
        const index = modalSelectedWeapons.indexOf(weaponId);
        if (index > -1) {
            modalSelectedWeapons.splice(index, 1);
            updateModalSelectedWeaponsPreview();
            updateModalWeaponGridSelection();
        }
    };
    
    function updateModalWeaponGridSelection() {
        const items = document.querySelectorAll('.weapon-item');
        items.forEach(item => {
            const weaponId = item.dataset.weaponId;
            const index = modalSelectedWeapons.indexOf(weaponId);
            
            if (index > -1) {
                item.classList.add('selected');
                // 選択順を表示
                if (!item.querySelector('.selection-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'selection-badge';
                    badge.textContent = index + 1;
                    item.appendChild(badge);
                } else {
                    item.querySelector('.selection-badge').textContent = index + 1;
                }
            } else {
                item.classList.remove('selected');
                const badge = item.querySelector('.selection-badge');
                if (badge) badge.remove();
            }
        });
    }
}
