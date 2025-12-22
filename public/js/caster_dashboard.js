// ==========================================
// 実況解説者ダッシュボード
// ==========================================

import { requireCasterAuth, getCurrentUser, logout } from './auth.js';
import { initSupabaseClient } from './common.js';
import { WEAPONS } from './weapons-data.js';

let supabaseClient = null;
let currentUser = null;
let currentCaster = null;
let selectedWeapons = []; // 選択された武器（最大3つ）

// Supabaseクライアントを取得
async function getSupabaseClient() {
    if (!supabaseClient) {
        supabaseClient = await initSupabaseClient();
    }
    return supabaseClient;
}

// ページ初期化
async function initPage() {
    try {
        console.log('🎙️ Initializing caster dashboard...');
        
        // 認証チェック
        currentUser = await requireCasterAuth();
        if (!currentUser) {
            console.log('❌ Authentication failed');
            return;
        }

        console.log('✅ User authenticated:', currentUser);

        // ユーザー情報を表示（初期状態）
        displayUserInfo();

        // 実況解説者データをロード
        await loadCasterData();

        // ユーザー情報を再表示（castersデータを反映）
        displayUserInfo();

        // 武器グリッドを初期化
        initWeaponGrid();

        // イベントリスナーを設定
        setupEventListeners();

        console.log('✅ Caster dashboard initialized');
    } catch (err) {
        console.error('❌ Failed to initialize dashboard:', err);
        alert('ダッシュボードの初期化に失敗しました: ' + err.message);
    }
}

// ユーザー情報を表示（ヘッダー部分）
function displayUserInfo() {
    // 初期表示はDiscordの情報を使用
    const discordUsername = currentUser.user_metadata?.full_name || 
                           currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0] || 
                           'ユーザー';
    const discordAvatarUrl = currentUser.user_metadata?.avatar_url || 
                            currentUser.user_metadata?.picture;

    // ヘッダーに表示する名前とアイコン
    let displayName = '未設定';
    let displayIconUrl = null;

    // castersデータがある場合は、そちらを優先
    if (currentCaster) {
        displayName = currentCaster.name || '未設定';
        
        // アイコンの優先順位: url > discord > なし
        if (currentCaster.icon_type === 'url' && currentCaster.icon_url) {
            displayIconUrl = currentCaster.icon_url;
        } else if (currentCaster.icon_type === 'discord' || !currentCaster.icon_type) {
            displayIconUrl = currentCaster.discord_avatar_url || discordAvatarUrl;
        }
    } else {
        // castersデータがない場合はDiscordの情報を使用
        displayIconUrl = discordAvatarUrl;
    }

    document.getElementById('userNameDisplay').textContent = displayName;

    const avatarEl = document.getElementById('userAvatar');
    if (displayIconUrl) {
        avatarEl.style.backgroundImage = `url(${displayIconUrl})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
    } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
        avatarEl.style.backgroundImage = '';
    }
}

// 実況解説者データをロード
async function loadCasterData() {
    try {
        const client = await getSupabaseClient();
        
        const { data, error } = await client
            .from('casters')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            console.error('❌ Error loading caster data:', error);
            throw error;
        }

        currentCaster = data;
        console.log('✅ Caster data loaded:', currentCaster);

        // フォームにデータを反映
        populateForm(currentCaster);
    } catch (err) {
        console.error('❌ Failed to load caster data:', err);
    }
}

// フォームにデータを反映
function populateForm(caster) {
    if (!caster) return;

    // 名前
    if (caster.name) {
        document.getElementById('casterName').value = caster.name;
    }

    // アイコン設定
    if (caster.icon_type) {
        const iconTypeRadio = document.querySelector(`input[name="iconType"][value="${caster.icon_type}"]`);
        if (iconTypeRadio) {
            iconTypeRadio.checked = true;
            updateIconTypeUI(caster.icon_type);
        }
    }

    // アイコンURL
    if (caster.icon_url) {
        document.getElementById('iconUrl').value = caster.icon_url;
    }

    // アイコンプレビュー
    updateIconPreview();

    // XアカウントID
    if (caster.x_account_id) {
        document.getElementById('xAccountId').value = caster.x_account_id;
    }

    // YoutubeアカウントID
    if (caster.youtube_account_id) {
        document.getElementById('youtubeAccountId').value = caster.youtube_account_id;
    }

    // 各ルールのXP
    if (caster.xp_area) document.getElementById('xpArea').value = caster.xp_area;
    if (caster.xp_yagura) document.getElementById('xpYagura').value = caster.xp_yagura;
    if (caster.xp_hoko) document.getElementById('xpHoko').value = caster.xp_hoko;
    if (caster.xp_asari) document.getElementById('xpAsari').value = caster.xp_asari;

    // モチブキ
    if (caster.main_weapons && Array.isArray(caster.main_weapons)) {
        selectedWeapons = [...caster.main_weapons];
        updateSelectedWeaponsPreview();
        updateWeaponGridSelection();
    }

    // 大会実績
    if (caster.tournament_achievements) {
        const achievements = caster.tournament_achievements;
        if (achievements[0]) document.getElementById('achievement1').value = achievements[0];
        if (achievements[1]) document.getElementById('achievement2').value = achievements[1];
        if (achievements[2]) document.getElementById('achievement3').value = achievements[2];
    }

    // 実況解説実績
    if (caster.casting_history) {
        const castingHistory = caster.casting_history;
        if (castingHistory[0]) document.getElementById('casting1').value = castingHistory[0];
        if (castingHistory[1]) document.getElementById('casting2').value = castingHistory[1];
        if (castingHistory[2]) document.getElementById('casting3').value = castingHistory[2];
    }

    // 運営への伝達事項
    if (caster.notes_to_staff) {
        document.getElementById('notes').value = caster.notes_to_staff;
    }
}

// 武器グリッドを初期化
function initWeaponGrid() {
    const grid = document.getElementById('weaponGrid');
    
    grid.innerHTML = WEAPONS.map(weapon => `
        <div class="weapon-item" data-weapon-id="${weapon.id}" onclick="toggleWeaponSelection('${weapon.id}')">
            <img src="assets/weapons/${weapon.image}" alt="${weapon.name}" onerror="this.src='assets/placeholder.png'">
            <div class="weapon-name">${weapon.name}</div>
        </div>
    `).join('');
}

// 武器選択をトグル
window.toggleWeaponSelection = function(weaponId) {
    const index = selectedWeapons.indexOf(weaponId);
    
    if (index > -1) {
        // 既に選択されている場合は削除
        selectedWeapons.splice(index, 1);
    } else {
        // 新規選択
        if (selectedWeapons.length >= 3) {
            alert('モチブキは最大3つまで選択できます。');
            return;
        }
        selectedWeapons.push(weaponId);
    }
    
    updateSelectedWeaponsPreview();
    updateWeaponGridSelection();
};

// 選択された武器のプレビューを更新
function updateSelectedWeaponsPreview() {
    const preview = document.getElementById('selectedWeaponsPreview');
    
    if (selectedWeapons.length === 0) {
        preview.innerHTML = '<p style="color: #999; font-size: 0.9rem;">武器が選択されていません</p>';
        return;
    }
    
    preview.innerHTML = selectedWeapons.map((weaponId, index) => {
        const weapon = WEAPONS.find(w => w.id === weaponId);
        if (!weapon) return '';
        
        return `
            <div class="selected-weapon-card">
                <span style="font-weight: bold; color: #1e3799;">${index + 1}</span>
                <img src="assets/weapons/${weapon.image}" alt="${weapon.name}">
                <span>${weapon.name}</span>
                <span class="remove-btn" onclick="removeWeapon('${weaponId}')">×</span>
            </div>
        `;
    }).join('');
}

// 武器グリッドの選択状態を更新
function updateWeaponGridSelection() {
    const items = document.querySelectorAll('.weapon-item');
    items.forEach(item => {
        const weaponId = item.dataset.weaponId;
        const index = selectedWeapons.indexOf(weaponId);
        
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

// 武器を削除
window.removeWeapon = function(weaponId) {
    const index = selectedWeapons.indexOf(weaponId);
    if (index > -1) {
        selectedWeapons.splice(index, 1);
        updateSelectedWeaponsPreview();
        updateWeaponGridSelection();
    }
};

// 武器グリッドの表示/非表示をトグル
window.toggleWeaponGrid = function() {
    const container = document.getElementById('weaponGridContainer');
    const icon = document.getElementById('weaponAccordionIcon');
    
    container.classList.toggle('u-hidden');
    icon.textContent = container.classList.contains('u-hidden') ? '▼' : '▲';
};

// イベントリスナーを設定
function setupEventListeners() {
    // サイドバーのタブリンク
    document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            switchTab(tab);
        });
    });

    // アイコンタイプ変更
    const iconTypeRadios = document.querySelectorAll('input[name="iconType"]');
    iconTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            updateIconTypeUI(e.target.value);
            updateIconPreview();
        });
    });

    // アイコンURL変更
    document.getElementById('iconUrl').addEventListener('input', () => {
        updateIconPreview();
    });

    // 武器検索
    document.getElementById('weaponSearch').addEventListener('input', (e) => {
        filterWeapons(e.target.value);
    });

    // フォーム送信
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });
}

// タブを切り替え
async function switchTab(tabName) {
    // サイドバーのアクティブ状態を更新
    document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
        if (link.dataset.tab === tabName) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // タイトルを更新
    const pageTitle = document.getElementById('pageTitle');
    
    // コンテンツエリアを更新
    const contentArea = document.getElementById('contentArea');
    
    switch (tabName) {
        case 'profile':
            pageTitle.textContent = 'プロフィール設定';
            // プロフィールタブの場合はページ全体をリロード
            window.location.reload();
            break;
            
        case 'history':
            pageTitle.textContent = '参加履歴';
            await renderParticipationHistory(contentArea);
            break;
            
        default:
            break;
    }
}

// 参加履歴を表示
async function renderParticipationHistory(container) {
    if (!currentCaster || !currentCaster.tournament_history_extended) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">🎙️</div>
                <h3 style="color: var(--c-primary-dark); margin-bottom: 10px;">参加大会はまだありません</h3>
                <p style="color: #666;">運営から大会への参加割り当てがあると、ここに表示されます。</p>
            </div>
        `;
        return;
    }

    try {
        // 大会データを取得
        const client = await getSupabaseClient();
        const { data: tournaments, error } = await client
            .from('tournaments')
            .select('*')
            .in('id', currentCaster.tournament_history_extended.map(h => h.tournament_id))
            .order('eventDate', { ascending: false });
        
        if (error) throw error;

        // 参加した大会の数
        const participationCount = tournaments.length;
        
        // 大会をステータスと日付でソート
        const sortedTournaments = tournaments.sort((a, b) => {
            // ステータス優先: ongoing, upcoming, open, closed
            const statusOrder = { 'ongoing': 0, 'upcoming': 1, 'open': 2, 'closed': 3 };
            const statusA = statusOrder[a.status] || 999;
            const statusB = statusOrder[b.status] || 999;
            
            if (statusA !== statusB) {
                return statusA - statusB;
            }
            
            // 同じステータス内での日付ソート
            const dateA = a.event_date ? new Date(a.event_date) : null;
            const dateB = b.event_date ? new Date(b.event_date) : null;
            
            // 開催予定/エントリー受付中/開催中の場合
            if (a.status !== 'closed') {
                // 日時未定(null)を最前に
                if (!dateA && dateB) return -1;
                if (dateA && !dateB) return 1;
                if (!dateA && !dateB) return b.id - a.id; // 両方未定ならID降順
                
                // 両方設定済みなら日時降順（新しい順）
                return dateB - dateA;
            }
            
            // 終了済みの場合も日時降順（新しい順）
            if (!dateA && dateB) return 1;
            if (dateA && !dateB) return -1;
            if (!dateA && !dateB) return b.id - a.id;
            
            return dateB - dateA;
        });

        // 自分の役割を取得するヘルパー
        const getMyRole = (tournamentId) => {
            const historyItem = currentCaster.tournament_history_extended.find(h => h.tournament_id === tournamentId);
            return historyItem ? historyItem.role : 'caster';
        };

        // ステータスラベルを取得
        const getStatusLabel = (status) => {
            const statusMap = {
                'ongoing': '開催中',
                'upcoming': '開催予定',
                'open': 'エントリー受付中',
                'closed': '終了'
            };
            return statusMap[status] || status;
        };

        container.innerHTML = `
            <div style="max-width: 900px; margin: 0 auto;">
                <!-- ヘッダーメッセージ -->
                <div style="background: linear-gradient(135deg, rgba(30, 55, 153, 0.05) 0%, rgba(30, 55, 153, 0.1) 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--c-primary-dark); margin-bottom: 12px;">
                        ${currentCaster.name || 'あなた'}さん、大学杯配信にご協力頂きありがとうございます！
                    </h2>
                    <p style="font-size: 1.1rem; color: #666; margin-bottom: 8px;">
                        これまでに<strong style="color: var(--c-primary); font-size: 1.3rem;"> ${participationCount} </strong>大会に参加されました
                    </p>
                </div>

                <!-- タイムライン -->
                <div style="position: relative; padding-left: 40px;">
                    <!-- タイムラインの縦線 -->
                    <div style="position: absolute; left: 20px; top: 0; bottom: 0; width: 2px; background: #e0e0e0;"></div>
                    
                    ${sortedTournaments.map((tournament, index) => {
                        const role = getMyRole(tournament.id);
                        const roleText = role === 'caster' ? '実況' : '解説';
                        const roleColor = role === 'caster' ? '#1e3799' : '#27ae60';
                        const statusLabel = getStatusLabel(tournament.status);
                        const statusClass = tournament.status;
                        const eventDate = tournament.event_date ? new Date(tournament.event_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '日時未定';
                        
                        // 他のスタッフ情報を取得
                        const otherCasterName = tournament.caster?.name || '-';
                        const commentatorName = tournament.commentator?.name || '-';
                        
                        return `
                            <div style="position: relative; margin-bottom: 30px;">
                                <!-- タイムラインのドット -->
                                <div style="position: absolute; left: -29px; top: 12px; width: 18px; height: 18px; border-radius: 50%; background: ${roleColor}; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
                                
                                <!-- 大会カード -->
                                <div class="admin-card" style="margin-left: 10px; transition: transform 0.2s, box-shadow 0.2s;" onmouseenter="this.style.transform='translateX(5px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';" onmouseleave="this.style.transform=''; this.style.boxShadow='';">
                                    <div class="card-body" style="padding: 20px;">
                                        <!-- ステータスバッジ -->
                                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                                            <span class="status-label ${statusClass}">${statusLabel}</span>
                                            <span style="font-size: 0.9rem; padding: 4px 12px; background: ${roleColor}; color: white; border-radius: 12px; font-weight: 600;">${roleText}</span>
                                        </div>
                                        
                                        <!-- 大会名 -->
                                        <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--c-primary-dark); margin-bottom: 8px;">
                                            ${tournament.name || tournament.title}
                                        </h3>
                                        
                                        <!-- 開催日 -->
                                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 16px; color: #666; font-size: 0.9rem;">
                                            <span>📅</span>
                                            <span>${eventDate}</span>
                                        </div>
                                        
                                        <!-- スタッフ情報 -->
                                        <div style="padding-top: 12px; border-top: 1px solid #e0e0e0;">
                                            <div style="font-weight: 600; font-size: 0.85rem; color: #666; margin-bottom: 8px;">配信スタッフ</div>
                                            <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                                                ${role === 'caster' ? `
                                                <div style="display: flex; align-items: center; gap: 6px;">
                                                    <span style="font-weight: 600; color: #1e3799;">🎙️ 実況:</span>
                                                    <span>${currentCaster.name}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px;">
                                                    <span style="font-weight: 600; color: #27ae60;">💬 解説:</span>
                                                    <span>${commentatorName}</span>
                                                </div>
                                                ` : `
                                                <div style="display: flex; align-items: center; gap: 6px;">
                                                    <span style="font-weight: 600; color: #1e3799;">🎙️ 実況:</span>
                                                    <span>${otherCasterName}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 6px;">
                                                    <span style="font-weight: 600; color: #27ae60;">💬 解説:</span>
                                                    <span>${currentCaster.name}</span>
                                                </div>
                                                `}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Failed to load participation history:', err);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                <h3 style="color: var(--c-primary-dark); margin-bottom: 10px;">データの取得に失敗しました</h3>
                <p style="color: #666;">${err.message}</p>
            </div>
        `;
    }
}

// 武器をフィルタリング
function filterWeapons(searchTerm) {
    const items = document.querySelectorAll('.weapon-item');
    const term = searchTerm.toLowerCase();
    
    items.forEach(item => {
        const weaponName = item.querySelector('.weapon-name').textContent.toLowerCase();
        if (weaponName.includes(term)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// アイコンタイプUIを更新
function updateIconTypeUI(iconType) {
    const urlInputContainer = document.getElementById('urlInputContainer');

    if (iconType === 'url') {
        urlInputContainer.classList.remove('u-hidden');
    } else {
        urlInputContainer.classList.add('u-hidden');
    }
}

// アイコンプレビューを更新
function updateIconPreview() {
    const iconPreview = document.getElementById('iconPreview');
    const iconType = document.querySelector('input[name="iconType"]:checked').value;
    
    iconPreview.innerHTML = '';
    iconPreview.style.backgroundImage = '';

    if (iconType === 'discord') {
        const avatarUrl = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;
        if (avatarUrl) {
            iconPreview.style.backgroundImage = `url(${avatarUrl})`;
        } else {
            iconPreview.innerHTML = '<span class="icon-preview-placeholder">Discord</span>';
        }
    } else if (iconType === 'url') {
        const iconUrl = document.getElementById('iconUrl').value.trim();
        if (iconUrl) {
            iconPreview.style.backgroundImage = `url(${iconUrl})`;
            iconPreview.style.backgroundSize = 'cover';
            iconPreview.style.backgroundPosition = 'center';
        } else {
            iconPreview.innerHTML = '<span class="icon-preview-placeholder">URL</span>';
        }
    } else {
        iconPreview.innerHTML = '<span class="icon-preview-placeholder">その他</span>';
    }
}

// プロフィールを保存
async function saveProfile() {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
        const client = await getSupabaseClient();

        // フォームデータを収集
        const name = document.getElementById('casterName').value.trim();
        const iconType = document.querySelector('input[name="iconType"]:checked').value;
        const iconUrl = document.getElementById('iconUrl').value.trim();
        const xAccountId = document.getElementById('xAccountId').value.trim();
        const youtubeAccountId = document.getElementById('youtubeAccountId').value.trim();

        const xpArea = document.getElementById('xpArea').value || null;
        const xpYagura = document.getElementById('xpYagura').value || null;
        const xpHoko = document.getElementById('xpHoko').value || null;
        const xpAsari = document.getElementById('xpAsari').value || null;

        const achievement1 = document.getElementById('achievement1').value.trim();
        const achievement2 = document.getElementById('achievement2').value.trim();
        const achievement3 = document.getElementById('achievement3').value.trim();
        const tournamentAchievements = [achievement1, achievement2, achievement3].filter(a => a);

        const casting1 = document.getElementById('casting1').value.trim();
        const casting2 = document.getElementById('casting2').value.trim();
        const casting3 = document.getElementById('casting3').value.trim();
        const castingHistory = [casting1, casting2, casting3].filter(c => c);

        const notes = document.getElementById('notes').value.trim();

        // バリデーション
        if (!name) {
            alert('名前を入力してください。');
            saveBtn.disabled = false;
            saveBtn.textContent = '保存する';
            return;
        }

        if (!xAccountId) {
            alert('XアカウントIDを入力してください。');
            saveBtn.disabled = false;
            saveBtn.textContent = '保存する';
            return;
        }

        if (selectedWeapons.length === 0) {
            alert('モチブキを最低1つ選択してください。');
            saveBtn.disabled = false;
            saveBtn.textContent = '保存する';
            return;
        }

        // Discordアバターを取得
        const discordAvatarUrl = currentUser.user_metadata?.avatar_url || 
                                 currentUser.user_metadata?.picture || 
                                 null;

        // 更新データ
        const updateData = {
            name,
            icon_type: iconType,
            icon_url: iconType === 'url' ? iconUrl : null,
            discord_avatar_url: discordAvatarUrl,
            x_account_id: xAccountId,
            youtube_account_id: youtubeAccountId || null,
            xp_area: xpArea ? parseInt(xpArea) : null,
            xp_yagura: xpYagura ? parseInt(xpYagura) : null,
            xp_hoko: xpHoko ? parseInt(xpHoko) : null,
            xp_asari: xpAsari ? parseInt(xpAsari) : null,
            main_weapons: selectedWeapons,
            tournament_achievements: tournamentAchievements.length > 0 ? tournamentAchievements : null,
            casting_history: castingHistory.length > 0 ? castingHistory : null,
            notes_to_staff: notes || null,
            updated_at: new Date().toISOString()
        };

        console.log('💾 Saving caster data:', updateData);

        const { data, error } = await client
            .from('casters')
            .update(updateData)
            .eq('user_id', currentUser.id)
            .select();

        if (error) {
            console.error('❌ Error saving caster data:', error);
            throw error;
        }

        console.log('✅ Caster data saved:', data);
        currentCaster = data[0];

        alert('プロフィールを保存しました！');
    } catch (err) {
        console.error('❌ Failed to save profile:', err);
        alert('保存に失敗しました: ' + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '保存する';
    }
}

// ログアウト処理
window.handleLogout = async function() {
    if (confirm('ログアウトしますか？')) {
        try {
            await logout();
        } catch (err) {
            console.error('Logout error:', err);
        }
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', initPage);
