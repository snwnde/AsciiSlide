(function () {
    const stage = document.querySelector('.presentation-stage') || createStage();
    const canvas = document.querySelector('.presentation-canvas') || createCanvas(stage);

    const slides = Array.from(canvas.querySelectorAll('section.slide'));
    if (!slides.length) {
        console.warn('presentation.js: No slides found.');
        return;
    }

    let idx = clamp(hashIndex() ?? 0, 0, slides.length - 1);
    let fragmentIndex = 0;

    function hashIndex() {
        const h = location.hash.replace('#', '');
        const v = parseInt(h, 10);
        return Number.isFinite(v) ? v : null;
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function setActive(i, fromHash = false) {
        i = clamp(i, 0, slides.length - 1);
        // remove active
        slides.forEach((s) => {
            s.classList.remove('active');
            // hide all fragments
            Array.from(s.querySelectorAll('.fragment')).forEach(el => el.classList.remove('visible'));
        });
        const el = slides[i];
        el.classList.add('active');
        fragmentIndex = 0;
        // show any fragments up to 0 (initial none). If slide has data-fragments-start attribute
        // reveal nothing by default.
        if (!fromHash) {
            location.replace(`#${i}`);
        }
        updateFooter(i);
    }

    function updateFooter(i) {
        let f = canvas.querySelector('.presentation-footer');
        if (!f) {
            f = document.createElement('div');
            f.className = 'presentation-footer';
            canvas.appendChild(f);
        }
        f.textContent = `${i + 1} / ${slides.length}`;
    }

    function next() {
        const frags = getCurrentFragments();
        if (frags.length && fragmentIndex < frags.length) {
            // reveal next fragment
            frags[fragmentIndex].classList.add('visible');
            fragmentIndex++;
            return;
        }
        if (idx < slides.length - 1) {
            idx++;
            setActive(idx);
        }
    }

    function prev() {
        const frags = getCurrentFragments();
        if (frags.length && fragmentIndex > 0) {
            fragmentIndex--;
            frags[fragmentIndex].classList.remove('visible');
            return;
        }
        if (idx > 0) {
            idx--;
            setActive(idx);
            // reveal all fragments on newly active slide
            const newFrags = getCurrentFragments();
            fragmentIndex = newFrags.length;
            newFrags.forEach(f => f.classList.add('visible'));
        }
    }

    function getCurrentFragments() {
        const cur = slides[idx];
        return Array.from(cur.querySelectorAll('.fragment'));
    }

    // keyboard handlers
    window.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowRight' || ev.key === 'PageDown') { next(); ev.preventDefault(); }
        else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') { prev(); ev.preventDefault(); }
        else if (ev.key === 'Home') { idx = 0; setActive(idx); ev.preventDefault(); }
        else if (ev.key === 'End') { idx = slides.length - 1; setActive(idx); ev.preventDefault(); }
    });

    // click to advance (but allow clicks on links/buttons)
    canvas.addEventListener('click', (ev) => {
        if (ev.target.closest('a, button, input, select, textarea')) return;
        next();
    });

    // simple touch/swipe
    (function addTouch() {
        let x0 = null;
        canvas.addEventListener('touchstart', e => x0 = e.changedTouches[0].clientX);
        canvas.addEventListener('touchend', e => {
            if (x0 === null) return;
            const x1 = e.changedTouches[0].clientX;
            const dx = x1 - x0;
            if (Math.abs(dx) > 40) {
                if (dx < 0) next();
                else prev();
            }
            x0 = null;
        });
    })();

    // respond to resize to scale canvas to fit viewport while keeping aspect ratio
    function fitCanvas() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // leave a small margin
        const margin = Math.min(48, Math.round(Math.min(vw, vh) * 0.04));
        const availableW = vw - margin * 2;
        const availableH = vh - margin * 2;
        // target canvas size is CSS vars --slide-w / --slide-h; fallback to 1280x720
        const style = getComputedStyle(canvas);
        const w = parseFloat(style.width) || 1280;
        const h = parseFloat(style.height) || 720;
        const scale = Math.min(availableW / w, availableH / h, 1.0);
        canvas.style.transform = `scale(${scale})`;
    }
    window.addEventListener('resize', fitCanvas);

    // watch for hash change to support external links
    window.addEventListener('hashchange', () => {
        const hidx = hashIndex();
        if (hidx !== null && hidx !== idx) {
            idx = clamp(hidx, 0, slides.length - 1);
            setActive(idx, true);
        }
    });

    // initialize
    fitCanvas();
    setActive(idx);

    // expose API
    window.Presentation = {
        go: (n) => { idx = clamp(n, 0, slides.length - 1); setActive(idx); },
        next,
        prev,
        slides,
        currentIndex: () => idx
    };

    // helpers to create minimal stage if not present
    function createStage() {
        const s = document.createElement('div');
        s.className = 'presentation-stage';
        document.body.appendChild(s);
        return s;
    }
    function createCanvas(stg) {
        const c = document.createElement('div');
        c.className = 'presentation-canvas';
        const wrapper = document.createElement('div');
        wrapper.className = 'slides';
        // move all top-level .slide elements into wrapper (if any)
        const found = Array.from(document.body.querySelectorAll('section.slide'));
        found.forEach(el => wrapper.appendChild(el));
        c.appendChild(wrapper);
        stg.appendChild(c);
        return c;
    }

})();