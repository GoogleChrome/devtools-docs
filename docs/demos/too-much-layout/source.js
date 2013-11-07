//polyfill http://paulirish.com/2011/requestanimationframe-for-smart-animating/
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] +
            'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] +
            'CancelAnimationFrame'] || window[vendors[x] +
            'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(
              function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
      }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
      }
}());

var raf;
var isAnimating = false;
var btn = document.querySelector('button');
var movers = document.querySelectorAll('.mover');

 // Set the tops of each DOM element
(function init() {
        movers[0].style.top = '50px';
        for (var m = 1; m < movers.length; m++) {
            movers[m].style.top = (m * 20) + 'px';
        }
    })();

// animation loop
function update(timestamp) {
    for (var m = 0; m < movers.length; m++) {
        movers[m].style.left = ((Math.sin(movers[m].offsetTop +
            timestamp / 1000) + 1) * 500) +
         'px';
        // movers[m].style.left = ((Math.sin(m + timestamp/1000)+1) * 500) + 'px';
        }
    raf = window.requestAnimationFrame(update);
}

function toggleAnim(e) {
    if (isAnimating) {
        window.cancelAnimationFrame(raf);
        isAnimating = false;
        e.currentTarget.innerHTML = 'Start';
    } else {
        raf = window.requestAnimationFrame(update);
        isAnimating = true;
        e.currentTarget.innerHTML = 'Stop';
    }
}

btn.addEventListener('click', toggleAnim);
