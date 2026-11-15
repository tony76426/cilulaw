/* Keep the existing four-second fade, preparing only the next responsive frame. */
(() => {
    const slides = Array.from(document.querySelectorAll('.hero-slide[data-desktop]'));
    if (slides.length < 2) return;
    const mobile = window.matchMedia('(max-width: 768px)');
    const pending = new Map();
    const source = slide => mobile.matches ? slide.dataset.mobile : slide.dataset.desktop;
    let current = 0;

    function prepare(index) {
        const url = source(slides[index]);
        if (!pending.has(url)) {
            pending.set(url, new Promise(resolve => {
                const image = new Image();
                image.onload = () => resolve(true);
                image.onerror = () => { pending.delete(url); resolve(false); };
                image.src = url;
            }));
        }
        return pending.get(url).then(ready => {
            if (ready) slides[index].style.backgroundImage = `url('${url}')`;
            return ready;
        });
    }

    // The first frame is already supplied by CSS and a matching media preload.
    setTimeout(() => { prepare(1); }, 1000);
    let transitioning = false;
    setInterval(async () => {
        if (document.hidden || transitioning) return;
        transitioning = true;
        try {
            const next = (current + 1) % slides.length;
            if (await prepare(next)) {
                slides[current].classList.remove('active');
                slides[next].classList.add('active');
                current = next;
                prepare((current + 1) % slides.length);
            }
        } finally {
            transitioning = false;
        }
    }, 4000);
    mobile.addEventListener('change', () => {
        prepare(current);
        prepare((current + 1) % slides.length);
    });
})();
