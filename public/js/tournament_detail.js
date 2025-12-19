import { getTournaments, escapeHtml, formatDate, formatDateTime } from "./common.js";

document.addEventListener('DOMContentLoaded', async () => {
    await initTournamentDetail();
});

async function initTournamentDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        document.getElementById('tournamentTitle').innerHTML = '<div style="text-align:center;">大会が見つかりませんでした</div>';
        return;
    }

    const data = await getTournaments();
    const tournament = data.find(d => d.id == id);

    if (!tournament) {
        document.getElementById('tournamentTitle').innerHTML = '<div style="text-align:center;">大会が見つかりませんでした</div>';
        return;
    }

    // Render sections
    renderTitle(tournament);
    renderResult(tournament);
    renderInfo(tournament);
    renderEntry(tournament);
    renderShareButtons(tournament);
}

// ========== Render Functions (Updated for Glassmorphism Design) ==========

function renderTitle(tournament) {
    const container = document.getElementById('tournamentTitle');
    
    const eventDateStr = formatDateTime(tournament.eventDate);
    
    // Rules images
    let rulesHtml = '';
    if (tournament.rules && Array.isArray(tournament.rules)) {
        const ruleImageMap = {
            'ナワバリバトル': 'assets/weapon/ルール_ナワバリバトル.png',
            'ガチエリア': 'assets/weapon/ルール_ガチエリア.png',
            'ガチヤグラ': 'assets/weapon/ルール_ガチヤグラ.png',
            'ガチホコバトル': 'assets/weapon/ルール_ガチホコ.png',
            'ガチホコ': 'assets/weapon/ルール_ガチホコ.png',
            'ガチアサリ': 'assets/weapon/ルール_ガチアサリ.png'
        };
        
        rulesHtml = '<div class="rule-icons-inline">';
        tournament.rules.forEach(rule => {
            const imgSrc = ruleImageMap[rule] || '';
            if (imgSrc) {
                rulesHtml += `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(rule)}" title="${escapeHtml(rule)}" onerror="this.style.display='none'">`;
            }
        });
        rulesHtml += '</div>';
    }

    // Mini Staff Info
    let staffHtml = '';
    if (tournament.caster || tournament.commentator) {
        staffHtml = '<div class="staff-mini-list">';
        if (tournament.caster && tournament.caster.name) {
            const icon = tournament.caster.icon || 'assets/default-icon.png';
            staffHtml += `
                <div class="staff-mini-item">
                    <img src="${escapeHtml(icon)}" class="staff-mini-icon" onerror="this.src='assets/default-icon.png'">
                    <span>実況: ${escapeHtml(tournament.caster.name)}</span>
                </div>
            `;
        }
        if (tournament.commentator && tournament.commentator.name) {
            const icon = tournament.commentator.icon || 'assets/default-icon.png';
            staffHtml += `
                <div class="staff-mini-item">
                    <img src="${escapeHtml(icon)}" class="staff-mini-icon" onerror="this.src='assets/default-icon.png'">
                    <span>解説: ${escapeHtml(tournament.commentator.name)}</span>
                </div>
            `;
        }
        staffHtml += '</div>';
    }

    container.innerHTML = `
        <div class="detail-glass-card tournament-title-section">
            <h1>${escapeHtml(tournament.name)}</h1>
            <div class="meta-grid">
                <div class="meta-item-detail">
                    <span class="meta-label-detail">開催日時</span>
                    <span class="meta-value-detail">${escapeHtml(eventDateStr)}</span>
                </div>
                <div class="meta-item-detail">
                    <span class="meta-label-detail">使用ルール</span>
                    <div class="meta-value-detail">${rulesHtml}</div>
                </div>
                ${staffHtml ? `
                <div class="meta-item-detail" style="grid-column: 1 / -1;">
                    <span class="meta-label-detail">実況・解説</span>
                    <div class="meta-value-detail">${staffHtml}</div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderResult(tournament) {
    const container = document.getElementById('tournamentResult');
    
    if (tournament.status !== 'closed') {
        container.classList.add('u-hidden');
        return;
    }
    container.classList.remove('u-hidden');

    if (!tournament.result || !tournament.result.teamName) {
        return; 
    }

    const result = tournament.result;
    const winnerImage = result.image || '';
    const winnerPostUrl = result.postUrl || '#';
    const teamName = result.teamName || '';
    
    const affiliation = [];
    if (result.university) affiliation.push(result.university);
    if (result.circle) affiliation.push(result.circle);
    if (result.university2) affiliation.push(result.university2);
    if (result.circle2) affiliation.push(result.circle2);
    
    const affiliationHtml = affiliation.length > 0 ? affiliation.map(a => escapeHtml(a)).join(' / ') : '';

    const members = result.members || [];
    let membersHtml = '';
    if (members.length > 0) {
        const validMembers = members.filter(m => m && m.trim());
        if (validMembers.length > 0) {
            membersHtml = validMembers.map(m => `<span class="member-pill">${escapeHtml(m)}</span>`).join('');
        }
    }

    const archiveUrl = tournament.archiveUrl || '';

    container.innerHTML = `
        <div class="detail-glass-card result-section-wrapper">
            <h2 class="section-title-detail">大会結果</h2>
            <div class="winner-showcase">
                <div class="winner-image-wrapper">
                    ${winnerImage ? `
                        <a href="${escapeHtml(winnerPostUrl)}" target="_blank" rel="noopener">
                            <img src="${escapeHtml(winnerImage)}" alt="優勝チーム">
                        </a>
                    ` : '<div style="background:#eee; padding:100px 20px; text-align:center; color:#999; border-radius:12px;">画像なし</div>'}
                </div>
                <div class="winner-details">
                    <span class="winner-badge">優勝</span>
                    <h3 class="winner-team-name">${escapeHtml(teamName)}</h3>
                    ${affiliationHtml ? `<p class="winner-affiliation">${affiliationHtml}</p>` : ''}
                    ${membersHtml ? `<div class="winner-members-list">${membersHtml}</div>` : ''}
                    ${archiveUrl ? `
                        <a href="${escapeHtml(archiveUrl)}" target="_blank" rel="noopener" class="archive-link">
                            ▶ 配信アーカイブを見る
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderInfo(tournament) {
    const container = document.getElementById('tournamentInfo');

    const entryPeriodText = tournament.entryPeriod ? (
        typeof tournament.entryPeriod === 'string' ? tournament.entryPeriod :
        (tournament.entryPeriod.start && tournament.entryPeriod.end ? `${tournament.entryPeriod.start} ~ ${tournament.entryPeriod.end}` : '未設定')
    ) : '未設定';

    // Stages
    let stagesHtml = '特になし';
    if (tournament.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0) {
        stagesHtml = tournament.stages.map(s => escapeHtml(s)).join('、');
    }

    // XP Limits
    let xpHtml = '<span style="color:#999;">制限なし</span>';
    if (tournament.xpLimits && (tournament.xpLimits.avg || tournament.xpLimits.max)) {
        const maxScale = 4000; 
        const teamAvg = tournament.xpLimits.avg || 0;
        const teamMax = tournament.xpLimits.max || 0;
        
        xpHtml = '<div class="xp-display">';
        if (teamAvg > 0) {
            const avgPercent = Math.min((teamAvg / maxScale) * 100, 100);
            xpHtml += `
                <div class="xp-item">
                    <div class="xp-item-label"><span>チーム平均</span><span>${teamAvg}</span></div>
                    <div class="xp-bar-track">
                        <div class="xp-bar-fill" style="width:${avgPercent}%;"></div>
                    </div>
                </div>
            `;
        }
        if (teamMax > 0) {
            const maxPercent = Math.min((teamMax / maxScale) * 100, 100);
            xpHtml += `
                <div class="xp-item">
                    <div class="xp-item-label"><span>チーム内最大</span><span>${teamMax}</span></div>
                    <div class="xp-bar-track">
                        <div class="xp-bar-fill is-max" style="width:${maxPercent}%;"></div>
                    </div>
                </div>
            `;
        }
        xpHtml += '</div>';
    }

    // Entry Type
    const entryTypeMap = {
        'circle_only': '同一サークル限定',
        'cross_ok': 'クロスサークルOK',
        'invite': 'サークル選抜'
    };
    const entryTypeHtml = entryTypeMap[tournament.entryType] || tournament.entryType || '-';

    // Staff Cards (No nested cards, simple list)
    let staffListHtml = '';
    const createStaffItem = (role, p) => {
        if(!p || !p.name) return '';
        const icon = p.icon || 'assets/default-icon.png';
        const xUrl = p.xId ? (p.xId.startsWith('http') ? p.xId : `https://x.com/${p.xId.replace('@','')}`) : null;
        
        // SNS Icons as SVG
        const xIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>`;
        const ytIcon = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21.582 6.186c-.23-2.336-2.057-4.163-4.419-4.418C15.196.95 12 .95 12 .95s-3.196 0-5.163.818c-2.362.255-4.189 2.082-4.419 4.418C1.6 8.153 1.6 12 1.6 12s0 3.847.818 5.814c.23 2.336 2.057 4.163 4.419 4.418C8.804 23.05 12 23.05 12 23.05s3.196 0 5.163-.818c2.362-.255 4.189-2.082 4.419-4.418.818-1.967.818-5.814.818-5.814s0-3.847-.818-5.814zM9.6 15.6V8.4l5.4 3.6-5.4 3.6z"></path></svg>`;
        
        return `
            <div class="staff-item-detail">
                <img src="${escapeHtml(icon)}" class="staff-icon-detail" onerror="this.src='assets/default-icon.png'">
                <div class="staff-info-detail">
                    <div class="staff-role-label">${role}</div>
                    <div class="staff-name-detail">${escapeHtml(p.name)}</div>
                </div>
                <div class="staff-social-links">
                    ${xUrl ? `<a href="${escapeHtml(xUrl)}" target="_blank" rel="noopener" class="staff-social-link" title="X (Twitter)">${xIcon}</a>` : ''}
                    ${p.ytUrl ? `<a href="${escapeHtml(p.ytUrl)}" target="_blank" rel="noopener" class="staff-social-link" title="YouTube">${ytIcon}</a>` : ''}
                </div>
            </div>
        `;
    };

    if (tournament.caster || tournament.commentator) {
        staffListHtml = '<div class="staff-list-detail">';
        staffListHtml += createStaffItem('実況', tournament.caster);
        staffListHtml += createStaffItem('解説', tournament.commentator);
        staffListHtml += '</div>';
    }

    // Coordinator
    const coordinator = tournament.coordinator ? (tournament.coordinator.name || tournament.coordinator) : '';

    container.innerHTML = `
        <div class="detail-glass-card">
            <h2 class="section-title-detail">大会情報</h2>
            
            <div class="info-grid-detail">
                <div class="info-row">
                    <span class="info-label-row">エントリー受付期間</span>
                    <div class="info-content-row">${escapeHtml(entryPeriodText)}</div>
                </div>
                
                <div class="info-row">
                    <span class="info-label-row">エントリー形式</span>
                    <div class="info-content-row">${escapeHtml(entryTypeHtml)}</div>
                </div>

                <div class="info-row">
                    <span class="info-label-row">XPパワー制限</span>
                    <div class="info-content-row">${xpHtml}</div>
                </div>

                <div class="info-row">
                    <span class="info-label-row">ステージ制限</span>
                    <div class="info-content-row">${stagesHtml}</div>
                </div>
                
                ${staffListHtml ? `
                <div class="info-row">
                    <span class="info-label-row">実況・解説者紹介</span>
                    <div class="info-content-row">${staffListHtml}</div>
                </div>
                ` : ''}
                
                ${coordinator ? `
                <div class="info-row">
                    <span class="info-label-row">運営・配信担当</span>
                    <div class="info-content-row">${escapeHtml(coordinator)}</div>
                </div>
                ` : ''}

                ${tournament.license ? `
                <div class="info-row">
                    <span class="info-label-row">許諾番号</span>
                    <div class="info-content-row">${escapeHtml(tournament.license)}</div>
                </div>
                ` : ''}
            </div>

            <div class="nintendo-disclaimer">
                この大会は、任天堂の協賛・提携を受けたものではありません。<br>
                コミュニティ大会への出場および観戦に関する規約は<a href="https://www.nintendo.co.jp/tournament_guideline/rules.html" target="_blank" rel="noopener">こちら</a>をご確認ください。
            </div>
            
            ${tournament.rulesUrl ? `
            <div class="overview-link-wrapper">
                <a href="${escapeHtml(tournament.rulesUrl)}" target="_blank" rel="noopener" class="overview-link">
                    概要を開く ↗
                </a>
            </div>
            ` : ''}
        </div>
    `;
}

function renderEntry(tournament) {
    const container = document.getElementById('tournamentEntry');
    const status = tournament.status || '';

    let statusMsg = '';
    let isDisabled = true;

    if (status === 'open') {
        isDisabled = false;
        statusMsg = '現在エントリーを受付中です。';
    } else if (status === 'upcoming') {
        statusMsg = 'エントリー受付開始までお待ちください。';
    } else {
        statusMsg = 'この大会のエントリー受付は終了しました。';
    }

    const entryUrl = tournament.supportUrl || '#';
    const rulesUrl = tournament.rulesUrl || '#';

    container.innerHTML = `
        <div class="detail-glass-card entry-section-wrapper">
            <h2 class="section-title-detail">エントリー</h2>
            
            <p class="entry-status-message">${escapeHtml(statusMsg)}</p>
            
            <div class="entry-form-wrapper">
                <div class="entry-agreement-box">
                    <input type="checkbox" id="entryAgreement" ${isDisabled ? 'disabled' : ''}>
                    <label for="entryAgreement">
                        <a href="${escapeHtml(rulesUrl)}" target="_blank" rel="noopener" style="color: var(--c-primary); text-decoration: underline;">概要の内容</a>を確認しました
                    </label>
                </div>
                
                <button id="entryButton" class="entry-btn-large" disabled>
                    エントリーページへ進む
                </button>
            </div>
        </div>
    `;

    if (!isDisabled) {
        const checkbox = document.getElementById('entryAgreement');
        const button = document.getElementById('entryButton');
        
        checkbox.addEventListener('change', (e) => {
            button.disabled = !e.target.checked;
        });

        button.addEventListener('click', () => {
            if (entryUrl && entryUrl !== '#') {
                window.open(entryUrl, '_blank');
            } else {
                alert('エントリーURLが設定されていません');
            }
        });
    }
}

function renderShareButtons(tournament) {
    const shareContainer = document.getElementById('shareButtons');
    const shareUrl = window.location.href;
    const textToShare = `${tournament.name}`;
    const hashtags = '大学杯';

    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textToShare)}&hashtags=${encodeURIComponent(hashtags)}`;

    shareContainer.innerHTML = `
        <div class="share-section">
            <div class="share-buttons-wrapper">
                <a href="${twitterUrl}" target="_blank" class="btn-share tw">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                    Post
                </a>
                <button id="btnCopyUrl" class="btn-share copy">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path></svg>
                    Copy URL
                </button>
            </div>
        </div>
    `;

    document.getElementById('btnCopyUrl').addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('URLをコピーしました');
        });
    });
}
