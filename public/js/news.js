
import { getNews, escapeHtml } from "./common.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Check which page we are on
    if (document.getElementById('newsListFull')) {
        await initNewsList();
    } else if (document.getElementById('newsDetailContainer')) {
        await initNewsDetail();
    }
});

// ==========================================
// LIST PAGE LOGIC
// ==========================================
async function initNewsList() {
    const data = await getNews();
    if (!data || data.length === 0) {
        document.getElementById('newsListFull').innerHTML = '<li style="padding:20px; text-align:center;">お知らせはありません</li>';
        return;
    }

    // Sort Descending
    data.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    // Extract Years for Filter
    const years = new Set();
    data.forEach(d => {
        if(d.publishedAt) {
            const y = new Date(d.publishedAt).getFullYear();
            if(!isNaN(y)) years.add(y);
        }
    });

    // Render Filter
    const filterContainer = document.getElementById('yearFilterContainer');
    if (filterContainer && years.size > 0) {
        const sortedYears = Array.from(years).sort((a,b) => b-a);
        
        let html = `<button class="btn-filter active" data-year="all">すべて</button>`;
        sortedYears.forEach(y => {
            html += `<button class="btn-filter" data-year="${y}">${y}年</button>`;
        });
        filterContainer.innerHTML = html;

        // Filter Events
        filterContainer.querySelectorAll('.btn-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // UI Toggle
                filterContainer.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Logic
                const y = e.target.getAttribute('data-year');
                renderNewsList(data, y);
            });
        });
    }

    // Initial Render
    renderNewsList(data, 'all');
}

function renderNewsList(data, year) {
    const list = document.getElementById('newsListFull');
    list.innerHTML = '';
    
    let filtered = data;
    if (year !== 'all') {
        filtered = data.filter(d => {
            const y = new Date(d.publishedAt).getFullYear();
            return y.toString() === year;
        });
    }

    if (filtered.length === 0) {
        list.innerHTML = '<li style="padding:40px; text-align:center; color:#999; grid-column:1/-1;">該当するお知らせはありません</li>';
        return;
    }

    filtered.forEach(n => {
        const title = n.title;
        const date = n.publishedAt || '----.--.--';
        
        let badgeHtml = '';
        const badgeOrCategory = n.badge || n.category || 'info';
        
        if (badgeOrCategory === 'tour') {
            badgeHtml = '<span class="badge-news tour">大会情報</span>';
        } else if (badgeOrCategory === 'recruit') {
            badgeHtml = '<span class="badge-news recruit">運営募集</span>';
        } else if (badgeOrCategory === 'important') {
            badgeHtml = '<span class="badge-news important">重要</span>';
        } else {
            badgeHtml = '<span class="badge-news info">お知らせ</span>';
        }

        let dateStr = date;
        try {
            const d = new Date(date);
            if (!isNaN(d)) {
                dateStr = `${d.getFullYear()}.${('0'+(d.getMonth()+1)).slice(-2)}.${('0'+d.getDate()).slice(-2)}`;
            }
        } catch(e) {}

        const item = document.createElement('li');
        item.innerHTML = `
            <a href="news_detail.html?id=${n.id}">
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
                    <span class="text-eng" style="color:#999; font-size:0.85rem; font-weight:600; letter-spacing:0.05em;">${escapeHtml(dateStr)}</span>
                    ${badgeHtml}
                </div>
                <h3 style="font-size:1.1rem; font-weight:700; line-height:1.6; margin:0; color:var(--c-primary-dark);">${escapeHtml(title)}</h3>
            </a>
        `;
        list.appendChild(item);
    });
}



// ==========================================
// DETAIL PAGE LOGIC
// ==========================================
async function initNewsDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const container = document.getElementById('newsDetailContainer');
    const shareContainer = document.getElementById('shareButtons');

    if (!id) {
        container.innerHTML = '<div style="text-align:center;">記事が見つかりませんでした</div>';
        return;
    }

    const data = await getNews();
    // Loose comparison for ID (string vs number)
    const news = data.find(d => d.id == id);

    if (!news) {
        container.innerHTML = '<div style="text-align:center;">記事が見つかりませんでした</div>';
        return;
    }

    // Render Content
    let dateStr = news.publishedAt || '';
    try {
        const d = new Date(news.publishedAt);
        if(!isNaN(d)) {
             dateStr = `${d.getFullYear()}.${('0'+(d.getMonth()+1)).slice(-2)}.${('0'+d.getDate()).slice(-2)}`;
        }
    } catch(e){}

    let badgeHtml = '';
    const badgeOrCategory = news.badge || news.category || 'info';
    
    if (badgeOrCategory === 'tour') {
        badgeHtml = '<span class="badge-news tour">大会情報</span>';
    } else if (badgeOrCategory === 'recruit') {
        badgeHtml = '<span class="badge-news recruit">運営募集</span>';
    } else if (badgeOrCategory === 'important') {
        badgeHtml = '<span class="badge-news important">重要</span>';
    } else {
        badgeHtml = '<span class="badge-news info">お知らせ</span>';
    }

    // Body content (simulate paragraphs)
    const bodyContent = news.body ? escapeHtml(news.body).replace(/\n/g, '<br>') : '';

    container.innerHTML = `
        <header style="border-bottom:1px solid #eee; padding-bottom:20px; margin-bottom:30px;">
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px;">
                <span class="text-eng" style="color:#666;">${dateStr}</span>
                ${badgeHtml}
            </div>
            <h1 style="font-size:1.8rem; font-weight:700; line-height:1.4; color:#0c2461;">${escapeHtml(news.title)}</h1>
        </header>
        <div class="news-body" style="line-height:1.8; color:#333;">
            ${bodyContent}
        </div>
    `;

    // Render Share Buttons
    const shareUrl = window.location.href;
    let textToShare = news.title;
    let hashes = '大学杯';
    
    if(news.type === 'tournament' || (news.badge === 'recruit')) {
        if(news.title.includes('大会') || news.type === 'tournament') {
           hashes = `大学杯,${news.title}`;
        }
    }

    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(textToShare)}&hashtags=${encodeURIComponent(hashes)}`;

    shareContainer.innerHTML = `
        <a href="${twitterUrl}" target="_blank" class="btn-share tw">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
            Post
        </a>
        <button id="btnCopyUrl" class="btn-share copy">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"></path></svg>
            Copy URL
        </button>
    `;

    // Copy Event
    document.getElementById('btnCopyUrl').addEventListener('click', () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('URLをコピーしました');
        });
    });
}
