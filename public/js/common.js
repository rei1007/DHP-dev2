
// ==========================================
// UTILITIES
// ==========================================

export const KEY_TOUR = 'dhp_tournaments';
export const KEY_NEWS = 'dhp_news';

export function getLocalData(key) {
    try {
        const json = localStorage.getItem(key);
        return json ? JSON.parse(json) : [];
    } catch(e) { return []; }
}

export function setLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

export function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m];
  });
}
