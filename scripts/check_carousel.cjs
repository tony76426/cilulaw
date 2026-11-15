// Exercise slow/error loading, hidden tabs and responsive source changes without a browser.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
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
