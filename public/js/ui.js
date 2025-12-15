document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.querySelector('.mob-toggle');
    const mobMenu = document.getElementById('mobMenu');
    const overlay = document.getElementById('mobOverlay');
    const links = mobMenu ? mobMenu.querySelectorAll('a') : [];

    if (!toggleBtn || !mobMenu || !overlay) return;

    // Toggle Function
    function toggleMenu() {
        const isActive = mobMenu.classList.contains('active');
        if (isActive) {
            mobMenu.classList.remove('active');
            overlay.classList.remove('active');
            toggleBtn.innerHTML = '<span style="font-size:1.5rem;">☰</span>';
        } else {
            mobMenu.classList.add('active');
            overlay.classList.add('active');
            toggleBtn.innerHTML = '<span style="font-size:1.5rem;">✕</span>'; // Close icon
        }
    }

    // Event Listeners
    toggleBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Close when link clicked
    links.forEach(link => {
        link.addEventListener('click', () => {
            mobMenu.classList.remove('active');
            overlay.classList.remove('active');
            toggleBtn.innerHTML = '<span style="font-size:1.5rem;">☰</span>';
        });
    });
});
