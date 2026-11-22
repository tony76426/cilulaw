// Exercise slow/error loading, hidden tabs and responsive source changes without a browser.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
// Validate the REAL homepage markup, not just four idealized fake slides.
const html = fs.readFileSync('index.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('docs/image-assets.json', 'utf8'));
const heroTags = html.match(/<div class="hero-slide(?: active)?"[^>]*><\/div>/g) || [];
assert.equal(heroTags.length, 4, 'homepage must contain exactly four carousel slides');
assert.match(heroTags[0], /class="hero-slide active"/, 'first slide remains active');
const expected = [];
for (let index = 1; index <= 4; index++) {
    const variants = manifest['images/hero-banner-' + index + '.jpg'].variants;
    assert.equal(variants.length, 2, 'each banner has mobile and desktop WebP sources');
    const mobile = variants[0].url;
    const desktop = variants[1].url;
    const tag = heroTags[index - 1];
    assert.ok(tag.includes('data-mobile="' + mobile + '"'), 'correct mobile image for slide ' + index);
    assert.ok(tag.includes('data-desktop="' + desktop + '"'), 'correct desktop image for slide ' + index);
    assert.ok(!tag.includes('style='), 'no legacy inline JPG backgrounds on slide ' + index);
    for (const src of [mobile, desktop]) assert.ok(fs.existsSync(src), 'missing image ' + src);
    expected.push({mobile, desktop});
}
const preloads = html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g) || [];
assert.equal(preloads.length, 2, 'preload only the first mobile/desktop banner');
assert.ok(preloads.some(tag => tag.includes('href="' + expected[0].mobile + '"') && tag.includes('(max-width: 768px)')));
assert.ok(preloads.some(tag => tag.includes('href="' + expected[0].desktop + '"') && tag.includes('(min-width: 769px)')));
console.log('PASS: all four real homepage banners have correct responsive sources and no legacy backgrounds');

(async () => {
    let tick, warm, changed;
    const loads = [];
    const slides = Array.from({length:4}, (_,i)=>({
        dataset:{mobile:`mobile${i}`,desktop:`desktop${i}`},style:{},
        classList:{active:i===0,add(){this.active=true},remove(){this.active=false}}
    }));
    const media={matches:false,addEventListener:(name,fn)=>changed=fn};
    const document={hidden:false,querySelectorAll:()=>slides};
    class Image {
        set src(url){ loads.push({url,image:this}); }
    }
    vm.runInNewContext(fs.readFileSync('hero-carousel.js','utf8'),{
        document,window:{matchMedia:()=>media},Image,
        setTimeout:fn=>warm=fn,setInterval:fn=>tick=fn
    });
    assert.equal(loads.length,0,'no extra images during initial execution');
    warm();assert.equal(loads.length,1);
    const slow=tick();
    assert.equal(slides[0].classList.active,true,'retain first image while next is loading');
    await tick();assert.equal(loads.length,1,'no duplicate slow requests');
    loads[0].image.onerror();await slow;
    assert.equal(slides[0].classList.active,true,'failed image does not leave a blank slide');
    const retry=tick();loads[1].image.onload();await retry;
    assert.equal(slides[1].classList.active,true);
    assert.equal(slides[0].classList.active,false);
    assert.equal(loads[2].url,'desktop2','prepare only the next frame');
    document.hidden=true;await tick();assert.equal(loads.length,3);document.hidden=false;
    media.matches=true;changed();
    assert.deepEqual(loads.slice(-2).map(x=>x.url),['mobile1','mobile2']);
    assert.equal(slides.filter(s=>s.classList.active).length,1);
    console.log('PASS: staged loading, four-second timer, retry, slow/error frames, hidden tabs and responsive sources');
})();
