export class AnimationManager {
    constructor() {
        this.initLoading();
        this.initHero();
        this.initScrollAnimations();
    }

    initLoading() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (!loadingScreen) return;

        // Create Roller Elements
        if (!document.querySelector('.loading-roller-container')) {
             loadingScreen.innerHTML = `
                <div class="loading-roller-container" style="text-align:center;">
                    <div style="font-family:'Zen Kaku Gothic New',sans-serif; font-weight:700; font-size:1.5rem; color:#1e3799; margin-bottom:20px; letter-spacing:0.1em;">
                        NOW LOADING
                    </div>
                    <div style="width:200px; height:4px; background:#e0e0e0; border-radius:4px; overflow:hidden; position:relative;">
                        <div class="loading-bar" style="width:0%; height:100%; background:#1e3799;"></div>
                    </div>
                </div>
             `;
        }

        // Animation Logic
        const startAnimation = () => {
            if (loadingScreen.dataset.animating === 'true') return;
            loadingScreen.dataset.animating = 'true';

            const tl = gsap.timeline();

            tl.to('.loading-bar', {
                width: '100%',
                duration: 1.5,
                ease: 'power2.inOut'
            })
            .to('.loading-roller-container', {
                opacity: 0,
                duration: 0.4,
                delay: 0.2
            })
            .to(loadingScreen, {
                opacity: 0,
                duration: 0.6,
                ease: 'power2.out',
                onComplete: () => {
                    loadingScreen.style.display = 'none';
                    this.playHeroSequence();
                }
            });
        };

        // Check if page is already loaded
        if (document.readyState === 'complete') {
            startAnimation();
        } else {
            window.addEventListener('load', startAnimation);
            // Fallback: If load takes too long (e.g. hung network request), force start after 3s
            setTimeout(() => {
                if (document.readyState !== 'complete') {
                    console.warn('Loading fallback triggered');
                    startAnimation();
                }
            }, 3000);
        }
    }

    initHero() {
        // Just placeholder if needed, logic is called in playHeroSequence
    }

    playHeroSequence() {
        const title = document.querySelector('.hero-title-lg');
        if(!title) return;

        // Manual Robust Split for "青春で<br>塗り替えろ"
        // We restore the original HTML structure but wrapped in spans
        const line1 = "青春で";
        const line2 = "塗り替えろ";
        
        title.innerHTML = '';
        
        // Helper
        const createSpans = (text) => {
            return text.split('').map(char => {
                const s = document.createElement('span');
                s.innerText = char;
                s.className = 'glitch-char';
                s.style.display = 'inline-block'; // Ensure transform works
                return s;
            });
        };

        const spans1 = createSpans(line1);
        spans1.forEach(s => title.appendChild(s));
        
        title.appendChild(document.createElement('br'));
        
        const spans2 = createSpans(line2);
        spans2.forEach(s => title.appendChild(s));

        const charSpans = document.querySelectorAll('.hero-title-lg .glitch-char');
        
        // Appear Animation (Staggered Glitchy appear)
        gsap.fromTo(charSpans, 
            { opacity: 0, scale: 2, filter: 'blur(10px)' },
            { 
                opacity: 1, scale: 1, filter: 'blur(0px)',
                duration: 0.1, 
                stagger: { amount: 0.5, from: "random" },
                ease: "power4.out"
            }
        );

        // Continuous Random Glitch
        setInterval(() => {
            const targets = gsap.utils.toArray('.hero-title-lg .glitch-char');
            const target = gsap.utils.random(targets);
            if(target) {
                target.classList.add('glitch-active');
                setTimeout(() => target.classList.remove('glitch-active'), 200);
            }
        }, 1500);

        // Other Hero Elements Reveal
        gsap.fromTo('.hero-surtitle', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.5 });
        gsap.fromTo('.hero-desc', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.7 });
    }

    initScrollAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // 1. Tournament List (Post-it effect)
        // Wait a bit or try immediately if elements exist
        const initCards = () => {
            const cards = document.querySelectorAll('.card-note');
            if(cards.length > 0) {
                gsap.fromTo(cards, 
                    { 
                        opacity: 0, 
                        rotation: 5, 
                        scale: 0.9,
                        y: 50
                    },
                    {
                        opacity: 1,
                        rotation: 0,
                        scale: 1,
                        y: 0,
                        duration: 0.6,
                        stagger: 0.1,
                        ease: "back.out(1.7)",
                        scrollTrigger: {
                            trigger: '#tourList',
                            start: "top 80%"
                        }
                    }
                );
            }
        };

        // Try immediately
        initCards();
        // Also try again after a delay in case main.js is slow
        setTimeout(initCards, 500);

        // 2. Schedule (Flowing Line)
        const timeline = document.querySelector('.timeline');
        if(timeline) {
            const items = document.querySelectorAll('.timeline-item');
            gsap.fromTo(items, 
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0,
                    duration: 0.8,
                    stagger: 0.3,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: '.timeline',
                        start: "top 75%"
                    }
                }
            );
        }

        // 3. News & SNS (Simple Fade Up)
        const fades = document.querySelectorAll('.sec-title-eng, .sec-subtitle, #newsList li, .sns-icon-wrapper');
        fades.forEach(el => {
            // Check if element is visible/in document
            if(el.offsetParent !== null) {
                gsap.fromTo(el, 
                    { opacity: 0, y: 20 },
                    {
                        opacity: 1, y: 0,
                        duration: 0.6,
                        scrollTrigger: {
                            trigger: el,
                            start: "top 85%"
                        }
                    }
                );
            }
        });
    }
}
