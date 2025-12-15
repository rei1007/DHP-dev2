
import { supabase, escapeHtml } from "./common.js";

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initTabs();
    initModals();
});

// ==========================================
// Authentication
// ==========================================
async function initAuth() {
    const btnLogin = document.getElementById('btnLoginDiscord');
    const btnLogout = document.getElementById('btnLogout');
    const loginView = document.getElementById('loginView');
    const dashView = document.getElementById('dashView');
    const userNameSpan = document.getElementById('loginUserName');

    // Helper to switch view
    const updateView = (session) => {
        if (session) {
            console.log("Session found:", session.user.id);
            loginView.style.display = 'none';
            dashView.style.display = 'block';
            userNameSpan.textContent = session.user.email || 'Admin';
            // Only load data if not already loaded (simple check)
            const tbody = document.getElementById('tourTableBody');
            if(tbody && (tbody.innerHTML === '' || tbody.innerHTML.includes('Loading...'))) {
                loadTournaments();
                loadNews();
            }
        } else {
            console.log("No session.");
            loginView.style.display = 'flex';
            dashView.style.display = 'none';
        }
    };

    // Login
    if(btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: { redirectTo: window.location.href }
            });
            if (error) alert(error.message);
        });
    }

    // Logout
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    }

    // 1. Check Session immediately
    const { data: { session } } = await supabase.auth.getSession();
    updateView(session);

    // 2. Listen for changes
    supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth Event:", event);
        updateView(session);
    });
}

// ==========================================
// UI Logic (Tabs & Modals)
// ==========================================
function initTabs() {
    const tabTour = document.getElementById('tabTour');
    const tabNews = document.getElementById('tabNews');
    const contentTour = document.getElementById('contentTour');
    const contentNews = document.getElementById('contentNews');

    if(!tabTour || !tabNews) return;

    tabTour.addEventListener('click', () => {
        tabTour.classList.add('active');
        tabNews.classList.remove('active');
        contentTour.classList.add('active');
        contentNews.classList.remove('active');
    });

    tabNews.addEventListener('click', () => {
        tabNews.classList.add('active');
        tabTour.classList.remove('active');
        contentNews.classList.add('active');
        contentTour.classList.remove('active');
    });
}

function initModals() {
    // Tournament
    const btnNewTour = document.getElementById('btnNewTour');
    const modalTour = document.getElementById('modalTour');
    const btnCloseTour = document.getElementById('btnCloseTourModal');
    const formTour = document.getElementById('formTour');

    btnNewTour.addEventListener('click', () => {
        formTour.reset();
        document.getElementById('tourId').value = '';
        modalTour.classList.add('active');
    });
    btnCloseTour.addEventListener('click', () => modalTour.classList.remove('active'));

    formTour.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveTournament();
        modalTour.classList.remove('active');
    });

    // News
    const btnNewNews = document.getElementById('btnNewNews');
    const modalNews = document.getElementById('modalNews');
    const btnCloseNews = document.getElementById('btnCloseNewsModal');
    const formNews = document.getElementById('formNews');

    btnNewNews.addEventListener('click', () => {
        formNews.reset();
        document.getElementById('newsId').value = '';
        modalNews.classList.add('active');
    });
    btnCloseNews.addEventListener('click', () => modalNews.classList.remove('active'));

    formNews.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveNews();
        modalNews.classList.remove('active');
    });
}


// ==========================================
// CRUD: Tournaments
// ==========================================
async function loadTournaments() {
    const tbody = document.getElementById('tourTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${error.message}</td></tr>`;
        return;
    }
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No data</td></tr>';
        return;
    }

    let html = '';
    data.forEach(t => {
        // Safe access (snake_case from DB)
        const id = t.id;
        const name = t.name || '';
        const evDate = t.eventDate || t.event_date || '';
        const status = t.status || '';
        
        // Expose data for edit via window/dataset or just re-fetch is safer, 
        // but for speed we'll use a globally attached data map if needed, or just pass IDs.
        // We'll attach JSON to the edit button for simplicity.
        const json = JSON.stringify(t).replace(/"/g, '&quot;');

        html += `
        <tr>
            <td>${id}</td>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(evDate)}</td>
            <td>${escapeHtml(status)}</td>
            <td>
                <button class="btn-edit-tour" data-tour="${json}" style="color:blue; margin-right:10px;">編集</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    // Attach Edit Listeners
    document.querySelectorAll('.btn-edit-tour').forEach(btn => {
        btn.addEventListener('click', () => {
            const t = JSON.parse(btn.getAttribute('data-tour'));
            document.getElementById('tourId').value = t.id;
            document.getElementById('tourName').value = t.name;
            document.getElementById('tourDate').value = t.eventDate || t.event_date;
            document.getElementById('tourStatus').value = t.status;
            // rules might be array
            let rulesStr = t.rules;
            if(Array.isArray(rulesStr)) rulesStr = rulesStr.join(', ');
            document.getElementById('tourRules').value = rulesStr;

            document.getElementById('modalTour').classList.add('active');
        });
    });
}

async function saveTournament() {
    const id = document.getElementById('tourId').value;
    const name = document.getElementById('tourName').value;
    const date = document.getElementById('tourDate').value; // String input
    const status = document.getElementById('tourStatus').value;
    const rulesRaw = document.getElementById('tourRules').value;
    const rules = rulesRaw.split(',').map(s => s.trim()).filter(s => s);

    const payload = {
        name: name,
        event_date: date, // DB uses snake_case usually
        status: status,
        rules: rules
    };

    let error;
    if (id) {
        // Update
        const res = await supabase.from('tournaments').update(payload).eq('id', id);
        error = res.error;
    } else {
        // Insert
        const res = await supabase.from('tournaments').insert([payload]);
        error = res.error;
    }

    if (error) {
        alert("Error: " + error.message);
    } else {
        loadTournaments();
    }
}


// ==========================================
// CRUD: News
// ==========================================
async function loadNews() {
    const tbody = document.getElementById('newsTableBody');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    const { data, error } = await supabase.from('news').select('*').order('publishedAt', { ascending: false });

    if (error) {
        tbody.innerHTML = '<tr><td colspan="5">Error</td></tr>';
        return;
    }
    
    let html = '';
    data.forEach(n => {
        const id = n.id;
        const date = n.publishedAt || n.publishedat || '';
        const title = n.title || '';
        const badge = n.badge || '';
        const json = JSON.stringify(n).replace(/"/g, '&quot;');

        html += `
        <tr>
            <td>${id}</td>
            <td>${escapeHtml(date)}</td>
            <td>${escapeHtml(title)}</td>
            <td>${escapeHtml(badge)}</td>
            <td>
                <button class="btn-edit-news" data-news="${json}" style="color:blue;">編集</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    document.querySelectorAll('.btn-edit-news').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = JSON.parse(btn.getAttribute('data-news'));
            document.getElementById('newsId').value = n.id;
            document.getElementById('newsTitle').value = n.title;
            document.getElementById('newsDate').value = (n.publishedAt || n.publishedat || '').split('T')[0];
            document.getElementById('newsBadge').value = n.badge;
            document.getElementById('newsBody').value = n.body || '';
            
            document.getElementById('modalNews').classList.add('active');
        });
    });
}

async function saveNews() {
    const id = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value;
    const date = document.getElementById('newsDate').value;
    const badge = document.getElementById('newsBadge').value;
    const body = document.getElementById('newsBody').value;

    const payload = {
        title: title,
        publishedAt: date, // Check usage
        badge: badge,
        body: body
    };

    let error;
    if (id) {
        // Update
        const res = await supabase.from('news').update(payload).eq('id', id);
        error = res.error;
    } else {
        // Insert
        const res = await supabase.from('news').insert([payload]);
        error = res.error;
    }

    if (error) {
        alert("Error: " + error.message);
    } else {
        loadNews();
    }
}
