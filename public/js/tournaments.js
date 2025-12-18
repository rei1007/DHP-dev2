import { getTournaments, escapeHtml } from './common.js';

console.log('tournaments.js loaded');

// Current filter
let currentFilter = 'all';
let allTournaments = [];

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded - tournaments.js');
    try {
        await loadTournaments();
        setupFilters();  // Call after data is loaded
    } catch (error) {
        console.error('Initialization error:', error);
        const container = document.getElementById('tournamentsGrid');
        if (container) {
            container.innerHTML = `<p style="text-align:center; color:red; padding:60px 20px;">エラーが発生しました: ${error.message}</p>`;
        }
    }
});

// Setup year filter buttons
function setupFilters() {
    console.log('setupFilters called, tournaments count:', allTournaments.length);
    
    const container = document.getElementById('yearFilterContainer');
    if (!container) {
        console.error('yearFilterContainer not found');
        return;
    }
    
    if (allTournaments.length === 0) {
        console.warn('No tournaments data available');
        container.innerHTML = '<button class="filter-btn active" data-year="all">すべて</button>';
        return;
    }
    
    // Extract unique years from tournaments
    const years = new Set();
    allTournaments.forEach(t => {
        if (t.eventDate) {
            try {
                const date = new Date(t.eventDate);
                if (!isNaN(date)) {
                    years.add(date.getFullYear());
                }
            } catch (e) {
                console.error('Date parsing error:', e);
            }
        }
    });
    
    console.log('Extracted years:', Array.from(years));
    
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    
    // Generate filter buttons
    let html = '<button class="filter-btn active" data-year="all">すべて</button>';
    sortedYears.forEach(year => {
        html += `<button class="filter-btn" data-year="${year}">${year}年</button>`;
    });
    
    container.innerHTML = html;
    console.log('Filter buttons generated');
    
    // Add event listeners
    const filterButtons = container.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update filter and reload
            currentFilter = btn.dataset.year;
            console.log('Filter changed to:', currentFilter);
            renderFilteredTournaments();
        });
    });
}

// Load tournaments (initial load only)
async function loadTournaments() {
    console.log('loadTournaments called');
    const container = document.getElementById('tournamentsGrid');
    if (!container) {
        console.error('tournamentsGrid container not found');
        return;
    }

    try {
        console.log('Fetching tournaments...');
        allTournaments = await getTournaments();
        console.log('Tournaments fetched:', allTournaments.length);
        
        // Sort by date (newest first)
        allTournaments.sort((a, b) => {
            const dateA = new Date(a.eventDate || '1970-01-01');
            const dateB = new Date(b.eventDate || '1970-01-01');
            return dateB - dateA;
        });
        
        // Initial render
        renderFilteredTournaments();
        
    } catch (e) {
        console.error('Tournament load error:', e);
        container.innerHTML = '<p style="text-align:center; color:red; padding:60px 20px;">大会情報の読み込みに失敗しました: ' + e.message + '</p>';
    }
}

// Render filtered tournaments
function renderFilteredTournaments() {
    console.log('renderFilteredTournaments called, filter:', currentFilter);
    const container = document.getElementById('tournamentsGrid');
    if (!container) return;
    
    // Filter data by year
    let filteredData = allTournaments;
    if (currentFilter !== 'all') {
        const filterYear = parseInt(currentFilter);
        filteredData = allTournaments.filter(t => {
            if (!t.eventDate) return false;
            try {
                const date = new Date(t.eventDate);
                return date.getFullYear() === filterYear;
            } catch (e) {
                return false;
            }
        });
    }

    console.log('Filtered tournaments:', filteredData.length);

    let html = '';
    filteredData.forEach(t => {
        html += generateTournamentCard(t);
    });

    if (html === '') {
        container.innerHTML = '<p style="text-align:center; color:#666; padding:60px 20px;">該当する大会がありません</p>';
    } else {
        container.innerHTML = html;
    }
    
    console.log('Tournaments rendered');
}

// Generate tournament card HTML
function generateTournamentCard(t) {
    const name = t.name || '名称未設定';
    const status = t.status || 'upcoming';
    const eventDate = t.eventDate || '未定';
    const rules = t.rules || [];
    const entryType = t.entryType || 'cross_ok';
    const caster = t.caster || {};
    const commentator = t.commentator || {};
    const result = t.result || {};

    let badgeClass = 'upcoming';
    let badgeLabel = '開催予定';
    let btnLabel = '大会詳細';
    let btnClass = 'btn-outline';
    
    if (status === 'open') {
        badgeClass = 'open';
        badgeLabel = 'エントリー受付中';
        btnLabel = '大会情報';
        btnClass = 'btn-primary';
    } else if (status === 'ongoing') {
        badgeClass = 'ongoing';
        badgeLabel = '開催中';
        btnLabel = '大会詳細';
        btnClass = 'btn-primary';
    } else if (status === 'closed') {
        badgeClass = 'closed';
        badgeLabel = '大会終了';
        btnLabel = '大会結果';
        btnClass = 'btn-outline';
    }

    // Entry Type Text
    let entryTypeText = 'クロスサークルOK';
    if (entryType === 'circle_only') entryTypeText = '同一サークル限定';
    else if (entryType === 'invite') entryTypeText = 'サークル選抜';

    // Date Formatting
    let dateMonth = '';
    let dateDay = '';
    let dateTime = '';
    try {
        const d = new Date(eventDate);
        if (!isNaN(d)) {
            dateMonth = `${d.getMonth() + 1}月`;
            dateDay = `${d.getDate()}日`;
            dateTime = `${('0' + d.getHours()).slice(-2)}:${('0' + d.getMinutes()).slice(-2)}`;
        }
    } catch (e) {}

    // Rules HTML
    let rulesHtml = '';
    if (rules.length > 0) {
        rulesHtml = '<div class="rule-icons" style="display:flex; gap:6px; margin-top:8px;">';
        rules.forEach(r => {
            const ruleImageMap = {
                'ナワバリバトル': 'assets/weapon/ルール_ナワバリバトル.png',
                'ガチエリア': 'assets/weapon/ルール_ガチエリア.png',
                'ガチヤグラ': 'assets/weapon/ルール_ガチヤグラ.png',
                'ガチホコバトル': 'assets/weapon/ルール_ガチホコ.png',
                'ガチホコ': 'assets/weapon/ルール_ガチホコ.png',
                'ガチアサリ': 'assets/weapon/ルール_ガチアサリ.png'
            };
            const imgSrc = ruleImageMap[r] || '';
            if (imgSrc) {
                rulesHtml += `<img src="${imgSrc}" alt="${escapeHtml(r)}" title="${escapeHtml(r)}" style="width:28px; height:28px; object-fit:contain;">`;
            } else {
                rulesHtml += `<span class="badge" style="font-weight:400; background:#f0f0f0; border:none; color:#555; font-size:0.75rem; padding:2px 6px;">${escapeHtml(r)}</span>`;
            }
        });
        rulesHtml += '</div>';
    }

    // Staff Info
    let staffHtml = '';
    if (caster.name || commentator.name) {
        staffHtml = '<div style="margin-top:10px; display:flex; gap:12px; flex-wrap:wrap;">';
        
        if (caster.name) {
            const casterIcon = caster.icon || '';
            staffHtml += `
                <div style="display:flex; align-items:center; gap:5px; font-size:0.8rem; color:#666;">
                    ${casterIcon ? `<img src="${escapeHtml(casterIcon)}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;" alt="実況">` : '<span style="width:20px; height:20px; display:flex; align-items:center; justify-content:center; background:#e0e0e0; border-radius:50%; font-size:0.55rem; color:#666;">実</span>'}
                    <span>実況: ${escapeHtml(caster.name)}</span>
                </div>
            `;
        }
        
        if (commentator.name) {
            const commentatorIcon = commentator.icon || '';
            staffHtml += `
                <div style="display:flex; align-items:center; gap:5px; font-size:0.8rem; color:#666;">
                    ${commentatorIcon ? `<img src="${escapeHtml(commentatorIcon)}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;" alt="解説">` : '<span style="width:20px; height:20px; display:flex; align-items:center; justify-content:center; background:#e0e0e0; border-radius:50%; font-size:0.55rem; color:#666;">解</span>'}
                    <span>解説: ${escapeHtml(commentator.name)}</span>
                </div>
            `;
        }
        
        staffHtml += '</div>';
    }

    // Result HTML (for closed tournaments)
    let resultHtml = '';
    if (status === 'closed' && (result.teamName || result.image)) {
        resultHtml = '<div class="result-section">';
        
        if (result.image) {
            resultHtml += `<img src="${escapeHtml(result.image)}" class="result-image" alt="優勝画像">`;
        }
        
        if (result.teamName) {
            resultHtml += `<div class="result-team">🏆 ${escapeHtml(result.teamName)}</div>`;
            
            // University and Circle
            if (result.university || result.circle || result.university2 || result.circle2) {
                resultHtml += '<div style="font-size:0.85rem; color:#666; margin-bottom:6px;">';
                
                // First university/circle
                if (result.university) resultHtml += escapeHtml(result.university);
                if (result.university && result.circle) resultHtml += ' / ';
                if (result.circle) resultHtml += escapeHtml(result.circle);
                
                // Second university/circle (for cross-university/circle teams)
                if (result.university2 || result.circle2) {
                    resultHtml += '<br>';
                    if (result.university2) resultHtml += escapeHtml(result.university2);
                    if (result.university2 && result.circle2) resultHtml += ' / ';
                    if (result.circle2) resultHtml += escapeHtml(result.circle2);
                }
                
                resultHtml += '</div>';
            }
            
            // Members
            if (result.members && result.members.length > 0) {
                const validMembers = result.members.filter(m => m && m.trim());
                if (validMembers.length > 0) {
                    resultHtml += '<div class="result-members">';
                    validMembers.forEach(member => {
                        resultHtml += `<div>・${escapeHtml(member)}</div>`;
                    });
                    resultHtml += '</div>';
                }
            }
        }
        
        resultHtml += '</div>';
    }

    return `
        <div class="card-note js-scroll-trigger">
            <div class="card-note-inner">
                <div class="card-note-content">
                    <div class="u-mb-10" style="margin-bottom:8px;">
                        <span class="badge ${badgeClass}">${badgeLabel}</span>
                    </div>
                    <h3 style="margin:0 0 8px; font-size:1.15rem; line-height:1.3;">${escapeHtml(name)}</h3>
                    
                    <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:6px;">
                        <span style="font-size:1.3rem; font-weight:700; color:#0c2461;">${dateMonth} ${dateDay}</span>
                        <span style="font-size:1rem; font-weight:600; color:#1e3799;">${dateTime}</span>
                    </div>
                    
                    <div style="font-size:0.8rem; color:#666; margin-bottom:6px;">
                        参加形式: ${escapeHtml(entryTypeText)}
                    </div>
                    
                    ${rulesHtml}
                    ${staffHtml}
                    ${resultHtml}
                </div>
                <div class="card-note-action">
                     <a href="tournament_detail.html?id=${t.id}" class="btn ${btnClass} btn-sm">${btnLabel}</a>
                </div>
            </div>
        </div>
    `;
}
