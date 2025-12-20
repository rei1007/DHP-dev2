// ==========================================
// 実況解説者ダッシュボード
// ==========================================

import { requireCasterAuth, getCurrentUser, logout } from './auth.js';
import { initSupabaseClient } from './common.js';

let supabaseClient = null;
let currentUser = null;
let currentCaster = null;

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

        // ユーザー情報を表示
        displayUserInfo();

        // 実況解説者データをロード
        await loadCasterData();

        // イベントリスナーを設定
        setupEventListeners();

        console.log('✅ Caster dashboard initialized');
    } catch (err) {
        console.error('❌ Failed to initialize dashboard:', err);
        alert('ダッシュボードの初期化に失敗しました: ' + err.message);
    }
}

// ユーザー情報を表示
function displayUserInfo() {
    const username = currentUser.user_metadata?.full_name || 
                     currentUser.user_metadata?.name || 
                     currentUser.email?.split('@')[0] || 
                     'ユーザー';
    const avatarUrl = currentUser.user_metadata?.avatar_url || 
                     currentUser.user_metadata?.picture;

    document.getElementById('userNameDisplay').textContent = username;

    const avatarEl = document.getElementById('userAvatar');
    if (avatarUrl) {
        avatarEl.style.backgroundImage = `url(${avatarUrl})`;
    } else {
        avatarEl.textContent = username.charAt(0).toUpperCase();
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
    if (caster.main_weapons) {
        const weapons = caster.main_weapons;
        if (weapons[0]) document.getElementById('weapon1').value = weapons[0];
        if (weapons[1]) document.getElementById('weapon2').value = weapons[1];
        if (weapons[2]) document.getElementById('weapon3').value = weapons[2];
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

// イベントリスナーを設定
function setupEventListeners() {
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

    // フォーム送信
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });
}

// アイコンタイプUIを更新
function updateIconTypeUI(iconType) {
    const urlInputContainer = document.getElementById('urlInputContainer');
    const otherIconMessage = document.getElementById('otherIconMessage');

    if (iconType === 'url') {
        urlInputContainer.classList.remove('u-hidden');
        otherIconMessage.classList.add('u-hidden');
    } else if (iconType === 'other') {
        urlInputContainer.classList.add('u-hidden');
        otherIconMessage.classList.remove('u-hidden');
    } else {
        urlInputContainer.classList.add('u-hidden');
        otherIconMessage.classList.add('u-hidden');
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

        const weapon1 = document.getElementById('weapon1').value.trim();
        const weapon2 = document.getElementById('weapon2').value.trim();
        const weapon3 = document.getElementById('weapon3').value.trim();
        const mainWeapons = [weapon1, weapon2, weapon3].filter(w => w);

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

        if (mainWeapons.length === 0) {
            alert('モチブキを最低1つ入力してください。');
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
            main_weapons: mainWeapons,
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
