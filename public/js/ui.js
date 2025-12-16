document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.querySelector('.mob-toggle');
    const mobMenu = document.getElementById('mobMenu');
    const overlay = document.getElementById('mobOverlay');
    const closeBtn = document.getElementById('mobClose');
    const links = mobMenu ? mobMenu.querySelectorAll('a') : [];

    if (!toggleBtn || !mobMenu || !overlay) return;

    // Toggle Function
    function toggleMenu() {
        const isOpen = mobMenu.classList.contains('is-open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        mobMenu.classList.add('is-open');
        overlay.classList.add('active');
        toggleBtn.innerHTML = '<span style="font-size:1.5rem; color:var(--c-primary);">✕</span>';
    }

    function closeMenu() {
        mobMenu.classList.remove('is-open');
        overlay.classList.remove('active');
        toggleBtn.innerHTML = '<span style="font-size:1.5rem; color:var(--c-primary);">☰</span>';
    }

    // Event Listeners
    toggleBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    
    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    // Close when link clicked
    links.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
});
