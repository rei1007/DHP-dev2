document.addEventListener('DOMContentLoaded', () => {
    console.log('ui.js loaded');
    
    const toggleBtn = document.querySelector('.mob-toggle');
    const mobMenu = document.querySelector('.mob-menu');
    const overlay = document.querySelector('.mob-overlay');
    const closeBtn = document.querySelector('.mob-close');

    if (!toggleBtn || !mobMenu || !overlay) {
        console.warn('Mobile menu elements not found');
        console.log('toggleBtn:', toggleBtn);
        console.log('mobMenu:', mobMenu);
        console.log('overlay:', overlay);
        return;
    }

    console.log('Mobile menu elements found');

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
        console.log('Opening mobile menu');
        mobMenu.classList.add('is-open');
        overlay.classList.add('is-open');
    }

    function closeMenu() {
        console.log('Closing mobile menu');
        mobMenu.classList.remove('is-open');
        overlay.classList.remove('is-open');
    }

    // Event Listeners
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Toggle button clicked');
        toggleMenu();
    });
    
    overlay.addEventListener('click', closeMenu);
    
    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    // Close menu when clicking on a link
    const links = mobMenu.querySelectorAll('.mob-link, a');
    links.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    console.log('Mobile menu initialized');
});
