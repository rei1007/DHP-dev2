

// Standalone Admin Logic
import { getTournaments, saveTournament, deleteTournament, getNews, saveNews, deleteNews, escapeHtml, getUsers, updateUserRole, deleteUser, getCasters, updateCaster, deleteCaster } from './common.js';
import { requireAuth, logout, getCurrentUser } from './auth.js';
import { WEAPONS } from './weapons-data.js';

// Stage List (Splatoon 3)
const STAGES = [
    'ユノハナ大渓谷', 'ゴンズイ地区', 'ナメロウ金属', 'マテガイ放水路', 'ヤガラ市場',
    'ナンプラー遺跡', 'クサヤ温泉', 'ヒラメが丘団地', 'マサバ海峡大橋', 'キンメダイ美術館',
    'マヒマヒリゾート＆スパ', '海女美術大学', 'チョウザメ造船', 'ザトウマーケット', 'スメーシーワールド',
    'コンブトラック', 'タラポートショッピングパーク', 'マンタマリア号', 'ネギトロ炭鉱', 'タカアシ経済特区',
    'オヒョウ海運', 'バイガイ亭', 'カジキ空港', 'リュウグウターミナル'
];

// Global Logout Function
window.handleLogout = async () => {
    if(confirm('ログアウトしますか？')) {
        await logout();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // 認証チェック
    const user = await requireAuth();
    if (!user) {
        // requireAuthが既にリダイレクトを処理
        return;
    }
    
    // ユーザー情報を表示
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.querySelector('.user-avatar');
    
    if (user) {
        // Discordのユーザー名を表示
        const username = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '運営者';
        if (userNameDisplay) {
            userNameDisplay.textContent = username;
        }
        
        // Discordのアイコン画像を表示
        if (userAvatar) {
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
            
            console.log('👤 User avatar URL:', avatarUrl);
            console.log('📋 Full user metadata:', user.user_metadata);
            
            if (avatarUrl) {
                // アイコンURLがある場合は画像を表示
                userAvatar.style.backgroundImage = `url(${avatarUrl})`;
                userAvatar.style.backgroundSize = 'cover';
                userAvatar.style.backgroundPosition = 'center';
            } else {
                // アイコンがない場合はイニシャルを表示
                const initial = username.charAt(0).toUpperCase();
                userAvatar.textContent = initial;
                userAvatar.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                userAvatar.style.color = '#fff';
                userAvatar.style.display = 'flex';
                userAvatar.style.alignItems = 'center';
                userAvatar.style.justifyContent = 'center';
                userAvatar.style.fontSize = '1.2rem';
                userAvatar.style.fontWeight = 'bold';
            }
        }
    }
    
    await initRouter();
    
    // Global Modal Closers
    const cTour = document.getElementById('closeTourModal');
    if(cTour) cTour.onclick = () => document.getElementById('tourModal').classList.add('u-hidden');
    
    const cNews = document.getElementById('closeNewsModal');
    if(cNews) cNews.onclick = () => document.getElementById('newsModal').classList.add('u-hidden');
    
    const cCaster = document.getElementById('closeCasterModal');
    if(cCaster) cCaster.onclick = () => document.getElementById('casterModal').classList.add('u-hidden');
});

// --- Routing ---
async function initRouter() {
    const links = document.querySelectorAll('.sidebar-link[data-tab]');
    links.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const tab = link.dataset.tab;
            await loadTab(tab);
        });
    });

    // Default Load: Tournaments since Dashboard is removed
    await loadTab('tournaments'); 
}

async function loadTab(tab) {
    const content = document.getElementById('contentArea');
    const title = document.getElementById('pageTitle');
    
    if (tab === 'tournaments') {
        title.textContent = '大会管理';
        await renderTournaments(content);
    } else if (tab === 'news') {
        title.textContent = 'お知らせ管理';
        await renderNews(content);
    } else if (tab === 'accounts') {
        title.textContent = 'アカウント管理';
        await renderAccounts(content);
    }
}

// --- Helper Functions ---
function getStatusLabel(status) {
    const map = {
        'upcoming': '開催予定',
        'open': 'エントリー中',
        'ongoing': '開催中',
        'closed': '終了'
    };
    return map[status] || status;
}

function getNewsBadgeHtml(type, badge) {
    let cls = 'info';
    let label = 'お知らせ';
    
    // badge または category で判定（typeは使用しない）
    const badgeOrCategory = badge || 'info';
    
    if (badgeOrCategory === 'tour') {
        cls = 'tour';
        label = '大会情報';
    } else if (badgeOrCategory === 'recruit') {
        cls = 'recruit';
        label = '運営募集';
    } else if (badgeOrCategory === 'important') {
        cls = 'important';
        label = '重要';
    } else if (badgeOrCategory === 'penalty') {
        cls = 'important';
        label = 'ペナルティ';
    }

    return `<span class="badge-news ${cls}">${label}</span>`;
}

// --- Tournaments Logic ---
async function renderTournaments(container) {
    const tours = await getTournaments();
    
    // ソートロジック:
    // 1. ステータス優先順: ongoing(開催中) > upcoming(開催予定) > open(エントリー受付中) > closed(終了)
    // 2. 各ステータス内で開催日時順（未設定を最前、その後は日時昇順）
    // 3. 終了済みは日時降順（新しい順）
    const statusOrder = { 'ongoing': 0, 'upcoming': 1, 'open': 2, 'closed': 3 };
    
    tours.sort((a, b) => {
        // ステータス優先
        const statusA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 99;
        const statusB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 99;
        
        if (statusA !== statusB) {
            return statusA - statusB;
        }
        
        // 同じステータス内では日時でソート
        const dateA = a.eventDate ? new Date(a.eventDate) : null;
        const dateB = b.eventDate ? new Date(b.eventDate) : null;
        
        // 終了済み以外（ongoing/upcoming/open）の場合
        if (a.status !== 'closed') {
            // 日時未設定を最前に
            if (!dateA && dateB) return -1;
            if (dateA && !dateB) return 1;
            if (!dateA && !dateB) return b.id - a.id; // 両方未設定ならID降順
            
            // 両方設定済みなら日時昇順（早い順）
            return dateA - dateB;
        }
        
        // 終了済み（closed）の場合は日時降順（新しい順）
        if (!dateA && dateB) return 1;
        if (dateA && !dateB) return -1;
        if (!dateA && !dateB) return b.id - a.id;
        
        return dateB - dateA;
    });
    
    container.innerHTML = `
        <div style="margin-bottom:20px; display:flex; justify-content:flex-end;">
            <button class="btn-primary" style="font-size:0.9rem; padding:10px 24px; border-radius:100px; cursor:pointer; background:#1e3799; color:#fff; border:none; box-shadow:0 4px 10px rgba(30,55,153,0.3);" id="btnNewTour">＋ 新規大会作成</button>
        </div>
        <div class="admin-item-grid">
            ${tours.map(t => {
                const eventDateTime = t.eventDate || '-';
                const rulesText = (t.rules && t.rules.length > 0) ? t.rules.join(', ') : 'なし';
                const xpAvg = t.xpLimits?.avg || 'なし';
                const xpMax = t.xpLimits?.max || 'なし';
                const entryTypeText = t.entryType === 'circle_only' ? 'サークル限定' : (t.entryType === 'invite' ? 'サークル選抜' : 'クロスOK');
                
                // エントリー期間
                const entryPeriodText = t.entryPeriod?.start && t.entryPeriod?.end 
                    ? `${t.entryPeriod.start} ~ ${t.entryPeriod.end}` 
                    : '未設定';
                
                // スタッフ情報
                const casterName = t.caster?.name || '-';
                const casterIcon = t.caster?.icon || '';
                const commentatorName = t.commentator?.name || '-';
                const commentatorIcon = t.commentator?.icon || '';
                const coordinatorName = t.coordinator?.name || '-';
                
                // URL
                const rulesUrl = t.rulesUrl || '';
                
                return `
                <div class="admin-item-card" style="cursor:pointer; transition: all 0.3s;">
                    <div onclick="toggleTournamentDetails('tour-${t.id}')">
                        <div class="admin-item-header">
                            <div class="admin-item-title">${escapeHtml(t.name || t.title)}</div>
                            <span class="status-label ${t.status}">${getStatusLabel(t.status)}</span>
                        </div>
                        <div class="admin-item-meta">
                            <span>📅 ${escapeHtml(eventDateTime)}</span>
                        </div>
                        <div class="admin-item-meta">
                            <span>🎮 ${escapeHtml(rulesText)}</span>
                        </div>
                        <div class="admin-item-meta">
                            <span>📊 平均XP: ${escapeHtml(xpAvg)} / 最高XP: ${escapeHtml(xpMax)}</span>
                        </div>
                        <div class="admin-item-meta">
                            <span>👥 ${escapeHtml(entryTypeText)}</span>
                        </div>
                    </div>
                    
                    <!-- 折りたたみ詳細 -->
                    <div id="tour-${t.id}" class="tour-details u-hidden" style="margin-top:15px; padding-top:15px; border-top:1px solid #e0e0e0;">
                        <div style="margin-bottom:10px;">
                            <strong style="color:#0c2461;">エントリー期間:</strong> ${escapeHtml(entryPeriodText)}
                        </div>
                        
                        <div style="margin-bottom:10px;">
                            <strong style="color:#0c2461;">スタッフ:</strong>
                            <div style="margin-top:5px; display:flex; flex-direction:column; gap:8px;">
                                <div style="display:flex; align-items:center; gap:8px;">
                                    ${casterIcon ? `<img src="${escapeHtml(casterIcon)}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" alt="実況">` : '🎙️'}
                                    <span>実況: ${escapeHtml(casterName)}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    ${commentatorIcon ? `<img src="${escapeHtml(commentatorIcon)}" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" alt="解説">` : '💬'}
                                    <span>解説: ${escapeHtml(commentatorName)}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <span>📡</span>
                                    <span>配信担当: ${escapeHtml(coordinatorName)}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${rulesUrl ? `
                        <div style="margin-bottom:10px;">
                            <strong style="color:#0c2461;">概要URL:</strong>
                            <div style="display:flex; align-items:center; gap:8px; margin-top:5px;">
                                <input type="text" value="${escapeHtml(rulesUrl)}" readonly style="flex:1; padding:6px 10px; border:1px solid #ddd; border-radius:4px; font-size:0.85rem; background:#f8f8f8;">
                                <button onclick="copyToClipboard('${escapeHtml(rulesUrl)}'); event.stopPropagation();" style="padding:6px 12px; background:#1e3799; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:0.85rem;">コピー</button>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="admin-item-actions" style="margin-top:15px;">
                        <button onclick="window.editTour('${t.id}'); event.stopPropagation();" class="btn-action edit">編集</button>
                        <button onclick="window.deleteTour('${t.id}'); event.stopPropagation();" class="btn-action delete">削除</button>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
    
    setTimeout(() => {
        const btn = document.getElementById('btnNewTour');
        if(btn) btn.onclick = () => openTourModal();
    }, 0);
}

// トグル関数とコピー関数をグローバルに定義
window.toggleTournamentDetails = function(id) {
    const details = document.getElementById(id);
    if (details) {
        details.classList.toggle('u-hidden');
    }
};

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('URLをクリップボードにコピーしました');
    }).catch(err => {
        console.error('コピー失敗:', err);
    });
};


// --- News Logic ---
async function renderNews(container) {
    const newsList = await getNews();
    
    // Convert to Card Layout
    container.innerHTML = `
        <div style="margin-bottom:20px; display:flex; justify-content:flex-end;">
            <button class="btn-primary" style="font-size:0.9rem; padding:10px 24px; border-radius:100px; cursor:pointer; background:#1e3799; color:#fff; border:none; box-shadow:0 4px 10px rgba(30,55,153,0.3);" id="btnNewNews">＋ 新規お知らせ作成</button>
        </div>
        <div class="admin-item-grid">
            ${newsList.map(n => `
                <div class="admin-item-card">
                    <div class="admin-item-header">
                        <div style="flex:1;">
                            <div style="margin-bottom:5px;">${getNewsBadgeHtml(n.type, n.badge || n.category)}</div>
                            <div class="admin-item-title">${n.title}</div>
                        </div>
                    </div>
                    <div class="admin-item-meta">
                        <span style="font-family:var(--f-eng);">📅 ${n.publishedAt || n.date}</span>
                    </div>
                    <div class="admin-item-actions">
                        <button onclick="window.editNews('${n.id}')" class="btn-action edit">編集</button>
                        <button onclick="window.deleteNews('${n.id}')" class="btn-action delete">削除</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    setTimeout(() => {
        const btn = document.getElementById('btnNewNews');
        if(btn) btn.onclick = () => openNewsModal();
    }, 0);
}

// --- Modals & Actions ---

// Tournaments
window.editTour = async (id) => {
    const tours = await getTournaments();
    const t = tours.find(x => x.id == id);
    if(t) openTourModal(t);
};
window.deleteTour = async (id) => {
    if(!confirm('削除しますか？')) return;
    await deleteTournament(id);
    await loadTab('tournaments');
};

function openTourModal(data = null) {
    const modal = document.getElementById('tourModal');
    const container = document.getElementById('tourFormContainer');
    
    const idVal = data ? data.id : Date.now();
    
    const v = (key, subkey=null) => {
        if (!data) return '';
        if (subkey) return data[key] && data[key][subkey] ? data[key][subkey] : '';
        return data[key] || '';
    };

    const dateVal = v('eventDate'); 
    const entryStart = v('entryPeriod', 'start');
    const entryEnd = v('entryPeriod', 'end');

    const isRule = (r) => data && data.rules && data.rules.includes(r) ? 'checked' : '';
    const isStage = (s) => data && data.stages && (typeof data.stages === 'string' ? data.stages.includes(s) : data.stages.includes(s)) ? 'checked' : '';
    
    const rules = ['ナワバリバトル', 'ガチエリア', 'ガチヤグラ', 'ガチホコバトル', 'ガチアサリ'];

    const stageHtml = STAGES.map(s => `
        <label class="stage-item">
            <input type="checkbox" name="stages" value="${s}" ${isStage(s)}>
            <span class="stage-name">${s}</span>
        </label>
    `).join('');

    container.innerHTML = `
        <form id="formTour">
            <input type="hidden" name="id" value="${idVal}">
            
            <div style="display:flex; gap:30px; flex-wrap:wrap;">
            
                <div style="flex:1; min-width:300px;">
                    <h4 class="form-section-title">基本情報</h4>
                    
                    <div class="form-group">
                        <label class="form-label">大会名</label>
                        <input type="text" name="name" class="form-input" value="${v('name')}" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group u-flex-1">
                            <label class="form-label">ステータス</label>
                            <select name="status" class="form-input">
                                <option value="upcoming" ${v('status')=='upcoming'?'selected':''}>開催予定</option>
                                <option value="open" ${v('status')=='open'?'selected':''}>エントリー受付中</option>
                                <option value="ongoing" ${v('status')=='ongoing'?'selected':''}>開催中</option>
                                <option value="closed" ${v('status')=='closed'?'selected':''}>終了・結果公開</option>
                            </select>
                        </div>
                        <div class="form-group u-flex-1">
                            <label class="form-label">開催日時</label>
                            <input type="text" name="eventDate" class="form-input fp-datetime" value="${dateVal}" placeholder="選択してください">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">エントリー期間</label>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <input type="text" name="entry_start" class="form-input fp-datetime" value="${entryStart}" placeholder="開始">
                            <span>~</span>
                            <input type="text" name="entry_end" class="form-input fp-datetime" value="${entryEnd}" placeholder="終了">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">大会概要URL</label>
                        <input type="url" name="rulesUrl" class="form-input" value="${v('rulesUrl')}">
                    </div>
                    <div class="form-group">
                         <label class="form-label">許諾番号</label>
                         <input type="text" name="license" class="form-input" value="${v('license')}" placeholder="NJ...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">タイカイサポートURL</label>
                        <input type="url" name="supportUrl" class="form-input" value="${v('supportUrl')}">
                    </div>

                    <h4 class="form-section-title">ルール＆ステージ</h4>
                    <div class="form-group">
                        <label class="form-label">採用ルール</label>
                        <div class="checkbox-group">
                            ${rules.map(r => `
                                <label><input type="checkbox" name="rules" value="${r}" ${isRule(r)}>${r}</label>
                            `).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <div style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; padding:12px; background:rgba(30,55,153,0.05); border-radius:8px; margin-bottom:10px;" onclick="this.nextElementSibling.classList.toggle('u-hidden'); this.querySelector('.accordion-icon').textContent = this.nextElementSibling.classList.contains('u-hidden') ? '▼' : '▲';">
                            <label class="form-label" style="margin:0; cursor:pointer;">制限ステージ</label>
                            <span class="accordion-icon" style="font-size:0.8rem; color:var(--c-primary);">▼</span>
                        </div>
                        <div class="stage-grid-container u-hidden" style="margin-top:10px;">
                            ${stageHtml}
                        </div>
                    </div>
                </div>

                <div style="flex:1; min-width:300px;">
                    <h4 class="form-section-title">参加制限・キャスト</h4>
                    
                    <div class="form-group">
                         <label class="form-label">エントリータイプ</label>
                         <select name="entryType" class="form-input">
                             <option value="circle_only" ${v('entryType')=='circle_only'?'selected':''}>同一サークル限定</option>
                             <option value="cross_ok" ${v('entryType')=='cross_ok'?'selected':''}>クロスサークルOK</option>
                             <option value="invite" ${v('entryType')=='invite'?'selected':''}>サークル選抜</option>
                         </select>
                    </div>


                    <div class="form-row">
                        <div class="form-group u-flex-1">
                            <label class="form-label">平均XP上限</label>
                            <input type="number" 
                                   name="xpAvg" 
                                   id="xpAvgInput"
                                   class="form-input" 
                                   value="${v('xpLimits', 'avg') || ''}"
                                   placeholder="例: 2000"
                                   ${!v('xpLimits', 'avg')?'disabled':''}>
                            <label style="display:flex; align-items:center; gap:5px; margin-top:8px; font-size:0.9rem; cursor:pointer;">
                                <input type="checkbox" 
                                       name="xpAvgNone" 
                                       id="xpAvgNone"
                                       ${!v('xpLimits', 'avg')?'checked':''}
                                       onchange="document.getElementById('xpAvgInput').disabled = this.checked; if(this.checked) document.getElementById('xpAvgInput').value = '';">
                                <span>XP制限なし</span>
                            </label>
                        </div>
                        <div class="form-group u-flex-1">
                            <label class="form-label">最高XP上限</label>
                            <input type="number" 
                                   name="xpMax" 
                                   id="xpMaxInput"
                                   class="form-input" 
                                   value="${v('xpLimits', 'max') || ''}"
                                   placeholder="例: 2400"
                                   ${!v('xpLimits', 'max')?'disabled':''}>
                            <label style="display:flex; align-items:center; gap:5px; margin-top:8px; font-size:0.9rem; cursor:pointer;">
                                <input type="checkbox" 
                                       name="xpMaxNone" 
                                       id="xpMaxNone"
                                       ${!v('xpLimits', 'max')?'checked':''}
                                       onchange="document.getElementById('xpMaxInput').disabled = this.checked; if(this.checked) document.getElementById('xpMaxInput').value = '';">
                                <span>XP制限なし</span>
                            </label>
                        </div>
                    </div>


                    <div class="form-group box-light">
                        <label class="form-label">実況</label>
                        <div style="position:relative;">
                            <input type="text" 
                                   name="casterName" 
                                   id="casterNameInput"
                                   placeholder="名前" 
                                   class="form-input u-mb-5" 
                                   value="${v('caster', 'name')}"
                                   autocomplete="off">
                            <div id="casterSuggestions" class="autocomplete-suggestions" style="display:none;"></div>
                        </div>
                        <input type="url" id="casterIconInput" name="casterIcon" placeholder="アイコンURL" class="form-input u-mb-5" value="${v('caster', 'icon')}">
                        <div class="form-row">
                            <input type="text" id="casterXInput" name="casterX" placeholder="@Twitter" class="form-input u-flex-1" value="${v('caster', 'xId')}">
                            <input type="text" id="casterYtInput" name="casterYt" placeholder="YouTube URL" class="form-input u-flex-1" value="${v('caster', 'ytUrl')}">
                        </div>
                    </div>

                    <div class="form-group box-light">
                        <label class="form-label">解説</label>
                        <div style="position:relative;">
                            <input type="text" 
                                   name="comName" 
                                   id="comNameInput"
                                   placeholder="名前" 
                                   class="form-input u-mb-5" 
                                   value="${v('commentator', 'name')}"
                                   autocomplete="off">
                            <div id="comSuggestions" class="autocomplete-suggestions" style="display:none;"></div>
                        </div>
                        <input type="url" id="comIconInput" name="comIcon" placeholder="アイコンURL" class="form-input u-mb-5" value="${v('commentator', 'icon')}">
                        <div class="form-row">
                            <input type="text" id="comXInput" name="comX" placeholder="@Twitter" class="form-input u-flex-1" value="${v('commentator', 'xId')}">
                            <input type="text" id="comYtInput" name="comYt" placeholder="YouTube URL" class="form-input u-flex-1" value="${v('commentator', 'ytUrl')}">
                        </div>
                    </div>

                    <div class="form-group box-light">
                        <label class="form-label">配信担当</label>
                        <input type="text" name="coordinatorName" placeholder="名前" class="form-input" value="${v('coordinator', 'name')}">
                    </div>

                    <h4 class="form-section-title">結果アーカイブ</h4>
                    <div class="form-group">
                        <label class="form-label">優勝チーム名</label>
                        <input type="text" name="winTeam" class="form-input" value="${v('result', 'teamName')}">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group u-flex-1">
                            <label class="form-label">優勝チームの大学名</label>
                            <input type="text" name="winUniversity" class="form-input" value="${v('result', 'university')}" placeholder="例: 東京大学">
                        </div>
                        <div class="form-group u-flex-1">
                            <label class="form-label">優勝チームのサークル名</label>
                            <input type="text" name="winCircle" class="form-input" value="${v('result', 'circle')}" placeholder="例: イカサークル">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group u-flex-1">
                            <label class="form-label">大学名2</label>
                            <input type="text" name="winUniversity2" class="form-input" value="${v('result', 'university2')}" placeholder="例: 京都大学">
                        </div>
                        <div class="form-group u-flex-1">
                            <label class="form-label">サークル名2</label>
                            <input type="text" name="winCircle2" class="form-input" value="${v('result', 'circle2')}" placeholder="例: イカサークル2">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">優勝メンバー</label>
                        <div class="form-row">
                            <input type="text" name="winMem1" placeholder="Member 1" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[0]||'') : ''}">
                            <input type="text" name="winMem2" placeholder="Member 2" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[1]||'') : ''}">
                        </div>
                        <div class="form-row u-mt-5">
                            <input type="text" name="winMem3" placeholder="Member 3" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[2]||'') : ''}">
                            <input type="text" name="winMem4" placeholder="Member 4" class="form-input u-flex-1" value="${v('result', 'members') ? (v('result', 'members')[3]||'') : ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">優勝画像URL</label>
                        <input type="url" name="winImage" class="form-input" value="${v('result', 'image')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">アーカイブURL</label>
                        <input type="url" name="archiveUrl" class="form-input" value="${v('archiveUrl')}">
                    </div>

                    <div class="form-group">
                        <label class="form-label">優勝ポストURL</label>
                        <input type="url" name="winUrl" class="form-input" value="${v('result', 'postUrl')}">
                    </div>
                </div>
            
            </div>

            <div class="modal-actions">
                <button type="submit" class="btn-primary" style="background:#1e3799; color:#fff; padding:10px 40px; border-radius:100px; font-weight:bold;">保存</button>
            </div>
        </form>
    `;
    
    if(window.flatpickr) {
        flatpickr(".fp-datetime", {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            locale: "ja"
        });
    }

    modal.classList.remove('u-hidden');
    
    // ===== オートコンプリート機能の実装 =====
    setTimeout(async () => {
        // 過去の大会データから実況・解説者の情報を取得（統合）
        const tours = await getTournaments();
        const staffMembers = []; // 実況・解説を統合した配列
        
        // 古い順に処理して、最新のデータで上書きする
        // getTournaments()は新しい順（ID降順）なので、逆順にする
        const toursReversed = [...tours].reverse();
        
        // 実況と解説の両方から情報を収集
        toursReversed.forEach(t => {
            // 実況者の情報を追加/更新
            if (t.caster && t.caster.name) {
                // 既に同じ情報のエントリのインデックスを探す
                const duplicateIndex = staffMembers.findIndex(s => 
                    s.name === t.caster.name && 
                    s.icon === t.caster.icon && 
                    s.xId === t.caster.xId && 
                    s.ytUrl === t.caster.ytUrl
                );
                
                if (duplicateIndex !== -1) {
                    // 既存のエントリを削除
                    staffMembers.splice(duplicateIndex, 1);
                }
                // 最新のデータを追加
                staffMembers.push({ ...t.caster, _index: staffMembers.length });
            }
            
            // 解説者の情報を追加/更新
            if (t.commentator && t.commentator.name) {
                // 既に同じ情報のエントリのインデックスを探す
                const duplicateIndex = staffMembers.findIndex(s => 
                    s.name === t.commentator.name && 
                    s.icon === t.commentator.icon && 
                    s.xId === t.commentator.xId && 
                    s.ytUrl === t.commentator.ytUrl
                );
                
                if (duplicateIndex !== -1) {
                    // 既存のエントリを削除
                    staffMembers.splice(duplicateIndex, 1);
                }
                // 最新のデータを追加
                staffMembers.push({ ...t.commentator, _index: staffMembers.length });
            }
        });
        
        // インデックスを再割り当て
        staffMembers.forEach((member, idx) => {
            member._index = idx;
        });
        
        // オートコンプリート設定関数（配列版）
        const setupAutocomplete = (inputId, suggestionsId, dataArray, iconInputId, xInputId, ytInputId) => {
            const input = document.getElementById(inputId);
            const suggestionsDiv = document.getElementById(suggestionsId);
            const iconInput = document.getElementById(iconInputId);
            const xInput = document.getElementById(xInputId);
            const ytInput = document.getElementById(ytInputId);
            
            if (!input || !suggestionsDiv) return;
            
            input.addEventListener('input', (e) => {
                const value = e.target.value.trim().toLowerCase();
                
                if (value.length < 1) {
                    suggestionsDiv.style.display = 'none';
                    return;
                }
                
                // 名前でフィルタリング（部分一致）
                const matches = dataArray
                    .filter(person => person.name.toLowerCase().includes(value))
                    .slice(0, 10); // 最大10件
                
                if (matches.length === 0) {
                    suggestionsDiv.style.display = 'none';
                    return;
                }
                
                // サジェスト表示（同名でも区別できるように追加情報を表示）
                suggestionsDiv.innerHTML = matches.map(person => {
                    let detailText = '';
                    if (person.xId) {
                        detailText = ` (${person.xId})`;
                    } else if (person.ytUrl) {
                        detailText = ' (YouTube)';
                    }
                    
                    return `
                        <div class="autocomplete-item" data-index="${person._index}">
                            ${person.icon ? `<img src="${escapeHtml(person.icon)}" style="width:24px; height:24px; border-radius:50%; object-fit:cover; margin-right:8px;">` : ''}
                            <span>${escapeHtml(person.name)}${escapeHtml(detailText)}</span>
                        </div>
                    `;
                }).join('');
                
                suggestionsDiv.style.display = 'block';
                
                // クリックイベント設定
                suggestionsDiv.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const selectedIndex = parseInt(item.dataset.index);
                        const selectedInfo = dataArray.find(p => p._index === selectedIndex);
                        
                        if (selectedInfo) {
                            input.value = selectedInfo.name;
                            if (iconInput) iconInput.value = selectedInfo.icon || '';
                            if (xInput) xInput.value = selectedInfo.xId || '';
                            if (ytInput) ytInput.value = selectedInfo.ytUrl || '';
                        }
                        
                        suggestionsDiv.style.display = 'none';
                    });
                });
            });
            
            // 外側クリックで非表示
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                    suggestionsDiv.style.display = 'none';
                }
            });
        };
        
        // 実況・解説者のオートコンプリートを設定（共通のデータソースを使用）
        setupAutocomplete('casterNameInput', 'casterSuggestions', staffMembers, 'casterIconInput', 'casterXInput', 'casterYtInput');
        setupAutocomplete('comNameInput', 'comSuggestions', staffMembers, 'comIconInput', 'comXInput', 'comYtInput');
    }, 100);
    
    const form = document.getElementById('formTour');
    form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        const rulesSelected = [];
        form.querySelectorAll('input[name="rules"]:checked').forEach(el => rulesSelected.push(el.value));
        
        const stagesSelected = [];
        form.querySelectorAll('input[name="stages"]:checked').forEach(el => stagesSelected.push(el.value));

        // XP Limits処理 - チェックボックスで制御
        const xpAvgValue = fd.get('xpAvgNone') ? null : (fd.get('xpAvg') || null);
        const xpMaxValue = fd.get('xpMaxNone') ? null : (fd.get('xpMax') || null);

        const newTour = {
            id: Number(fd.get('id')),
            name: fd.get('name'),
            status: fd.get('status'),
            eventDate: fd.get('eventDate'),
            entryPeriod: {
                start: fd.get('entry_start'),
                end: fd.get('entry_end')
            },
            rulesUrl: fd.get('rulesUrl'),
            supportUrl: fd.get('supportUrl'),
            rules: rulesSelected,
            stages: stagesSelected,
            entryType: fd.get('entryType'),
            xpLimits: {
                avg: xpAvgValue,
                max: xpMaxValue
            },
            caster: {
                name: fd.get('casterName'),
                icon: fd.get('casterIcon'),
                xId: fd.get('casterX'),
                ytUrl: fd.get('casterYt')
            },
            commentator: {
                name: fd.get('comName'),
                icon: fd.get('comIcon'),
                xId: fd.get('comX'),
                ytUrl: fd.get('comYt')
            },
            coordinator: {
                name: fd.get('coordinatorName')
            },
            license: fd.get('license'),
            result: {
                teamName: fd.get('winTeam'),
                university: fd.get('winUniversity'),
                circle: fd.get('winCircle'),
                university2: fd.get('winUniversity2'),
                circle2: fd.get('winCircle2'),
                members: [fd.get('winMem1'), fd.get('winMem2'), fd.get('winMem3'), fd.get('winMem4')],
                image: fd.get('winImage'),
                postUrl: fd.get('winUrl')
            },
            archiveUrl: fd.get('archiveUrl')
        };
        
        // Save to Supabase
        saveTournament(newTour).then(() => {
            modal.classList.add('u-hidden');
            loadTab('tournaments');
        }).catch(err => {
            console.error('Save error:', err);
            alert('保存に失敗しました');
        });
    };
}

// News
window.editNews = async (id) => {
    const list = await getNews();
    const n = list.find(x => x.id == id);
    if(n) openNewsModal(n);
};
window.deleteNews = async (id) => {
    if(!confirm('削除しますか？')) return;
    await deleteNews(id);
    await loadTab('news');
};

function openNewsModal(data = null) {
    const modal = document.getElementById('newsModal');
    const container = document.getElementById('newsFormContainer');
    
    const idVal = data ? data.id : Date.now();
    const dateVal = data ? (data.publishedAt || data.date || '') : new Date().toISOString().slice(0,10);
    const titleVal = data ? data.title : '';
    const bodyVal = data ? (data.body || data.content || '') : '';
    
    let currentType = 'info';
    if (data) {
        const badgeOrCategory = data.badge || data.category || 'info';
        console.log('[openNewsModal] data:', data);
        console.log('[openNewsModal] badgeOrCategory:', badgeOrCategory);
        
        if (data.type === 'tournament' || badgeOrCategory === 'tour') {
            currentType = 'tour';
        } else {
            currentType = badgeOrCategory;  // 'info', 'important', 'recruit'
        }
        
        console.log('[openNewsModal] currentType:', currentType);
    }

    container.innerHTML = `
        <form id="formNews">
            <input type="hidden" name="id" value="${idVal}">
            
            <div class="form-group">
                <label class="form-label">日付</label>
                <input type="text" name="publishedAt" class="form-input fp-date" value="${dateVal}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">タイプ</label>
                <select name="ui_type" class="form-input">
                    <option value="info" ${currentType=='info'?'selected':''}>お知らせ (Info)</option>
                    <option value="important" ${currentType=='important'?'selected':''}>重要 (Important)</option>
                    <option value="recruit" ${currentType=='recruit'?'selected':''}>運営募集 (Recruit)</option>
                    <option value="tour" ${currentType=='tour'?'selected':''}>大会情報 (Tour)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">タイトル</label>
                <input type="text" name="title" class="form-input" value="${titleVal}" required>
            </div>

            <div class="form-group">
                <label class="form-label">内容（HTML可）</label>
                <textarea name="body" class="form-textarea" rows="8" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">${bodyVal}</textarea>
            </div>

            <div class="modal-actions">
                 <button type="submit" class="btn-primary" style="background:#1e3799; color:#fff; padding:10px 40px; border-radius:100px; font-weight:bold;">保存</button>
            </div>
        </form>
    `;

    if(window.flatpickr) {
        flatpickr(".fp-date", {
            dateFormat: "Y-m-d",
            locale: "ja"
        });
    }
    
    modal.classList.remove('u-hidden');
    
    const form = document.getElementById('formNews');
    form.onsubmit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const uiType = fd.get('ui_type');
        
        console.log('[formNews] uiType from form:', uiType);
        console.log('[formNews] All form data:', Object.fromEntries(fd.entries()));
        
        let type = 'normal';
        let badge = uiType || 'info';  // uiTypeがnullの場合のフォールバック
        
        if (uiType === 'tour') {
            type = 'tournament';
            badge = 'tour';
        } else if (uiType) {
            type = 'normal';
            badge = uiType;  // 'info', 'important', 'recruit'
        }

        console.log('[formNews] Determined type:', type, 'badge:', badge);

        const newItem = {
            id: Number(fd.get('id')),
            publishedAt: fd.get('publishedAt'),
            title: fd.get('title'),
            body: fd.get('body'),
            type: type,
            badge: badge
        };
        
        console.log('[formNews] Saving news item:', newItem);
        
        // Save to Supabase
        saveNews(newItem).then(() => {
            modal.classList.add('u-hidden');
            loadTab('news');
        }).catch(err => {
            console.error('Save error:', err);
            alert('保存に失敗しました: ' + err.message);
        });
    };
}

// --- Accounts Management Logic ---
async function renderAccounts(container) {
    const admins = await getUsers(); // 運営アカウント
    const casters = await getCasters(); // 実況解説者アカウント
    
    container.innerHTML = `
        <div class="admin-card" style="margin-bottom: 20px;">
            <div class="card-header" style="padding: 15px 20px;">
                <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--c-primary-dark); margin: 0;">アカウント管理</h3>
            </div>
            <div class="card-body" style="padding: 0;">
                <div class="account-tabs" style="display: flex; border-bottom: 2px solid #e0e0e0;">
                    <button class="account-tab active" data-tab="admins" onclick="window.switchAccountTab('admins')" 
                        style="flex: 1; padding: 15px; border: none; background: transparent; font-weight: 600; color: var(--c-primary); border-bottom: 3px solid var(--c-primary); cursor: pointer; transition: all 0.2s;">
                        運営アカウント
                    </button>
                    <button class="account-tab" data-tab="casters" onclick="window.switchAccountTab('casters')" 
                        style="flex: 1; padding: 15px; border: none; background: transparent; font-weight: 600; color: #999; border-bottom: 3px solid transparent; cursor: pointer; transition: all 0.2s;">
                        実況解説者アカウント
                    </button>
                </div>
                <div class="account-tab-content" style="padding: 20px;">
                    <div id="adminsTab" class="tab-pane active" style="display: block;">
                        <div class="admin-item-grid">
                            ${admins.map(user => {
                                // Discord avatar URLを取得
                                const avatarUrl = user.discord_avatar_url || null;
                                
                                return `
                                <div class="admin-item-card" style="position: relative;">
                                    <div class="admin-item-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                                        <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                            ${avatarUrl ? 
                                                `<img src="${escapeHtml(avatarUrl)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : 
                                                `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; flex-shrink: 0;">${escapeHtml((user.username || user.email).charAt(0).toUpperCase())}</div>`
                                            }
                                            <div class="admin-item-title" style="font-size: 1rem; font-weight: 600;">${escapeHtml(user.username || user.email)}</div>
                                        </div>
                                        <span class="badge ${user.role === 'admin' ? 'info' : 'warning'}" style="position: absolute; top: 10px; right: 10px;">${user.role === 'admin' ? '運営' : '保留中'}</span>
                                    </div>
                                    <div class="admin-item-meta" style="margin-bottom: 8px;">
                                        <span style="font-size: 0.85rem; color: #666;">🕒 登録日: ${new Date(user.created_at).toLocaleDateString('ja-JP')}</span>
                                    </div>
                                    <div class="admin-item-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                                        <button onclick="window.editAdminUser('${user.id}')" class="btn-action edit" style="flex: 1;">編集</button>
                                        <button onclick="window.deleteAdminUser('${user.id}')" class="btn-action delete">削除</button>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div id="castersTab" class="tab-pane" style="display: none;">
                        <div class="admin-item-grid">
                            ${casters.map(caster => {
                                const iconUrl = caster.icon_type === 'discord' ? caster.discord_avatar_url : 
                                               caster.icon_type === 'url' ? caster.icon_url : null;
                                
                                return `
                                    <div class="admin-item-card caster-card" data-caster-id="${caster.id}" style="cursor: pointer; position: relative;" onclick="window.toggleCasterCard('${caster.id}')">
                                        <div class="caster-card-summary">
                                            <div class="admin-item-header" style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
                                                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                                                    ${iconUrl ? 
                                                        `<img src="${escapeHtml(iconUrl)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">` : 
                                                        `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem; flex-shrink: 0;">🎙️</div>`
                                                    }
                                                    <div class="admin-item-title" style="font-size: 1rem; font-weight: 600;">${escapeHtml(caster.name)}</div>
                                                </div>
                                            </div>
                                            <div class="admin-item-meta" style="margin-bottom: 8px;">
                                                <span style="font-size: 0.85rem; color: #666;">🐦 @${escapeHtml(caster.x_account_id || '-')}</span>
                                            </div>
                                            <div class="admin-item-meta" style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                                <span style="font-size: 0.85rem; color: #666; margin-right: 8px;">🎮 モチブキ:</span>
                                                ${caster.main_weapons && caster.main_weapons.length > 0 ? 
                                                    caster.main_weapons.slice(0, 3).map(weaponId => {
                                                        return `<img src="assets/weapons/${getWeaponFileName(weaponId)}" alt="${weaponId}" style="width: 32px; height: 32px; object-fit: contain;" onerror="this.style.display='none'">`;
                                                    }).join('') : 
                                                    '<span style="font-size: 0.85rem; color: #999;">なし</span>'
                                                }
                                            </div>
                                        </div>
                                        <div class="caster-card-details" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
                                            <div style="margin-bottom: 12px;">
                                                <div style="font-weight: 600; font-size: 0.9rem; color: var(--c-primary-dark); margin-bottom: 8px;">各ルールの最高XP</div>
                                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                                                        <img src="assets/rules/ルール_ガチエリア.png" style="width: 24px; height: 24px; object-fit: contain;">
                                                        <span style="font-size: 0.85rem;">${caster.xp_area || '-'}</span>
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                                                        <img src="assets/rules/ルール_ガチヤグラ.png" style="width: 24px; height: 24px; object-fit: contain;">
                                                        <span style="font-size: 0.85rem;">${caster.xp_yagura || '-'}</span>
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                                                        <img src="assets/rules/ルール_ガチホコ.png" style="width: 24px; height: 24px; object-fit: contain;">
                                                        <span style="font-size: 0.85rem;">${caster.xp_hoko || '-'}</span>
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                                                        <img src="assets/rules/ルール_ガチアサリ.png" style="width: 24px; height: 24px; object-fit: contain;">
                                                        <span style="font-size: 0.85rem;">${caster.xp_asari || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            ${caster.youtube_account_id ? `
                                            <div style="margin-bottom: 12px;">
                                                <div style="font-weight: 600; font-size: 0.9rem; color: var(--c-primary-dark); margin-bottom: 8px;">YouTubeチャンネル</div>
                                                <a href="https://www.youtube.com/@${escapeHtml(caster.youtube_account_id)}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; color: #c4302b; text-decoration: none; font-size: 0.85rem;">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                                    </svg>
                                                    @${escapeHtml(caster.youtube_account_id)}
                                                </a>
                                            </div>
                                            ` : ''}
                                        </div>
                                        <div class="admin-item-actions" style="display: flex; gap: 8px; margin-top: 12px;" onclick="event.stopPropagation()">
                                            <button onclick="window.editCaster('${caster.id}')" class="btn-action edit" style="flex: 1;">編集</button>
                                            <button onclick="window.deleteCasterAccount('${caster.id}')" class="btn-action delete">削除</button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to get weapon file name from weapon ID
function getWeaponFileName(weaponId) {
    // weapons-data.jsのWEAPONS配列からファイル名を取得
    // ここではシンプルに weaponId + '.png' を返す
    return weaponId + '.png';
}

// タブの切り替え
window.switchAccountTab = function(tabName) {
    // タブボタンのスタイルを更新
    document.querySelectorAll('.account-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
            tab.style.color = 'var(--c-primary)';
            tab.style.borderBottomColor = 'var(--c-primary)';
        } else {
            tab.classList.remove('active');
            tab.style.color = '#999';
            tab.style.borderBottomColor = 'transparent';
        }
    });
    
    // タブコンテンツの表示/非表示を切り替え
    document.getElementById('adminsTab').style.display = tabName === 'admins' ? 'block' : 'none';
    document.getElementById('castersTab').style.display = tabName === 'casters' ? 'block' : 'none';
};

// 実況解説者カードの展開/折りたたみ
window.toggleCasterCard = function(casterId) {
    const card = document.querySelector(`.caster-card[data-caster-id="${casterId}"]`);
    if (!card) return;
    
    const details = card.querySelector('.caster-card-details');
    if (!details) return;
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
    } else {
        details.style.display = 'none';
    }
};

// 運営アカウント編集モーダルを開く
window.editAdminUser = async function(userId) {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('adminUserModal');
    const container = document.getElementById('adminUserFormContainer');
    
    const avatarUrl = user.discord_avatar_url || null;
    
    container.innerHTML = `
        <form id="formAdminUser">
            <div class="form-group">
                <label class="form-label">ユーザー名</label>
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                    ${avatarUrl ? 
                        `<img src="${escapeHtml(avatarUrl)}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">` : 
                        `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">${escapeHtml((user.username || user.email).charAt(0).toUpperCase())}</div>`
                    }
                    <div>
                        <div style="font-weight: 600;">${escapeHtml(user.username || user.email)}</div>
                        <div style="font-size: 0.85rem; color: #666;">${escapeHtml(user.email)}</div>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">ステータス</label>
                <select name="role" class="form-input" style="width: 100%;">
                    <option value="pending" ${user.role === 'pending' ? 'selected' : ''}>保留中</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>運営</option>
                </select>
                <div style="font-size: 0.85rem; color: #666; margin-top: 8px;">
                    保留中: ログイン可能だが、管理機能にはアクセスできません<br>
                    運営: すべての管理機能にアクセスできます
                </div>
            </div>
            
            <div class="modal-actions">
                <button type="submit" class="btn-primary" style="background:#1e3799; color:#fff; padding:10px 40px; border-radius:100px; font-weight:bold;">保存</button>
            </div>
        </form>
    `;
    
    modal.classList.remove('u-hidden');
    
    // モーダルクローズイベント
    const closeBtn = document.getElementById('closeAdminUserModal');
    closeBtn.onclick = () => modal.classList.add('u-hidden');
    
    // フォーム送信
    const form = document.getElementById('formAdminUser');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newRole = fd.get('role');
        
        if (!confirm(`このユーザーのステータスを「${newRole === 'admin' ? '運営' : '保留中'}」に変更しますか？`)) {
            return;
        }
        
        try {
            await updateUserRole(userId, newRole);
            alert('ステータスを更新しました');
            modal.classList.add('u-hidden');
            await loadTab('accounts');
        } catch (err) {
            console.error('Failed to change role:', err);
            alert('ステータス変更に失敗しました: ' + err.message);
        }
    };
};

// 運営アカウントのロール変更
window.changeUserRole = async (userId, newRole) => {
    if (!confirm(`このユーザーのロールを「${newRole}」に変更しますか？`)) {
        await loadTab('accounts'); // リロードして選択をリセット
        return;
    }
    
    try {
        await updateUserRole(userId, newRole);
        alert('ロールを更新しました');
        await loadTab('accounts');
    } catch (err) {
        console.error('Failed to change role:', err);
        alert('ロール変更に失敗しました: ' + err.message);
        await loadTab('accounts');
    }
};

// 運営アカウント削除
window.deleteAdminUser = async (userId) => {
    if (!confirm('このアカウントを削除しますか？')) return;
    
    try {
        await deleteUser(userId);
        alert('アカウントを削除しました');
        await loadTab('accounts');
    } catch (err) {
        console.error('Failed to delete user:', err);
        alert('アカウント削除に失敗しました: ' + err.message);
    }
};

// 実況解説者編集
window.editCaster = async (casterId) => {
    const casters = await getCasters();
    const caster = casters.find(c => c.id === casterId);
    if (!caster) return;
    
    await openCasterModal(caster);
};

// 実況解説者削除
window.deleteCasterAccount = async (casterId) => {
    if (!confirm('この実況解説者アカウントを削除しますか？')) return;
    
    try {
        await deleteCaster(casterId);
        alert('実況解説者アカウントを削除しました');
        await loadTab('accounts');
    } catch (err) {
        console.error('Failed to delete caster:', err);
        alert('アカウント削除に失敗しました: ' + err.message);
    }
};

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
                        `<img src="${escapeHtml(iconUrl)}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;">` : 
                        `<div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.5rem;">🎙️</div>`
                    }
                    <div>
                        <div style="font-weight: 600; font-size: 1.1rem;">${escapeHtml(caster.name)}</div>
                        <div style="font-size: 0.85rem; color: #666;">実況解説者</div>
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label required">名前</label>
                <input type="text" id="casterName" name="name" class="form-input" value="${escapeHtml(caster.name)}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">アイコン設定タイプ</label>
                <select id="iconType" name="icon_type" class="form-input">
                    <option value="discord" ${caster.icon_type === 'discord' || !caster.icon_type ? 'selected' : ''}>Discordアイコンを使用</option>
                    <option value="url" ${caster.icon_type === 'url' ? 'selected' : ''}>URLを指定</option>
                    <option value="other" ${caster.icon_type === 'other' ? 'selected' : ''}>その他（運営対応）</option>
                </select>
            </div>
            
            <div class="form-group" id="iconUrlGroup" style="display: ${caster.icon_type === 'url' ? 'block' : 'none'};">
                <label class="form-label">アイコンURL</label>
                <input type="url" id="iconUrl" name="icon_url" class="form-input" value="${escapeHtml(caster.icon_url || '')}" placeholder="https://example.com/icon.png">
            </div>
            
            <div class="form-group">
                <label class="form-label required">XアカウントID</label>
                <div style="display: flex; align-items: center;">
                    <span style="padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-right: none; border-radius: 4px 0 0 4px;">@</span>
                    <input type="text" id="xAccountId" name="x_account_id" class="form-input" value="${escapeHtml(caster.x_account_id || '')}" placeholder="username" required style="border-radius: 0 4px 4px 0;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">YoutubeアカウントID（任意）</label>
                <div style="display: flex; align-items: center;">
                    <span style="padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-right: none; border-radius: 4px 0 0 4px;">@</span>
                    <input type="text" id="youtubeAccountId" name="youtube_account_id" class="form-input" value="${escapeHtml(caster.youtube_account_id || '')}" placeholder="channelname" style="border-radius: 0 4px 4px 0;">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">各ガチルールの最高XP（任意）</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">エリア</label>
                        <input type="number" id="xpArea" name="xp_area" class="form-input" placeholder="0" min="0" max="9999" value="${caster.xp_area || ''}">
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">ヤグラ</label>
                        <input type="number" id="xpYagura" name="xp_yagura" class="form-input" placeholder="0" min="0" max="9999" value="${caster.xp_yagura || ''}">
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">ホコ</label>
                        <input type="number" id="xpHoko" name="xp_hoko" class="form-input" placeholder="0" min="0" max="9999" value="${caster.xp_hoko || ''}">
                    </div>
                    <div>
                        <label style="font-size: 0.85rem; margin-bottom: 4px; display: block;">アサリ</label>
                        <input type="number" id="xpAsari" name="xp_asari" class="form-input" placeholder="0" min="0" max="9999" value="${caster.xp_asari || ''}">
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
                    <input type="text" id="achievement1" name="achievement1" class="form-input" placeholder="1つ目の実績" value="${caster.tournament_achievements && caster.tournament_achievements[0] ? escapeHtml(caster.tournament_achievements[0]) : ''}">
                    <input type="text" id="achievement2" name="achievement2" class="form-input" placeholder="2つ目の実績" value="${caster.tournament_achievements && caster.tournament_achievements[1] ? escapeHtml(caster.tournament_achievements[1]) : ''}">
                    <input type="text" id="achievement3" name="achievement3" class="form-input" placeholder="3つ目の実績" value="${caster.tournament_achievements && caster.tournament_achievements[2] ? escapeHtml(caster.tournament_achievements[2]) : ''}">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">実況解説実績（任意、最大3つ）</label>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="text" id="casting1" name="casting1" class="form-input" placeholder="1つ目の実績" value="${caster.casting_history && caster.casting_history[0] ? escapeHtml(caster.casting_history[0]) : ''}">
                    <input type="text" id="casting2" name="casting2" class="form-input" placeholder="2つ目の実績" value="${caster.casting_history && caster.casting_history[1] ? escapeHtml(caster.casting_history[1]) : ''}">
                    <input type="text" id="casting3" name="casting3" class="form-input" placeholder="3つ目の実績" value="${caster.casting_history && caster.casting_history[2] ? escapeHtml(caster.casting_history[2]) : ''}">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">運営への伝達事項（任意）</label>
                <textarea id="notes" name="notes_to_staff" class="form-input" placeholder="運営に伝えておきたいことがあればご記入ください" rows="4" style="resize: vertical;">${escapeHtml(caster.notes_to_staff || '')}</textarea>
            </div>
            
            <hr style="margin: 20px 0; border: 0; border-top: 2px solid #e0e0e0;">
            
            <h4 style="color: var(--c-primary-dark); margin-bottom: 15px;">運営専用フィールド</h4>
            
            <div class="form-group box-light">
                <label class="form-label">運営メモ（実況解説者本人は閲覧不可）</label>
                <textarea name="staff_notes" class="form-input" placeholder="運営内部での共有事項など..." rows="4" style="resize: vertical;">${escapeHtml(caster.staff_notes || '')}</textarea>
            </div>
            
            <div class="form-group box-light">
                <label class="form-label">大学杯実況解説履歴</label>
                <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px; background: white;">
                    ${tournaments.map(t => {
                        // 既存の履歴から該当する大会を見つける
                        const historyItem = selectedHistory.find(h => h.tournament_id === t.id);
                        const isChecked = historyItem ? true : false;
                        const role = historyItem ? historyItem.role : 'caster';
                        
                        return `
                            <div style="padding: 8px; margin-bottom: 5px; border: 1px solid #e0e0e0; border-radius: 4px; background: white;">
                                <label style="display: flex; align-items: center; cursor: pointer; margin-bottom: 8px;">
                                    <input type="checkbox" class="tournament-checkbox" data-tournament-id="${t.id}" ${isChecked ? 'checked' : ''} style="margin-right: 10px;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 600;">${escapeHtml(t.name || t.title)}</div>
                                        <div style="font-size: 0.85rem; color: #666;">${t.eventDate ? new Date(t.eventDate).toLocaleDateString('ja-JP') : '日時未定'} - ${getStatusLabel(t.status)}</div>
                                    </div>
                                </label>
                                <div class="role-select" style="margin-left: 30px; ${isChecked ? '' : 'display: none;'}">
                                    <select class="tournament-role form-input" data-tournament-id="${t.id}" style="width: 100%;">
                                        <option value="caster" ${role === 'caster' ? 'selected' : ''}>実況</option>
                                        <option value="commentator" ${role === 'commentator' ? 'selected' : ''}>解説</option>
                                    </select>
                                </div>
                            </div>
                        `;
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
    `;
    
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
            const roleSelect = document.querySelector(`.tournament-role[data-tournament-id="${tournamentId}"]`);
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
            const roleSelect = document.querySelector(`.tournament-role[data-tournament-id="${tournamentId}"]`);
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
        
        grid.innerHTML = WEAPONS.map(weapon => `
            <div class="weapon-item" data-weapon-id="${weapon.id}" onclick="toggleModalWeaponSelection('${weapon.id}')">
                <img src="assets/weapons/${weapon.image}" alt="${weapon.name}" onerror="this.src='assets/placeholder.png'">
                <div class="weapon-name">${weapon.name}</div>
            </div>
        `).join('');
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
            
            return `
                <div class="selected-weapon-card">
                    <span style="font-weight: bold; color: #1e3799;">${index + 1}</span>
                    <img src="assets/weapons/${weapon.image}" alt="${weapon.name}">
                    <span>${weapon.name}</span>
                    <span class="remove-btn" onclick="removeModalWeapon('${weaponId}')">×</span>
                </div>
            `;
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
