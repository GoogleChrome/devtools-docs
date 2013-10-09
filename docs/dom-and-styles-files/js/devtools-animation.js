/**
 * Written by Ben Vanik.
 * https://twitter.com/benvanik
 *
 * This is a heavily modified version of Benjamin James Wright's
 * anim_encoder utility. I've hacked it to be much more flexible, easier to
 * integrate on pages, and support more features (like mouse cursors).
 * Original: http://www.sublimetext.com/~jps/animated_gifs_the_hard_way.html
 */


/**
 * The DOM should contain:
 * <animation src="foo" timescale="1.0" repeatdelay="3"></animation>
 *
 *
 * Data files should add an object to the global 'animationData' object, keyed
 * by the same name used in 'src'. This object should be:
 * animationData['myanim'] = {
 *   'width': 640,
 *   'height': 480,
 *   'meta': [per frame metadata],
 *   'timeline': [timeline data],
 * };
 */


(function(global) {
var document = global.document;


/**
 * @define {boolean} Whether to enable canvas support.
 * Since the DOM method is actually just fine for our uses we avoid canvas
 * unless required. For example, on high-dpi displays the DOM method will show
 * weird banding/etc.
 */
var ENABLE_CANVAS = (global.devicePixelRatio === undefined) ? false :
    global.devicePixelRatio > 1;
//Override for now. Canvas performs much better with a large number of animations
ENABLE_CANVAS = true;

// TODO(benvanik): cursor at 2x res.
/**
 * Base64 encoded cursor data.
 * @type {string}
 * @private
 */
var CURSOR_DATA = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB90EFxYdFdAgO4IAAAEdSURBVFjD7ZY5C8JAFITjEVkPjHcUtNBCSO2/sLUQPBqxsbLz7+s8nJU1Bmw2uyIZ+FC0mGH2ekHwAyqBCqiSCn9zJjFt3il8b4HQZYga6Il5kiQ6RNtliDqYiHEcx15CNMBMTKMo8hLiFUAp5SXEKwA+vYR4C6BxGeKjAbMFFyE+9kDaXJNXiLdTIEgQ0zQtHt1ybgEy7oQrOIMtWOcagIY3fTMaIZZyYYEIKNsBpka9F7DKaGHG9a/ZfrCkzpgmezAHC3DKaKFNc+uPUYdrOwRd0JcgGS0MeAKsP8eKTdQZSDHMIbX7R/zf+kBSNtADiswFY7ADR7BhO2HgQCUatbgcI5o38tgD30a1kLWHPsa1QoUK/aeet3qhH9EDHmv9W3weQV4AAAAASUVORK5CYII=';


/**
 * Cursor hotspot offset.
 * @type {number}
 * @private
 */
var CURSOR_OFFSET = 2;


/**
 * Logs a value to the console, if it is present.
 * @param {*} value Value to log.
 */
function log(value) {
  if (global.console && global.console.log) {
    global.console.log(value);
  }
}


// goog.inherits
function inherits(childCtor, parentCtor) {
  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
}


/**
 * Makes an element unselectable.
 * @param {!Element} el DOM element.
 */
function makeUnselectable(el) {
  el.style.mozUserSelect = 'none';
  el.style.webkitUserSelect = 'none';
  el.style.msUserSelect = 'none';
  el.style.userSelect = 'none';
}


/**
 * Whether <canvas> is present and supported.
 * @type {boolean}
 */
var hasCanvasSupport = ENABLE_CANVAS && (function() {
  var el = document.createElement('canvas');
  return el && el.getContext;
})();



/**
 * @typedef {{
 *   timescale: number,
 *   repeatDelay: number
 * }}
 */
var AnimationOptions;



/**
 * Base animation type.
 * @param {!Element} el <animation> element.
 * @param {!AnimationOptions} options Options.
 * @param {!Object} data Animation data.
 * @param {string} imageSrc Image data source.
 * @constructor
 */
var Animation = function(el, options, data, imageSrc) {
  var self = this;

  /**
   * <animation> element.
   * @type {!Element}
   * @private
   */
  this.el_ = el;

  /**
   * Animation options.
   * @type {!AnimationOptions}
   * @private
   */
  this.options_ = options;

  /**
   * Animation data.
   * @type {!Object}
   * @private
   */
  this.data_ = data;

  /**
   * Image data element.
   * @type {!HTMLImageElement}
   * @private
   */
  this.imageEl_ = document.createElement('img');

  var timeline = data['timeline'];
  var runTime = 0;
  for (var i = 0; i < timeline.length - 1; i++) {
    runTime += timeline[i]['delay'] * options.timescale;
  }

  /**
   * Element used to represent the cursor.
   * Added to the DOM on demand.
   * @type {!Element}
   * @private
   */
  this.cursorEl_ = document.createElement('img');
  this.cursorEl_.style.position = 'absolute';
  this.cursorEl_.style.width = '32px';
  this.cursorEl_.style.height = '32px';
  this.cursorEl_.style.cursor = 'crosshair';
  this.cursorEl_.style.zIndex = 1;
  this.cursorEl_.src = 'data:image/png;base64,' + CURSOR_DATA;
  makeUnselectable(this.cursorEl_);

  /**
   * Total run time of the animation, in seconds.
   * @type {number}
   * @private
   */
  this.runTime_ = runTime;

  /**
   * Current playback timer ID, if any.
   * @type {number|null}
   * @private
   */
  this.timerId_ = null;

  /**
   * Current frame in the timeline.
   * @type {number}
   * @private
   */
  this.currentFrame_ = 0;

  /**
   * this.step_ bound to this object.
   * @type {function()}
   * @private
   */
  this.boundStep_ = function() {
    self.step_();
  };

  // Style the <animation> object.
  el.style.position = 'relative';
  el.style.width = data['width'] + 'px';
  el.style.height = data['height'] + 'px';
  el.style.display = 'block';
  el.style.overflow = 'hidden';
  el.style.cursor = 'crosshair';
  makeUnselectable(el);

  this.addUI();
  this.bindUIEvents();

  this.imageEl_.onload = function() {
    self.start();
  };
  this.imageEl_.src = imageSrc;
};


/**
 * @return {!Element} <animation> element.
 */
Animation.prototype.getElement = function() {
  return this.el_;
};


/**
 * @return {!HTMLImageElement} Image data element.
 */
Animation.prototype.getImageData = function() {
  return this.imageEl_;
};


/**
 * Starts the animation.
 * If the animation is playing it is reset from the beginning.
 */
Animation.prototype.start = function() {
  this.stop();
  this.step_();
};


/**
 * Stops the animation and resets to the beginning.
 */
Animation.prototype.stop = function() {
  this.currentFrame_ = 0;
  if (this.timerId_ !== null) {
    global.clearTimeout(this.timerId_);
    this.timerId_ = null;
  }
  this.clear();
};


/**
 * Add Pause button
 */
Animation.prototype.addUI = function() {
  var pauseButton = document.createElement('span');
  pauseButton.style.lineHeight = this.data_.height + "px";
  pauseButton.classList.add('devtools-animation-icon-pause-circled');
  pauseButton.classList.add('animated');
  pauseButton.classList.add('bounceIn');
  pauseButton.classList.add('devtools-animation-icon');
  this.getElement().parentElement.appendChild(pauseButton);
  this.pauseEl = pauseButton;
};


/**
 * Bind event listeners to the pause button
 */
Animation.prototype.bindUIEvents = function() {

  var pauseButtonClass = 'devtools-animation-icon-pause-circled';
  var playButtonClass = 'devtools-animation-icon-play-circled';

  var pauseCallback = function() {
    if (this.pauseEl.classList.contains(playButtonClass)) {
      //Play
      this.pauseEl.classList.remove(playButtonClass);
      this.pauseEl.classList.add(pauseButtonClass);
      this.resume();
    } else {
      //Pause
      this.pauseEl.classList.remove(pauseButtonClass);
      this.pauseEl.classList.add(playButtonClass);
      this.pause();
    }
  };

  this.pauseEl.addEventListener("click", pauseCallback.bind(this));
};


/**
 * Pause the animation
 */
Animation.prototype.pause = function() {
  this.paused = true;
};


/**
 * Pause the animation
 */
Animation.prototype.resume = function() {
  this.paused = false;
  this.step_();
};


/**
 * Advances the animation one frame.
 * @private
 */
Animation.prototype.step_ = function() {
  if (this.paused) {
    return;
  }

  var timeline = this.data_['timeline'];
  var frame = this.currentFrame_++;
  var timelineData = timeline[frame];
  var delay = timelineData['delay'] / this.options_.timescale;
  var blits = timelineData['blit'];

  // Clear on first frame.
  if (frame === 0) {
    this.clear();
  }

  // Process blits.
  this.drawBlits(blits);

  // Handle repeats.
  if (frame + 1 >= timeline.length) {
    // The last frame.
    this.currentFrame_ = 0;

    // Delay repeat delay.
    delay = this.options_.repeatDelay;
  }

  // Move mouse cursor.
  this.animateCursor_(frame, delay);

  // Queue the next step.
  delay = parseFloat(delay.toFixed(3));

  this.timerId_ = global.setTimeout(this.boundStep_, delay * 1000);
};


/**
 * Clears the target surface.
 * @protected
 */
Animation.prototype.clear = function() {
  log('clear not implemented');
};


/**
 * Draws a list of blits to the target surface.
 * @param {!Array.<!Array.<number>>} blits Blits.
 * @protected
 */
Animation.prototype.drawBlits = function(blits) {
  log('drawBlits not implemented');
};


/**
 * Schedules a cursor animation.
 * We schedule an animation to move it to the location requested in the next
 * frame. If we are the first frame, we set it to the desired position
 * immediately.
 * @param {number} frame Current frame number.
 * @param {number} duration Duration of animation, in seconds.
 * @private
 */
Animation.prototype.animateCursor_ = function(frame, duration) {
  var style = this.cursorEl_.style;

  var metadata = this.data_['meta'];
  if (!metadata || !metadata.length) {
    return;
  }
  if (frame + 1 >= metadata.length) {
    return;
  }

  function getPositionData(frame) {
    var pos = metadata[frame].split(',');
    return [parseFloat(pos[0]), parseFloat(pos[1])];
  }

  var prefixes = ['webkit', 'moz', 'ms', 'o'];
  function setTransition(duration) {
    for (var n = 0; n < prefixes.length; n++) {
      style[prefixes + 'TransitionProperty'] = 'left, top';
      style[prefixes + 'TransitionDuration'] = duration + 's';
    }
    style.transitionProperty = 'left, top';
    style.transitionDuration = duration + 's';
  }
  function moveTo(pos) {
    setTransition(0);
    style.left = (CURSOR_OFFSET + pos[0]) + 'px';
    style.top = (CURSOR_OFFSET + pos[1]) + 'px';
  }
  function animateTo(pos, duration) {
    setTransition(duration);
    style.left = (CURSOR_OFFSET + pos[0]) + 'px';
    style.top = (CURSOR_OFFSET + pos[1]) + 'px';
  }

  // On the first frame immediately move to position.
  if (frame === 0) {
    var initialPosition = getPositionData(0);
    moveTo(initialPosition);
  }

  // Schedule the animation.
  var targetPosition = getPositionData(frame);
  animateTo(targetPosition, duration);

  // Add to the DOM, if needed.
  if (!this.cursorEl_.parentNode) {
    this.el_.appendChild(this.cursorEl_);
  }
};



/**
 * An animation running with <canvas>.
 * This assumes canvas support has already been checked.
 * @param {!Element} el <animation> element.
 * @param {!AnimationOptions} options Options.
 * @param {!Object} data Animation data.
 * @param {string} imageSrc Image data source.
 * @constructor
 * @extends {Animation}
 */
var CanvasAnimation = function(el, options, data, imageSrc) {
  Animation.call(this, el, options, data, imageSrc);

  /**
   * <canvas> element.
   * @type {!HTMLCanvasElement}
   * @private
   */
  this.canvasEl_ = document.createElement('canvas');

  /**
   * 2D rendering context.
   * @type {!CanvasRenderingContext2D}
   * @private
   */
  this.ctx_ = this.canvasEl_.getContext('2d');

  this.canvasEl_.width = data['width'];
  this.canvasEl_.height = data['height'];
  this.canvasEl_.style.position = 'relative';
  this.canvasEl_.style.width = data['width'] + 'px';
  this.canvasEl_.style.height = data['height'] + 'px';
  makeUnselectable(this.canvasEl_);
  el.appendChild(this.canvasEl_);
};
inherits(CanvasAnimation, Animation);


/**
 * @override
 */
CanvasAnimation.prototype.clear = function() {
  var ctx = this.ctx_;
  ctx.clearRect(0, 0, this.canvasEl_.width, this.canvasEl_.height);
};


/**
 * @override
 */
CanvasAnimation.prototype.drawBlits = function(blits) {
  var ctx = this.ctx_;
  var img = this.getImageData();
  for (var n = 0; n < blits.length; n++) {
    var blit = blits[n];
    var sx = blit[0];
    var sy = blit[1];
    var w = blit[2];
    var h = blit[3];
    var dx = blit[4];
    var dy = blit[5];
    ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h);
  }
};



/**
 * An animation running with HTML fallback.
 * This assumes canvas support has already been checked.
 * @param {!Element} el <animation> element.
 * @param {!AnimationOptions} options Options.
 * @param {!Object} data Animation data.
 * @param {string} imageSrc Image data source.
 * @constructor
 * @extends {Animation}
 */
var FallbackAnimation = function(el, options, data, imageSrc) {
  Animation.call(this, el, options, data, imageSrc);

  /**
   * Image source URL.
   * @type {string}
   * @private
   */
  this.imageSrc_ = imageSrc;

  /**
   * A pool of <div>s ready to be used.
   * @type {!Array.<!HTMLDivElement>}
   * @private
   */
  this.freePool_ = [];

  /**
   * A pool of <div>s currently in use by the last blit.
   * @type {!Array.<!HTMLDivElement>}
   * @private
   */
  this.usedPool_ = [];
};
inherits(FallbackAnimation, Animation);


/**
 * @override
 */
FallbackAnimation.prototype.clear = function() {
  var el = this.getElement();
  el.innerHTML = '';
  this.freePool_ = this.usedPool_;
  this.usedPool_ = [];
};


/**
 * @override
 */
FallbackAnimation.prototype.drawBlits = function(blits) {
  var el = this.getElement();

  // Setup the new divs.
  for (var n = 0; n < blits.length; n++) {
    var blit = blits[n];

    // Grab a div to use.
    // Try the free pool or create a new one.
    var div = null;
    if (this.freePool_.length) {
      div = this.freePool_.pop();
    }
    if (!div) {
      div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.backgroundImage = 'url("' + this.imageSrc_ + '")';
      makeUnselectable(div);
    }
    this.usedPool_.push(div);

    // Position.
    var sx = blit[0];
    var sy = blit[1];
    var w = blit[2];
    var h = blit[3];
    var dx = blit[4];
    var dy = blit[5];
    div.style.left = dx + 'px';
    div.style.top = dy + 'px';
    div.style.width = w + 'px';
    div.style.height = h + 'px';
    div.style.backgroundPosition = '-' + sx + 'px -' + sy + 'px';

    // Append to DOM.
    el.appendChild(div);
  }
};



/**
 * Prepares a single <animation> element on the page.
 */
function prepareAnimation(el) {
  if (el.__prepared) {
    return;
  }
  el.__prepared = true;

  // Grab source.
  var src = el.attributes['src'] ? el.attributes['src'].value : null;
  if (!src) {
    log('<animation> has no src');
    return;
  }

  // Get options.
  var options = {
    timescale: 1,
    repeatDelay: 1
  };
  if (el.attributes['speed']) {
    options.timescale = parseFloat(el.attributes['speed'].value);
  }
  if (el.attributes['repeatdelay']) {
    options.repeatDelay = parseFloat(el.attributes['repeatdelay'].value);
  }

  var dataSrc = 'js/' + src + '.js';
  var imageSrc = 'dom-and-styles-files/animations/' + src + '.png';

  // Check global storage object for data. If found, use. Otherwise, XHR.
  var data = global.animationData[src];
  if (data) {
    // Data found in document - setup with that.
    processData(data);
  } else {
    // Data not found. Request.
    log('<animation src="' + src + '"> data not embedded - embed for better ' +
        'performance!');
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      // Wooo XSS attack vectors!
      global.eval(xhr.responseText);
      data = global.animationData[src];
      if (data) {
        processData(data);
      } else {
        // TODO(benvanik): show error image?
        log('<animation src="' + src + '"> data not found after fetch');
      }
    };
    xhr.open('GET', dataSrc, true);
    xhr.send(null);
  }
  return;

  function processData(data) {
    var animation = null;

    if (hasCanvasSupport) {
      animation = new CanvasAnimation(el, options, data, imageSrc);
    } else {
      animation = new FallbackAnimation(el, options, data, imageSrc);
    }
  }
}


/**
 * Prepares all <animation> elements on the page.
 */
function prepareAnimations() {
  var els = document.getElementsByTagName('animation');
  for (var n = 0; n < els.length; n++) {
    prepareAnimation(els[n]);
  }
}


// Exports.
global.prepareAnimation = prepareAnimation;
global.prepareAnimations = prepareAnimations;
global.animationData = global.animationData || {};

})(window);






(function(global) {

	var animationData = {

		"tab-switch-html-attr": {
			timeline: [{"delay": 101, "blit": [[0, 0, 600, 200, 0, 0]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[558, 259, 17, 18, 133, 95]]}, {"delay": 101, "blit": [[543, 244, 47, 48, 118, 80]]}, {"delay": 100, "blit": [[0, 254, 395, 48, 2, 80]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[0, 409, 389, 13, 5, 68]]}, {"delay": 100, "blit": [[5, 68, 389, 13, 5, 68]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[259, 384, 237, 22, 79, 95]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[383, 200, 186, 22, 170, 95], [395, 264, 117, 22, 42, 108]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[0, 200, 383, 54, 8, 95], [20, 138, 49, 10, 20, 151]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 349, 395, 35, 2, 108]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[498, 418, 57, 20, 262, 108], [569, 200, 6, 9, 254, 113], [395, 244, 148, 20, 44, 121]]}, {"delay": 101, "blit": [[395, 286, 106, 22, 93, 121]]}, {"delay": 101, "blit": [[496, 396, 95, 22, 111, 121]]}, {"delay": 101, "blit": [[496, 374, 95, 22, 118, 121]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[490, 352, 95, 22, 125, 121]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[395, 352, 95, 22, 132, 121]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[490, 330, 95, 22, 139, 121]]}, {"delay": 101, "blit": [[395, 330, 95, 22, 146, 121]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[402, 309, 8, 14, 146, 122]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[497, 308, 102, 22, 146, 121]]}, {"delay": 101, "blit": [[395, 308, 102, 22, 153, 121]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 302, 395, 47, 2, 96]]}, {"delay": 101, "blit": [[338, 98, 49, 11, 338, 98], [586, 138, 8, 33, 586, 109], [0, 384, 259, 25, 44, 110], [259, 406, 184, 2, 398, 134], [389, 418, 109, 11, 403, 138], [383, 222, 184, 22, 398, 152]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": []}],
			"height": 200,
			"width": 600
		},

		"scroll-into-view": {
			timeline: [{"delay": 100, "blit": [[0, 0, 600, 650, 0, 0]]}, {"delay": 101, "blit": [[46, 845, 12, 13, 51, 329]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[239, 1127, 239, 284, 44, 328]]}, {"delay": 101, "blit": [[581, 663, 12, 13, 51, 329]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[375, 1683, 213, 19, 57, 335]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[375, 1664, 213, 19, 57, 335], [375, 1645, 213, 19, 57, 366]]}, {"delay": 102, "blit": [[252, 1165, 213, 19, 57, 366]]}, {"delay": 101, "blit": [[375, 1626, 213, 19, 57, 416]]}, {"delay": 101, "blit": [[252, 1215, 213, 19, 57, 416], [375, 1607, 213, 19, 57, 454]]}, {"delay": 100, "blit": [[252, 1253, 213, 19, 57, 454]]}, {"delay": 101, "blit": [[375, 1049, 213, 19, 57, 535]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[581, 650, 13, 13, 113, 538]]}, {"delay": 102, "blit": [[375, 1103, 213, 19, 57, 535]]}, {"delay": 101, "blit": [[375, 845, 213, 258, 57, 331]]}, {"delay": 101, "blit": [[0, 1127, 239, 284, 44, 328]]}, {"delay": 101, "blit": [[0, 650, 581, 195, 2, 74], [587, 248, 8, 18, 587, 77], [587, 74, 8, 18, 587, 248], [0, 845, 375, 282, 5, 329]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 1686, 375, 26, 5, 465], [5, 506, 375, 39, 5, 506]]}, {"delay": 101, "blit": [[0, 1660, 375, 26, 5, 397], [5, 465, 375, 26, 5, 465]]}, {"delay": 101, "blit": [[0, 1607, 375, 53, 5, 370]]}, {"delay": 100, "blit": [[0, 1509, 596, 98, 2, 74], [5, 370, 375, 26, 5, 370]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[0, 1411, 596, 98, 2, 74]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 650
		},

		"revisions": {
			timeline: [{"delay": 100, "blit": [[0, 0, 600, 400, 0, 0]]}, {"delay": 102, "blit": [[555, 1586, 23, 16, 508, 70]]}, {"delay": 100, "blit": [[508, 70, 23, 16, 508, 70], [590, 1351, 10, 118, 212, 155]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[587, 1563, 13, 12, 332, 264]]}, {"delay": 101, "blit": [[458, 1503, 65, 22, 306, 261], [588, 1552, 10, 11, 212, 262]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[441, 1551, 56, 22, 315, 261]]}, {"delay": 100, "blit": [[560, 1445, 28, 22, 315, 261]]}, {"delay": 101, "blit": [[458, 1398, 67, 57, 318, 226]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[581, 1351, 9, 46, 333, 230]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[587, 1023, 9, 46, 340, 230]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[596, 400, 1, 14, 346, 262]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[585, 157, 8, 5, 585, 156], [0, 1825, 375, 82, 206, 226], [4, 1195, 235, 28, 210, 308], [488, 296, 91, 12, 488, 309], [228, 324, 194, 12, 228, 337], [210, 336, 177, 13, 210, 349], [206, 103, 375, 11, 206, 362]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[594, 415, 1, 13, 229, 275]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[593, 415, 1, 13, 229, 275]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[560, 1467, 27, 20, 229, 274]]}, {"delay": 101, "blit": [[545, 1527, 37, 22, 226, 274]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[227, 1508, 214, 159, 229, 137]]}, {"delay": 102, "blit": [[0, 1690, 214, 69, 229, 137], [0, 1777, 119, 12, 246, 209], [0, 1777, 174, 12, 246, 226], [441, 1539, 104, 12, 246, 243], [497, 1563, 90, 12, 246, 260], [581, 1383, 8, 14, 244, 275]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 99, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[375, 1112, 217, 108, 226, 188]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[596, 414, 1, 13, 276, 275]]}, {"delay": 101, "blit": [[523, 1503, 14, 20, 277, 274]]}, {"delay": 101, "blit": [[525, 1398, 28, 22, 273, 274]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[458, 1324, 102, 74, 276, 222]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[458, 1455, 102, 35, 276, 222], [499, 1586, 56, 12, 300, 260], [473, 1377, 8, 14, 298, 275]]}, {"delay": 101, "blit": [[587, 1069, 9, 43, 305, 246]]}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[585, 157, 8, 6, 585, 154], [0, 1112, 375, 134, 206, 239]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[599, 413, 1, 13, 229, 289]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[598, 413, 1, 13, 229, 289]]}, {"delay": 100, "blit": [[587, 1220, 10, 131, 212, 155]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[597, 413, 1, 13, 229, 289]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[582, 1527, 12, 13, 242, 29]]}, {"delay": 100, "blit": [[585, 156, 8, 5, 585, 154], [0, 1907, 375, 34, 206, 288], [4, 1208, 235, 28, 210, 322], [497, 1551, 91, 12, 488, 323], [228, 337, 194, 12, 228, 351], [210, 103, 177, 10, 210, 363]]}, {"delay": 100, "blit": [[242, 29, 12, 13, 242, 29]]}, {"delay": 101, "blit": [[525, 1421, 65, 24, 8, 25], [540, 1503, 57, 24, 204, 25], [0, 400, 593, 323, 3, 50], [0, 1941, 230, 22, 96, 374]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[599, 400, 1, 13, 509, 341]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[598, 400, 1, 13, 509, 341]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[597, 400, 1, 13, 509, 341]]}, {"delay": 100, "blit": []}, {"delay": 99, "blit": []}, {"delay": 101, "blit": [[0, 1759, 211, 18, 3, 114]]}, {"delay": 101, "blit": [[441, 1508, 13, 12, 140, 117], [593, 400, 3, 15, 162, 377]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[229, 1324, 229, 184, 134, 115]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[587, 1481, 13, 12, 140, 117]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[227, 1671, 203, 19, 147, 122]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 99, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[587, 1469, 13, 12, 155, 122]]}, {"delay": 100, "blit": [[375, 1220, 203, 19, 147, 122]]}, {"delay": 101, "blit": [[227, 1667, 203, 158, 147, 118]]}, {"delay": 100, "blit": [[0, 1324, 229, 184, 134, 115]]}, {"delay": 101, "blit": [[0, 1508, 227, 182, 135, 116]]}, {"delay": 101, "blit": [[0, 723, 593, 300, 3, 73], [326, 374, 154, 22, 104, 374], [326, 380, 14, 10, 261, 380]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 464, 196, 18, 3, 114], [578, 1586, 12, 12, 20, 219]]}, {"delay": 101, "blit": [[0, 1023, 587, 89, 3, 219], [21, 880, 76, 11, 24, 310], [20, 893, 128, 13, 23, 323]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[588, 1540, 12, 12, 88, 204]]}, {"delay": 102, "blit": [[560, 1324, 21, 97, 221, 73], [289, 624, 60, 2, 292, 73], [261, 626, 174, 38, 264, 75], [441, 1598, 48, 13, 440, 94], [261, 665, 258, 17, 264, 114], [441, 1586, 58, 12, 523, 121], [582, 778, 8, 22, 585, 132], [247, 684, 238, 24, 250, 133], [492, 693, 14, 9, 495, 142], [525, 1445, 15, 10, 232, 179], [441, 1525, 99, 14, 13, 202], [441, 1575, 77, 11, 23, 217], [0, 1246, 587, 78, 3, 230], [518, 1575, 76, 11, 24, 310], [458, 1490, 128, 13, 23, 323]]}, {"delay": 99, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 400
		},

		"revision-apply-original": {
			timeline: [{"delay": 101, "blit": [[0, 0, 600, 400, 0, 0]]}, {"delay": 101, "blit": [[501, 827, 13, 12, 354, 86]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[575, 763, 17, 16, 341, 90], [599, 463, 1, 13, 250, 246], [575, 851, 14, 10, 196, 380], [593, 441, 7, 8, 268, 381]]}, {"delay": 102, "blit": [[550, 821, 13, 13, 345, 93]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[598, 463, 1, 13, 341, 90]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[488, 807, 26, 20, 303, 52], [488, 738, 103, 13, 264, 103], [520, 763, 55, 13, 63, 117], [264, 104, 103, 12, 264, 117], [265, 117, 123, 12, 265, 130], [271, 130, 131, 12, 271, 143], [306, 143, 96, 11, 306, 156], [264, 156, 96, 11, 264, 169], [264, 169, 96, 11, 264, 182], [264, 181, 91, 12, 264, 194], [249, 194, 239, 51, 249, 207], [488, 784, 84, 11, 249, 259], [249, 259, 286, 12, 249, 272], [264, 260, 317, 64, 264, 273], [264, 325, 317, 12, 264, 338], [354, 338, 227, 7, 354, 351], [575, 841, 14, 10, 261, 380], [236, 507, 8, 9, 202, 381]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[510, 866, 8, 13, 264, 103], [593, 440, 7, 10, 261, 380]]}, {"delay": 100, "blit": [[514, 819, 15, 13, 271, 103], [593, 420, 7, 10, 261, 380]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[571, 817, 15, 13, 285, 103], [521, 832, 7, 10, 261, 380]]}, {"delay": 101, "blit": [[536, 795, 43, 13, 264, 103], [593, 400, 7, 10, 261, 380]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[502, 866, 8, 13, 306, 103], [488, 839, 14, 10, 261, 380]]}, {"delay": 101, "blit": [[494, 866, 8, 13, 313, 103], [261, 380, 7, 10, 268, 380]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[486, 866, 8, 13, 320, 103], [295, 506, 7, 9, 268, 380]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[488, 795, 48, 12, 264, 117]]}, {"delay": 101, "blit": [[597, 463, 1, 13, 327, 103]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[462, 866, 8, 13, 327, 103], [514, 832, 7, 10, 268, 380]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[556, 808, 15, 13, 334, 103], [593, 430, 7, 10, 268, 380]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[478, 866, 8, 13, 348, 103], [593, 420, 7, 10, 268, 380]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[470, 866, 8, 13, 355, 103], [593, 410, 7, 10, 268, 380]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[462, 866, 8, 13, 362, 103], [521, 832, 7, 10, 268, 380]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[589, 841, 8, 13, 369, 103], [593, 400, 7, 10, 268, 380]]}, {"delay": 100, "blit": [[563, 808, 8, 13, 376, 103], [537, 834, 14, 10, 261, 380]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[551, 834, 8, 13, 383, 103], [261, 380, 7, 10, 268, 380]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[264, 104, 48, 12, 264, 117]]}, {"delay": 101, "blit": [[596, 463, 1, 13, 390, 103]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[599, 450, 1, 13, 390, 103]]}, {"delay": 101, "blit": [[303, 52, 26, 20, 303, 52], [63, 117, 55, 13, 63, 117]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[598, 450, 1, 13, 390, 103]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[597, 450, 1, 13, 390, 103]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[596, 450, 1, 13, 390, 103], [0, 948, 211, 19, 3, 114]]}, {"delay": 101, "blit": [[1, 447, 12, 13, 186, 120], [593, 450, 3, 15, 162, 377]]}, {"delay": 100, "blit": [[0, 700, 233, 193, 176, 110]]}, {"delay": 101, "blit": [[488, 751, 32, 33, 176, 110]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[0, 967, 203, 19, 193, 126]]}, {"delay": 100, "blit": [[537, 819, 13, 13, 198, 126]]}, {"delay": 100, "blit": [[0, 967, 13, 13, 198, 126]]}, {"delay": 100, "blit": [[233, 884, 221, 178, 184, 121]]}, {"delay": 101, "blit": [[233, 700, 229, 184, 180, 119]]}, {"delay": 101, "blit": [[0, 400, 593, 300, 3, 73], [268, 374, 109, 22, 104, 374], [288, 380, 59, 10, 216, 380]]}, {"delay": 101, "blit": [[529, 819, 8, 24, 203, 76]]}, {"delay": 102, "blit": [[579, 779, 9, 24, 202, 76]]}, {"delay": 101, "blit": [[586, 817, 8, 24, 203, 76]]}, {"delay": 101, "blit": [[592, 762, 8, 24, 203, 76], [579, 803, 14, 14, 177, 177]]}, {"delay": 101, "blit": [[591, 738, 9, 24, 202, 76], [174, 504, 14, 14, 177, 177]]}, {"delay": 100, "blit": [[200, 403, 8, 24, 203, 76]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[3, 114, 196, 18, 3, 114], [563, 830, 12, 12, 23, 219]]}, {"delay": 101, "blit": [[0, 1165, 587, 50, 3, 219], [20, 557, 128, 13, 23, 271]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[488, 827, 13, 12, 117, 268]]}, {"delay": 101, "blit": [[114, 554, 13, 12, 117, 268]]}, {"delay": 101, "blit": [[462, 864, 131, 2, 221, 73], [462, 851, 113, 13, 249, 75], [462, 738, 26, 113, 221, 76], [462, 700, 132, 38, 263, 91], [585, 152, 8, 53, 585, 101], [520, 751, 70, 12, 404, 114], [0, 893, 215, 27, 250, 130], [514, 808, 42, 11, 467, 142], [514, 832, 14, 10, 298, 179], [0, 1062, 587, 52, 3, 217], [0, 920, 148, 28, 3, 269]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[588, 786, 12, 13, 20, 218]]}, {"delay": 102, "blit": [[0, 1114, 587, 51, 3, 218], [0, 1073, 97, 13, 3, 269], [101, 1075, 130, 13, 104, 271], [0, 1176, 587, 39, 3, 284], [20, 557, 128, 13, 23, 325]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 400
		},

		"rearrange-nodes": {
			timeline: [{"delay": 101, "blit": [[0, 0, 600, 200, 0, 0]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 1196, 380, 18, 49, 101]]}, {"delay": 102, "blit": [[0, 883, 392, 22, 49, 97]]}, {"delay": 100, "blit": [[0, 1315, 380, 2, 2, 89], [0, 860, 384, 23, 61, 92]]}, {"delay": 101, "blit": [[0, 745, 383, 25, 65, 85]]}, {"delay": 102, "blit": [[0, 1313, 380, 2, 2, 75], [0, 564, 446, 23, 2, 80]]}, {"delay": 101, "blit": [[0, 1028, 380, 20, 68, 78]]}, {"delay": 101, "blit": [[0, 947, 380, 21, 68, 75]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[446, 224, 101, 12, 22, 50], [0, 200, 446, 40, 2, 64], [2, 77, 380, 13, 2, 105], [446, 200, 117, 24, 44, 120], [20, 134, 61, 26, 20, 148], [586, 93, 8, 15, 386, 158]]}, {"delay": 101, "blit": [[0, 1281, 374, 13, 5, 77]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[3, 213, 374, 13, 5, 77]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[0, 1294, 374, 13, 5, 105]]}, {"delay": 101, "blit": [[0, 692, 374, 27, 5, 105]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 665, 374, 27, 5, 119]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 1242, 380, 13, 2, 91], [0, 1178, 380, 18, 2, 129]]}, {"delay": 101, "blit": [[56, 101, 18, 18, 56, 129]]}, {"delay": 101, "blit": [[0, 638, 374, 13, 5, 147]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 625, 374, 13, 5, 147]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 1160, 380, 18, 48, 130]]}, {"delay": 101, "blit": [[0, 1311, 380, 2, 2, 117], [0, 719, 385, 26, 48, 122]]}, {"delay": 101, "blit": [[0, 308, 380, 32, 53, 108]]}, {"delay": 101, "blit": [[0, 276, 432, 32, 2, 98]]}, {"delay": 101, "blit": [[0, 1309, 380, 2, 2, 89], [0, 770, 432, 22, 2, 94]]}, {"delay": 101, "blit": [[0, 1067, 381, 19, 54, 93]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 399, 433, 27, 2, 89], [119, 78, 7, 9, 119, 120], [2, 91, 380, 13, 2, 133]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[3, 470, 374, 13, 5, 105]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[3, 1242, 374, 13, 5, 105]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[0, 1281, 374, 13, 5, 77]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[3, 213, 374, 13, 5, 77]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 1105, 380, 19, 42, 82]]}, {"delay": 101, "blit": [[0, 371, 420, 28, 2, 73]]}, {"delay": 101, "blit": [[0, 814, 384, 24, 33, 68]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[0, 838, 411, 22, 2, 68], [2, 63, 380, 13, 2, 91], [586, 78, 8, 19, 586, 93], [214, 177, 49, 22, 185, 177]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[3, 470, 374, 13, 5, 105]]}, {"delay": 101, "blit": [[3, 1242, 374, 13, 5, 105]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 1255, 374, 13, 5, 161]]}, {"delay": 101, "blit": [[0, 638, 374, 27, 5, 147]]}, {"delay": 102, "blit": [[0, 611, 374, 27, 5, 133]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 1229, 380, 13, 2, 77], [586, 93, 8, 19, 586, 93], [0, 1142, 380, 18, 2, 132], [185, 177, 49, 22, 185, 177]]}, {"delay": 100, "blit": [[446, 236, 18, 18, 60, 132]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[563, 219, 18, 18, 59, 129]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 537, 380, 27, 44, 120]]}, {"delay": 101, "blit": [[0, 240, 423, 36, 2, 102]]}, {"delay": 100, "blit": [[0, 483, 423, 27, 2, 93]]}, {"delay": 101, "blit": [[0, 792, 425, 22, 2, 89]]}, {"delay": 101, "blit": [[0, 968, 383, 20, 47, 88]]}, {"delay": 101, "blit": [[0, 1048, 381, 19, 50, 87]]}, {"delay": 100, "blit": [[0, 1214, 429, 15, 2, 89]]}, {"delay": 101, "blit": [[0, 1124, 380, 18, 2, 87], [586, 78, 8, 19, 586, 93], [34, 64, 127, 10, 34, 106], [117, 416, 7, 10, 119, 120], [2, 77, 380, 13, 2, 133], [214, 177, 49, 22, 185, 177]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 1281, 374, 13, 5, 105]]}, {"delay": 100, "blit": [[3, 213, 374, 13, 5, 105]]}, {"delay": 100, "blit": [[0, 1268, 374, 13, 5, 77]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 340, 380, 31, 2, 73]]}, {"delay": 101, "blit": [[581, 218, 18, 18, 52, 73]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[581, 200, 18, 18, 47, 75]]}, {"delay": 101, "blit": [[0, 510, 416, 27, 2, 75]]}, {"delay": 100, "blit": [[0, 426, 385, 30, 38, 84]]}, {"delay": 101, "blit": [[0, 1317, 380, 1, 2, 90], [0, 587, 423, 24, 2, 96]]}, {"delay": 101, "blit": [[0, 988, 381, 20, 45, 102]]}, {"delay": 101, "blit": [[0, 925, 381, 22, 46, 104]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 1307, 380, 2, 2, 103], [0, 905, 425, 20, 2, 108]]}, {"delay": 99, "blit": [[0, 1008, 380, 20, 47, 110]]}, {"delay": 102, "blit": [[563, 200, 18, 19, 64, 112]]}, {"delay": 100, "blit": [[0, 1086, 380, 19, 47, 113]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 358, 380, 13, 2, 77], [34, 64, 115, 10, 34, 92], [586, 93, 8, 19, 586, 93], [0, 456, 425, 27, 2, 105], [185, 177, 49, 22, 185, 177]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[3, 1242, 374, 13, 5, 119], [0, 1255, 374, 13, 5, 161]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[5, 147, 374, 13, 5, 161]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 200
		},

		"pseudo-triggers": {
			timeline: [{"delay": 101, "blit": [[0, 0, 600, 400, 0, 0]]}, {"delay": 101, "blit": [[465, 441, 12, 12, 509, 11]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[327, 708, 23, 16, 533, 70]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 1237, 377, 20, 206, 68]]}, {"delay": 101, "blit": [[0, 400, 377, 306, 206, 68]]}, {"delay": 102, "blit": [[487, 415, 63, 15, 211, 88], [512, 400, 69, 15, 389, 88], [0, 1052, 389, 53, 206, 104], [206, 120, 377, 215, 206, 159]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[579, 419, 13, 14, 389, 88], [485, 441, 8, 8, 4, 166]]}, {"delay": 101, "blit": [[587, 111, 8, 16, 587, 98], [54, 946, 54, 11, 260, 179], [361, 947, 14, 10, 567, 180], [22, 962, 303, 25, 228, 195], [22, 988, 194, 12, 228, 221], [21, 1001, 279, 12, 227, 234], [22, 1014, 201, 12, 228, 247], [22, 1027, 173, 12, 228, 260], [0, 1257, 322, 13, 228, 273], [0, 1192, 305, 25, 228, 286], [377, 400, 135, 13, 228, 312], [377, 413, 110, 13, 228, 325], [0, 1105, 327, 36, 228, 338]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[400, 437, 15, 13, 390, 109]]}, {"delay": 100, "blit": [[579, 419, 16, 16, 389, 106]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[440, 437, 13, 12, 212, 108]]}, {"delay": 100, "blit": [[579, 419, 14, 14, 211, 106]]}, {"delay": 102, "blit": [[587, 111, 8, 5, 587, 97]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[563, 415, 15, 13, 212, 91]]}, {"delay": 100, "blit": [[579, 419, 16, 16, 211, 88], [587, 111, 8, 8, 587, 93], [524, 430, 55, 11, 266, 179], [377, 426, 77, 11, 504, 180], [327, 1105, 247, 12, 284, 195], [0, 1141, 334, 26, 228, 208], [0, 1167, 313, 25, 228, 234], [210, 103, 7, 11, 210, 248], [0, 938, 377, 114, 206, 260]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[415, 437, 13, 13, 389, 90]]}, {"delay": 101, "blit": [[581, 400, 13, 15, 389, 88], [587, 101, 8, 14, 587, 93], [260, 140, 54, 11, 260, 268], [361, 492, 14, 10, 567, 269], [228, 156, 303, 25, 228, 284], [228, 182, 194, 12, 228, 310], [227, 195, 279, 12, 227, 323], [22, 559, 201, 12, 228, 336], [228, 221, 173, 12, 228, 349], [228, 234, 322, 12, 228, 362]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[428, 437, 12, 13, 389, 108]]}, {"delay": 100, "blit": [[550, 415, 13, 15, 389, 106]]}, {"delay": 102, "blit": [[5, 420, 12, 12, 389, 108]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[453, 441, 12, 12, 214, 107]]}, {"delay": 101, "blit": [[587, 109, 8, 6, 587, 103], [581, 400, 15, 14, 211, 106]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[579, 435, 15, 17, 211, 90]]}, {"delay": 101, "blit": [[581, 400, 15, 19, 211, 88], [587, 106, 8, 9, 587, 105], [477, 441, 8, 8, 4, 166], [302, 88, 61, 11, 260, 179], [298, 492, 77, 11, 504, 180], [228, 156, 238, 12, 228, 195], [22, 520, 144, 13, 228, 208], [22, 533, 334, 13, 228, 221], [210, 195, 331, 25, 210, 234], [206, 221, 377, 114, 206, 260]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[377, 437, 23, 16, 510, 70]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[510, 70, 23, 16, 510, 70]]}, {"delay": 101, "blit": [[0, 1217, 377, 20, 206, 68]]}, {"delay": 102, "blit": [[0, 706, 377, 232, 206, 68], [228, 272, 271, 53, 228, 300], [501, 301, 54, 22, 501, 329], [228, 325, 216, 21, 228, 353], [446, 341, 76, 5, 446, 369]]}, {"delay": 100, "blit": [[0, 439, 377, 26, 206, 88], [587, 110, 8, 5, 587, 110], [206, 116, 377, 52, 206, 116], [209, 168, 122, 13, 209, 168], [454, 430, 70, 11, 511, 169], [227, 182, 136, 53, 227, 182], [228, 235, 327, 79, 228, 235], [228, 314, 327, 27, 228, 314], [22, 692, 301, 12, 228, 341], [228, 354, 258, 20, 228, 354], [487, 367, 62, 7, 487, 367]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[533, 70, 23, 16, 533, 70]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 400
		},

		"new-style-rule": {
			timeline: [{"delay": 100, "blit": [[0, 0, 600, 200, 0, 0]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[304, 424, 23, 16, 510, 70]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[377, 361, 86, 40, 514, 95]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 442, 377, 20, 206, 68], [514, 95, 86, 40, 514, 95], [377, 401, 187, 13, 3, 136]]}, {"delay": 101, "blit": [[0, 422, 377, 20, 206, 68], [0, 308, 377, 58, 206, 120]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 366, 377, 56, 206, 122]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[592, 222, 1, 13, 229, 138]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[564, 222, 26, 20, 230, 137]]}, {"delay": 101, "blit": [[533, 200, 37, 22, 226, 137]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[217, 200, 214, 108, 229, 51]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[590, 222, 1, 14, 251, 138]]}, {"delay": 101, "blit": [[0, 200, 217, 108, 226, 51]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[591, 222, 1, 13, 276, 138]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[585, 242, 14, 20, 277, 137]]}, {"delay": 101, "blit": [[570, 200, 28, 22, 273, 137]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[431, 200, 102, 91, 276, 68]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[599, 214, 1, 14, 291, 138]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[463, 361, 100, 34, 277, 69], [533, 222, 31, 21, 291, 138]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[431, 291, 102, 70, 276, 68], [564, 242, 21, 14, 291, 138]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[598, 214, 1, 14, 311, 138]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[599, 200, 1, 14, 311, 138]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[510, 70, 23, 16, 510, 70]]}, {"delay": 102, "blit": [[598, 200, 1, 14, 311, 138]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 200
		},

		"navigating-dom": {
			timeline: [{"delay": 101, "blit": [[0, 0, 600, 400, 0, 0]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 1444, 596, 348, 2, 50], [599, 1444, 1, 75, 0, 321], [598, 1444, 1, 75, 599, 321]]}, {"delay": 102, "blit": [[0, 5178, 600, 75, 0, 321]]}, {"delay": 101, "blit": [[0, 5103, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[399, 748, 199, 325, 399, 50], [2, 807, 396, 27, 2, 109], [240, 1074, 40, 22, 240, 376]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[199, 2644, 199, 325, 399, 50], [2, 1169, 396, 27, 2, 123], [559, 5345, 40, 22, 240, 376]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 5387, 396, 27, 2, 137], [523, 5367, 42, 22, 240, 376]]}, {"delay": 101, "blit": [[398, 2644, 199, 325, 399, 50]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 5028, 600, 75, 0, 321]]}, {"delay": 102, "blit": [[0, 4953, 600, 75, 0, 321]]}, {"delay": 101, "blit": [[0, 1792, 596, 346, 2, 50], [597, 1444, 1, 75, 0, 321], [596, 1444, 1, 75, 599, 321]]}, {"delay": 101, "blit": [[0, 4878, 600, 75, 0, 321]]}, {"delay": 101, "blit": [[0, 4803, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 4728, 600, 75, 0, 321]]}, {"delay": 102, "blit": [[0, 4653, 600, 75, 0, 321]]}, {"delay": 100, "blit": [[0, 4578, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 5414, 381, 27, 2, 151], [0, 3151, 600, 77, 0, 321]]}, {"delay": 101, "blit": [[396, 5401, 178, 11, 403, 154], [401, 5255, 138, 12, 403, 167], [401, 5268, 131, 12, 403, 180], [0, 2138, 600, 204, 0, 192]]}, {"delay": 101, "blit": [[0, 4503, 600, 75, 0, 321]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[0, 4428, 600, 75, 0, 321]]}, {"delay": 102, "blit": [[0, 4353, 600, 75, 0, 321]]}, {"delay": 100, "blit": [[22, 97, 8, 36, 46, 167], [488, 5477, 49, 9, 169, 167], [55, 5268, 193, 12, 57, 180], [174, 1908, 127, 10, 56, 194], [62, 1922, 189, 24, 64, 208], [566, 5440, 28, 10, 253, 222], [64, 2154, 210, 12, 64, 236], [62, 1964, 224, 12, 64, 250], [62, 1978, 231, 12, 64, 264], [62, 1992, 224, 12, 64, 278], [62, 2006, 287, 12, 64, 292], [0, 3060, 600, 91, 0, 305]]}, {"delay": 101, "blit": [[0, 4278, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[0, 4203, 600, 75, 0, 321]]}, {"delay": 100, "blit": [[401, 1896, 178, 11, 403, 154], [585, 1937, 8, 82, 587, 155], [0, 5280, 539, 27, 2, 165], [396, 5389, 178, 12, 403, 193], [241, 5490, 139, 12, 403, 205], [248, 5478, 103, 12, 421, 221], [488, 5464, 104, 13, 403, 233], [0, 2493, 600, 151, 0, 247]]}, {"delay": 102, "blit": [[0, 4128, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 4053, 600, 75, 0, 321]]}, {"delay": 100, "blit": [[0, 3978, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[396, 5401, 178, 11, 403, 154], [587, 254, 8, 82, 587, 155], [0, 5253, 539, 27, 2, 165], [403, 2139, 178, 12, 403, 193], [403, 2151, 139, 12, 403, 205], [421, 2167, 103, 12, 421, 221], [403, 247, 104, 13, 403, 233], [0, 2342, 600, 151, 0, 247]]}, {"delay": 101, "blit": [[0, 3903, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[0, 3828, 600, 75, 0, 321]]}, {"delay": 101, "blit": [[585, 5253, 8, 36, 46, 167], [167, 5430, 49, 9, 169, 167], [55, 1922, 193, 12, 57, 180], [54, 1936, 127, 10, 56, 194], [62, 1950, 189, 24, 64, 208], [251, 1964, 28, 10, 253, 222], [62, 1978, 210, 12, 64, 236], [62, 1992, 224, 12, 64, 250], [62, 2006, 231, 12, 64, 264], [62, 2020, 224, 12, 64, 278], [62, 2034, 287, 12, 64, 292], [0, 2969, 600, 91, 0, 305]]}, {"delay": 101, "blit": [[0, 3753, 600, 75, 0, 321]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[442, 5440, 46, 46, 274, 339]]}, {"delay": 101, "blit": [[0, 1893, 381, 27, 2, 151], [401, 1896, 178, 11, 403, 154], [401, 1909, 138, 12, 403, 167], [401, 1922, 131, 12, 403, 180], [400, 1934, 179, 13, 402, 192], [587, 332, 8, 42, 587, 195], [402, 2799, 139, 28, 403, 205], [398, 2827, 184, 142, 399, 233], [396, 5367, 127, 22, 233, 376]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[381, 5440, 15, 325, 383, 50], [141, 5402, 49, 10, 143, 152], [224, 5307, 193, 53, 32, 153], [20, 208, 233, 12, 20, 208], [20, 222, 261, 11, 20, 222], [0, 5525, 227, 10, 47, 236], [0, 5490, 241, 12, 47, 250], [0, 5478, 248, 12, 47, 264], [0, 5514, 227, 11, 47, 278], [0, 5466, 304, 12, 47, 292], [381, 5414, 207, 26, 46, 305], [304, 5464, 63, 12, 253, 319], [417, 5307, 136, 38, 35, 333], [396, 5440, 46, 46, 274, 339]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[0, 3678, 600, 75, 0, 321]]}, {"delay": 102, "blit": [[0, 3603, 600, 75, 0, 321]]}, {"delay": 101, "blit": [[0, 1096, 600, 348, 0, 50]]}, {"delay": 101, "blit": [[0, 748, 600, 348, 0, 50]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[199, 2644, 199, 325, 399, 50], [0, 1503, 396, 27, 2, 109], [559, 5345, 40, 22, 240, 376]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 2644, 199, 325, 399, 50], [2, 95, 396, 27, 2, 95], [417, 5345, 142, 22, 139, 376]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 100, "blit": [[488, 5440, 78, 24, 183, 96], [309, 5441, 52, 23, 20, 97], [210, 5502, 98, 12, 79, 110], [20, 222, 312, 12, 20, 124], [396, 5486, 161, 12, 44, 138], [487, 5508, 78, 10, 211, 138], [396, 5498, 157, 10, 35, 152], [396, 5508, 91, 10, 44, 166], [0, 5307, 224, 53, 20, 180], [553, 5299, 46, 46, 274, 339]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 3528, 600, 75, 0, 321]]}, {"delay": 100, "blit": [[0, 3453, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 400, 600, 348, 0, 50]]}, {"delay": 100, "blit": [[0, 3378, 600, 75, 0, 321]]}, {"delay": 101, "blit": [[0, 5360, 396, 27, 2, 67], [574, 5403, 21, 10, 410, 141], [484, 296, 40, 11, 484, 169], [224, 5441, 85, 22, 95, 376]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[308, 5502, 56, 10, 63, 68], [574, 5367, 22, 36, 10, 69], [33, 222, 211, 11, 33, 82], [0, 5502, 210, 12, 33, 96], [0, 5441, 224, 25, 20, 110], [539, 5253, 46, 46, 274, 339]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[0, 3303, 600, 75, 0, 321]]}, {"delay": 101, "blit": [[0, 3228, 600, 75, 0, 321]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 400
		},

		"metrics-pane": {
			"timeline": [{"delay": 101, "blit": [[0, 0, 600, 650, 0, 0]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 3599, 392, 19, 206, 384]]}, {"delay": 101, "blit": [[0, 1578, 392, 277, 206, 347]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 650, 580, 239, 3, 81]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[3, 81, 580, 239, 3, 81]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 650, 580, 239, 3, 81]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[413, 1732, 143, 94, 323, 454]]}, {"delay": 101, "blit": [[0, 1339, 488, 239, 5, 81]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[0, 1114, 580, 225, 3, 95], [401, 2303, 185, 134, 302, 434]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[0, 2753, 400, 225, 93, 95], [401, 2571, 143, 94, 323, 454]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 2978, 398, 224, 94, 96], [466, 1904, 119, 58, 335, 472]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[1, 2754, 398, 224, 94, 96], [413, 2589, 119, 58, 335, 472]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[564, 1371, 32, 32, 430, 485]]}, {"delay": 102, "blit": [[564, 1339, 32, 32, 430, 485]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[580, 663, 14, 12, 438, 495]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[0, 3427, 219, 172, 285, 415]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 2528, 401, 225, 59, 95], [526, 1339, 38, 225, 489, 95], [381, 3221, 191, 134, 299, 434]]}, {"delay": 100, "blit": [[493, 2665, 95, 12, 95, 555]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 99, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 2079, 466, 224, 60, 96], [392, 1578, 191, 134, 299, 434]]}, {"delay": 99, "blit": []}, {"delay": 101, "blit": [[0, 1855, 466, 224, 60, 96], [466, 1846, 125, 58, 332, 472]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[580, 650, 13, 13, 333, 495]]}, {"delay": 101, "blit": [[519, 1850, 13, 13, 333, 495]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[564, 1403, 26, 21, 332, 494]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[367, 3374, 219, 172, 285, 415]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[593, 650, 1, 12, 345, 495]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 3202, 367, 225, 59, 95], [488, 1339, 20, 225, 507, 95], [401, 2437, 185, 134, 302, 434]]}, {"delay": 100, "blit": [[401, 2690, 187, 25, 3, 555], [46, 569, 144, 12, 46, 582], [46, 582, 144, 14, 46, 595]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 559, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[34, 2303, 367, 225, 59, 95], [380, 2753, 20, 225, 507, 95], [367, 3202, 219, 172, 285, 415]]}, {"delay": 100, "blit": [[401, 2665, 187, 25, 3, 555], [46, 582, 144, 12, 46, 582], [46, 595, 144, 14, 46, 595]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 2303, 401, 225, 59, 95], [488, 1339, 38, 225, 489, 95], [79, 1646, 219, 172, 285, 415]]}, {"delay": 101, "blit": [[95, 555, 95, 12, 95, 555]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[90, 1114, 400, 225, 93, 95], [401, 2303, 185, 134, 302, 434]]}, {"delay": 100, "blit": [[0, 889, 580, 225, 3, 95], [392, 1712, 185, 134, 302, 434]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 650
		},

		"inspect-element": {
			timeline: [{"delay": 101, "blit": [[0, 0, 600, 650, 0, 0]]}, {"delay": 101, "blit": [[569, 1723, 26, 8, 381, 81]]}, {"delay": 101, "blit": [[381, 81, 26, 8, 381, 81]]}, {"delay": 101, "blit": [[0, 650, 581, 335, 2, 74], [0, 2840, 378, 13, 5, 453]]}, {"delay": 101, "blit": [[393, 1823, 178, 18, 78, 81], [517, 1863, 69, 12, 8, 85], [5, 453, 378, 13, 5, 453]]}, {"delay": 101, "blit": [[2, 74, 581, 335, 2, 74], [0, 2801, 378, 13, 5, 522]]}, {"delay": 100, "blit": [[5, 522, 378, 13, 5, 522], [0, 2814, 378, 13, 5, 564]]}, {"delay": 101, "blit": [[5, 564, 378, 13, 5, 564], [0, 2827, 378, 13, 5, 592]]}, {"delay": 100, "blit": [[0, 2710, 378, 17, 5, 592]]}, {"delay": 101, "blit": [[0, 2710, 378, 3, 5, 606]]}, {"delay": 101, "blit": [[267, 2597, 279, 9, 5, 612]]}, {"delay": 101, "blit": [[5, 612, 279, 9, 5, 612]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 2870, 596, 1, 2, 410], [0, 2869, 596, 1, 2, 435], [518, 1841, 74, 22, 63, 625], [64, 625, 9, 22, 268, 625]]}, {"delay": 101, "blit": [[554, 1745, 23, 22, 63, 625], [598, 650, 1, 22, 94, 625]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 2814, 378, 13, 5, 564]]}, {"delay": 101, "blit": [[0, 2801, 378, 13, 5, 522], [5, 564, 378, 13, 5, 564]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[0, 2861, 454, 8, 5, 398], [5, 522, 378, 13, 5, 522]]}, {"delay": 100, "blit": [[396, 1495, 193, 67, 121, 269], [0, 2853, 454, 8, 5, 398]]}, {"delay": 102, "blit": [[396, 1562, 198, 49, 121, 266], [381, 1997, 123, 18, 173, 318], [537, 1733, 49, 12, 124, 322], [5, 398, 454, 8, 5, 398]]}, {"delay": 101, "blit": [[0, 2319, 342, 94, 104, 242]]}, {"delay": 101, "blit": [[0, 2413, 384, 57, 104, 229]]}, {"delay": 101, "blit": [[0, 2470, 384, 40, 104, 189], [102, 814, 384, 171, 104, 238]]}, {"delay": 100, "blit": [[0, 1495, 396, 227, 92, 182]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[581, 825, 12, 13, 125, 187], [0, 1722, 393, 173, 2, 436], [587, 173, 8, 14, 587, 468], [381, 2026, 134, 13, 402, 539], [393, 1795, 142, 28, 421, 539], [381, 2039, 121, 12, 403, 568], [396, 1658, 184, 43, 399, 581], [0, 2666, 406, 22, 73, 625]]}, {"delay": 101, "blit": [[123, 763, 12, 13, 125, 187]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 2788, 378, 13, 5, 456]]}, {"delay": 100, "blit": [[0, 985, 596, 279, 2, 130], [0, 2639, 378, 27, 5, 456]]}, {"delay": 102, "blit": [[393, 1748, 161, 25, 4, 130], [0, 1264, 596, 231, 2, 178], [3, 1756, 378, 13, 5, 470], [3, 2108, 378, 13, 5, 512]]}, {"delay": 101, "blit": [[0, 2241, 596, 78, 2, 151], [0, 2068, 381, 173, 2, 436], [385, 1779, 8, 34, 387, 499]]}, {"delay": 101, "blit": [[396, 1701, 141, 47, 2, 182], [267, 2571, 301, 26, 297, 182], [52, 1524, 151, 18, 144, 211], [0, 1895, 381, 173, 2, 436], [385, 1777, 8, 36, 387, 505]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[381, 1946, 211, 51, 92, 178], [0, 2775, 378, 13, 5, 526]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[381, 1895, 211, 51, 92, 178], [3, 1985, 378, 13, 5, 526]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[581, 813, 13, 12, 127, 513]]}, {"delay": 101, "blit": [[581, 782, 8, 31, 387, 510], [0, 2571, 267, 40, 116, 513], [163, 2571, 65, 24, 279, 513], [90, 1986, 78, 10, 104, 555], [93, 1986, 288, 12, 95, 569], [102, 1986, 77, 24, 92, 583]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[92, 182, 211, 47, 92, 182], [0, 2762, 378, 13, 5, 526]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[581, 838, 12, 12, 184, 528]]}, {"delay": 101, "blit": [[0, 2611, 381, 28, 2, 512], [0, 2727, 273, 22, 206, 625], [133, 2672, 43, 13, 139, 631]]}, {"delay": 100, "blit": [[537, 1701, 32, 32, 174, 518]]}, {"delay": 100, "blit": [[0, 2510, 381, 32, 2, 518]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[393, 1773, 182, 22, 165, 525]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[569, 1701, 28, 22, 165, 525]]}, {"delay": 101, "blit": [[581, 760, 17, 22, 183, 525]]}, {"delay": 102, "blit": [[581, 738, 17, 22, 190, 525]]}, {"delay": 100, "blit": [[581, 716, 17, 22, 197, 525]]}, {"delay": 101, "blit": [[581, 694, 17, 22, 204, 525]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[581, 672, 17, 22, 211, 525]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[581, 650, 17, 22, 218, 525]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[381, 2015, 192, 11, 103, 190], [0, 2688, 381, 22, 2, 525]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[396, 1611, 203, 47, 92, 182], [0, 2749, 378, 13, 5, 512]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 2542, 381, 29, 2, 510], [393, 1841, 125, 22, 319, 625]]}, {"delay": 101, "blit": [[202, 2190, 12, 13, 204, 510], [393, 1863, 124, 22, 319, 625]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 650
		},

		"event-listener-resize": {
			timeline: [{"delay": 102, "blit": [[0, 0, 600, 400, 0, 0]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[0, 2757, 12, 13, 392, 132]]}, {"delay": 101, "blit": [[191, 2675, 181, 325, 389, 50]]}, {"delay": 100, "blit": [[0, 2675, 191, 325, 385, 50], [354, 1491, 8, 6, 587, 140]]}, {"delay": 100, "blit": [[345, 2025, 196, 325, 376, 50], [587, 139, 8, 5, 587, 142], [590, 400, 4, 5, 572, 212]]}, {"delay": 102, "blit": [[392, 1050, 208, 325, 365, 50], [587, 139, 8, 5, 587, 143]]}, {"delay": 101, "blit": [[0, 400, 563, 325, 2, 50], [354, 1491, 8, 6, 587, 144], [575, 434, 7, 18, 566, 198]]}, {"delay": 101, "blit": [[362, 1375, 236, 325, 338, 50], [587, 130, 8, 14, 587, 146]]}, {"delay": 101, "blit": [[359, 1700, 241, 325, 321, 50], [587, 413, 12, 13, 306, 132], [587, 135, 8, 9, 587, 156], [563, 400, 12, 63, 562, 312]]}, {"delay": 100, "blit": [[0, 2350, 264, 325, 293, 50], [587, 136, 8, 8, 587, 161]]}, {"delay": 101, "blit": [[264, 2350, 263, 325, 280, 50], [287, 1492, 28, 10, 543, 193]]}, {"delay": 101, "blit": [[0, 1375, 362, 325, 233, 50], [372, 2714, 188, 23, 44, 110]]}, {"delay": 102, "blit": [[0, 1700, 359, 325, 236, 50]]}, {"delay": 101, "blit": [[0, 725, 552, 325, 2, 50], [575, 426, 19, 8, 555, 170]]}, {"delay": 100, "blit": [[0, 2025, 345, 325, 205, 50], [575, 400, 12, 13, 173, 132]]}, {"delay": 101, "blit": [[563, 463, 36, 14, 149, 132]]}, {"delay": 102, "blit": [[563, 477, 30, 15, 131, 133]]}, {"delay": 100, "blit": [[575, 400, 15, 13, 128, 135]]}, {"delay": 101, "blit": [[575, 413, 12, 13, 128, 135]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[0, 3026, 377, 20, 206, 68], [372, 2675, 203, 39, 2, 109]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[0, 1050, 392, 325, 206, 50]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 4000, "blit": [[0, 3000, 596, 26, 2, 24], [594, 426, 5, 27, 595, 373]]}],
			"width": 600,
			"height": 400
		},

		"element-event-listener": {
			timeline: [{"delay": 101, "blit": [[0, 0, 600, 400, 0, 0]]}, {"delay": 102, "blit": [[328, 1289, 246, 13, 5, 150]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[328, 1263, 252, 13, 2, 95], [4, 840, 41, 13, 259, 140], [328, 1250, 252, 13, 2, 150], [22, 856, 160, 25, 277, 156], [183, 869, 68, 12, 438, 169], [0, 1681, 343, 2, 255, 197], [5, 901, 124, 12, 260, 201], [0, 1393, 343, 124, 255, 215], [328, 1215, 178, 22, 139, 374]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[328, 1276, 246, 13, 5, 220]]}, {"delay": 101, "blit": [[5, 220, 246, 13, 5, 220]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[569, 924, 12, 12, 259, 321]]}, {"delay": 101, "blit": [[328, 1237, 252, 13, 2, 150], [569, 893, 20, 31, 259, 321], [107, 123, 28, 10, 279, 342], [0, 1683, 343, 1, 255, 357]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[586, 873, 12, 12, 257, 341]]}, {"delay": 102, "blit": [[0, 750, 343, 323, 255, 50]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[0, 1535, 340, 16, 255, 50], [0, 772, 328, 39, 255, 68], [0, 811, 328, 245, 255, 107], [0, 1517, 340, 18, 255, 355]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[586, 861, 12, 12, 269, 355]]}, {"delay": 101, "blit": [[325, 530, 8, 5, 587, 56], [586, 750, 8, 87, 587, 283], [3, 1040, 12, 12, 269, 355], [0, 1685, 328, 1, 255, 372]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 1073, 328, 320, 255, 50], [325, 447, 8, 87, 587, 56], [325, 618, 8, 87, 587, 283], [0, 1684, 328, 1, 255, 372]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[343, 750, 243, 143, 357, 257]]}, {"delay": 101, "blit": [[586, 849, 12, 12, 381, 258]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[328, 1196, 213, 19, 387, 264]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[586, 837, 12, 12, 427, 271]]}, {"delay": 102, "blit": [[328, 1177, 213, 19, 387, 264]]}, {"delay": 100, "blit": [[343, 1036, 222, 141, 378, 259]]}, {"delay": 102, "blit": [[343, 893, 226, 143, 374, 257]]}, {"delay": 101, "blit": [[328, 1302, 65, 24, 7, 25], [541, 1177, 57, 24, 203, 25], [0, 400, 598, 350, 2, 50]]}, {"delay": 100, "blit": [[0, 1668, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[290, 1655, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[0, 1655, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[290, 1642, 290, 13, 33, 250]]}, {"delay": 102, "blit": [[0, 1642, 290, 13, 33, 250]]}, {"delay": 100, "blit": [[290, 1629, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[0, 1629, 290, 13, 33, 250]]}, {"delay": 100, "blit": [[290, 1616, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[0, 1616, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[290, 1603, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[0, 1603, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[290, 1590, 290, 13, 33, 250]]}, {"delay": 100, "blit": [[0, 1590, 290, 13, 33, 250]]}, {"delay": 100, "blit": [[290, 1577, 290, 13, 33, 250]]}, {"delay": 102, "blit": [[0, 1577, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[290, 1564, 290, 13, 33, 250]]}, {"delay": 100, "blit": [[0, 1564, 290, 13, 33, 250]]}, {"delay": 101, "blit": [[290, 1551, 290, 13, 33, 250]]}, {"delay": 4000, "blit": [[0, 1551, 290, 13, 33, 250]]}],
			"width": 600,
			"height": 400
		},

		"edit-element-name": {
			timeline: [{"delay": 100, "blit": [[0, 0, 600, 200, 0, 0]]}, {"delay": 102, "blit": [[567, 264, 18, 18, 65, 85]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[519, 236, 48, 48, 55, 72]]}, {"delay": 101, "blit": [[0, 200, 261, 48, 3, 72]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[261, 236, 258, 13, 6, 101]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[3, 229, 258, 13, 6, 101]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[77, 270, 74, 22, 70, 86]]}, {"delay": 101, "blit": [[484, 271, 28, 10, 102, 88]]}, {"delay": 99, "blit": [[484, 284, 60, 22, 70, 86]]}, {"delay": 100, "blit": [[269, 293, 49, 22, 88, 86]]}, {"delay": 101, "blit": [[277, 276, 14, 7, 130, 91]]}, {"delay": 100, "blit": [[56, 292, 56, 22, 95, 86]]}, {"delay": 100, "blit": [[112, 292, 55, 22, 102, 86], [585, 264, 14, 9, 158, 88]]}, {"delay": 101, "blit": [[567, 242, 28, 22, 109, 86], [354, 293, 49, 10, 137, 88]]}, {"delay": 99, "blit": []}, {"delay": 102, "blit": [[567, 220, 28, 22, 116, 86], [155, 250, 56, 10, 144, 88]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[137, 73, 1, 14, 123, 87]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[130, 248, 130, 22, 70, 86]]}, {"delay": 100, "blit": [[134, 216, 56, 10, 95, 88]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": [[318, 293, 36, 20, 73, 86]]}, {"delay": 101, "blit": [[167, 292, 53, 22, 70, 86]]}, {"delay": 101, "blit": [[63, 275, 14, 6, 116, 91]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[220, 293, 49, 22, 88, 86]]}, {"delay": 102, "blit": [[42, 295, 14, 8, 130, 89]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[137, 73, 1, 14, 95, 87]]}, {"delay": 102, "blit": [[0, 292, 56, 22, 95, 86]]}, {"delay": 101, "blit": [[291, 271, 70, 22, 102, 86]]}, {"delay": 100, "blit": [[221, 271, 70, 22, 109, 86]]}, {"delay": 100, "blit": [[387, 249, 84, 22, 116, 86]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[137, 73, 1, 14, 123, 87]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 248, 130, 22, 70, 86]]}, {"delay": 101, "blit": [[134, 216, 56, 10, 95, 88]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[564, 200, 36, 20, 73, 86]]}, {"delay": 100, "blit": [[424, 271, 60, 22, 70, 86]]}, {"delay": 100, "blit": [[544, 284, 56, 22, 88, 86]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[361, 271, 63, 22, 95, 86]]}, {"delay": 102, "blit": [[151, 270, 70, 22, 102, 86]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[0, 270, 77, 22, 109, 86]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[260, 249, 127, 22, 64, 86], [471, 249, 43, 22, 295, 175]]}, {"delay": 100, "blit": [[587, 85, 8, 21, 587, 68], [261, 200, 303, 36, 280, 138]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 200
		},

		"dom-breakpoint": {
			timeline: [{"delay": 102, "blit": [[0, 0, 600, 650, 0, 0]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[361, 2280, 231, 27, 184, 187], [0, 2551, 596, 1, 2, 302], [0, 2550, 596, 1, 2, 327], [0, 2451, 381, 26, 2, 344]]}, {"delay": 101, "blit": [[587, 1362, 12, 12, 269, 198]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[441, 1412, 56, 13, 198, 194]]}, {"delay": 100, "blit": [[278, 2499, 271, 22, 145, 626]]}, {"delay": 100, "blit": [[0, 1702, 581, 227, 2, 74], [441, 1425, 56, 10, 313, 345], [0, 2534, 238, 10, 68, 358], [587, 373, 8, 6, 587, 371], [243, 2062, 161, 53, 420, 419], [493, 432, 57, 10, 402, 432], [512, 1363, 75, 12, 421, 473], [404, 2062, 184, 33, 399, 485], [460, 431, 121, 13, 460, 518], [322, 1263, 57, 10, 402, 519], [403, 444, 170, 15, 403, 531], [421, 460, 142, 12, 421, 547], [440, 473, 132, 11, 440, 560], [421, 486, 131, 12, 421, 573], [403, 381, 85, 12, 403, 585], [399, 512, 184, 26, 399, 599]]}, {"delay": 100, "blit": [[543, 1375, 31, 27, 168, 187], [554, 1402, 30, 27, 384, 187]]}, {"delay": 101, "blit": [[524, 1402, 30, 27, 159, 187], [537, 1336, 48, 27, 375, 187]]}, {"delay": 101, "blit": [[562, 1309, 34, 27, 146, 187], [441, 1309, 73, 27, 362, 187]]}, {"delay": 101, "blit": [[512, 1375, 31, 27, 136, 187], [441, 1228, 94, 27, 352, 187]]}, {"delay": 100, "blit": [[489, 1336, 48, 27, 130, 187], [441, 1174, 105, 27, 346, 187], [501, 1290, 20, 10, 180, 195]]}, {"delay": 101, "blit": [[0, 1475, 581, 227, 2, 74], [56, 2534, 56, 10, 313, 345], [66, 2465, 238, 10, 68, 358], [387, 613, 8, 6, 587, 371], [420, 419, 161, 53, 420, 419], [322, 1263, 57, 10, 402, 432], [341, 1304, 75, 12, 421, 473], [399, 485, 184, 33, 399, 485], [460, 518, 121, 13, 460, 518], [493, 432, 57, 10, 402, 519], [403, 531, 170, 15, 403, 531], [421, 547, 142, 12, 421, 547], [440, 560, 132, 11, 440, 560], [421, 573, 131, 12, 421, 573], [403, 585, 85, 12, 403, 585], [399, 599, 184, 26, 399, 599], [145, 626, 271, 22, 145, 626]]}, {"delay": 101, "blit": [[521, 1282, 76, 27, 133, 187], [441, 1201, 99, 27, 349, 187]]}, {"delay": 100, "blit": [[441, 1336, 48, 27, 139, 187], [441, 1255, 87, 27, 355, 187], [168, 1596, 33, 10, 189, 195]]}, {"delay": 102, "blit": [[514, 1309, 48, 27, 152, 187], [535, 1228, 62, 27, 368, 187], [168, 1596, 33, 10, 200, 195]]}, {"delay": 100, "blit": [[546, 1174, 48, 27, 163, 187], [473, 1363, 39, 27, 379, 187], [168, 1596, 33, 10, 211, 195]]}, {"delay": 101, "blit": [[441, 1282, 80, 27, 174, 187], [574, 1375, 25, 27, 390, 187]]}, {"delay": 102, "blit": [[361, 2222, 231, 31, 184, 185]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[198, 194, 1, 13, 198, 194]]}, {"delay": 102, "blit": [[0, 2521, 375, 13, 5, 330]]}, {"delay": 101, "blit": [[441, 1435, 18, 21, 397, 190], [381, 2446, 161, 25, 415, 207]]}, {"delay": 101, "blit": [[5, 330, 375, 13, 5, 330]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[162, 185, 14, 5, 162, 185], [243, 2191, 231, 31, 184, 185], [130, 211, 9, 5, 130, 211], [0, 2549, 596, 1, 2, 302], [0, 2548, 596, 1, 2, 327], [0, 2423, 381, 28, 2, 342]]}, {"delay": 100, "blit": [[86, 342, 12, 13, 86, 342]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 1929, 243, 312, 75, 333]]}, {"delay": 100, "blit": [[441, 1363, 32, 33, 75, 333]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[361, 2402, 213, 19, 92, 349]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[361, 2383, 213, 19, 92, 349], [361, 2364, 213, 19, 92, 399]]}, {"delay": 102, "blit": [[17, 1995, 213, 19, 92, 399], [361, 2345, 213, 19, 92, 449]]}, {"delay": 100, "blit": [[17, 2045, 213, 19, 92, 449], [361, 2326, 213, 19, 92, 487]]}, {"delay": 101, "blit": [[243, 2115, 213, 38, 92, 487]]}, {"delay": 102, "blit": [[17, 2102, 213, 19, 92, 506]]}, {"delay": 100, "blit": [[361, 2307, 213, 19, 92, 537]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[243, 1929, 230, 91, 292, 530]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[381, 2471, 204, 19, 305, 537]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[243, 2153, 204, 38, 305, 537]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[585, 1349, 12, 13, 349, 556]]}, {"delay": 102, "blit": [[287, 2172, 12, 13, 349, 556]]}, {"delay": 99, "blit": [[0, 1174, 441, 301, 80, 343]]}, {"delay": 101, "blit": [[79, 342, 443, 303, 79, 342]]}, {"delay": 101, "blit": [[497, 1412, 10, 50, 405, 446]]}, {"delay": 101, "blit": [[397, 190, 18, 21, 397, 190], [415, 207, 161, 25, 415, 207], [584, 1402, 10, 50, 405, 446]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[361, 2253, 231, 27, 184, 187], [0, 2547, 596, 1, 2, 302], [0, 2546, 596, 1, 2, 327], [0, 2451, 381, 26, 2, 344]]}, {"delay": 101, "blit": [[247, 196, 12, 13, 247, 196]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[441, 1412, 56, 13, 198, 194]]}, {"delay": 101, "blit": [[0, 2499, 278, 22, 196, 626]]}, {"delay": 101, "blit": [[0, 947, 596, 227, 2, 74], [528, 1255, 65, 24, 27, 303], [540, 1201, 57, 24, 223, 303], [0, 650, 596, 297, 2, 328], [0, 2477, 379, 22, 95, 626]]}, {"delay": 101, "blit": [[0, 2545, 596, 1, 2, 302], [0, 2544, 596, 1, 2, 327], [507, 1429, 48, 10, 495, 373], [441, 1402, 83, 10, 351, 510], [243, 2020, 272, 42, 323, 524], [321, 866, 260, 55, 323, 570]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[599, 663, 1, 13, 37, 467]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[585, 1336, 13, 13, 238, 334]]}, {"delay": 100, "blit": [[236, 656, 13, 13, 238, 334]]}, {"delay": 101, "blit": [[598, 663, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[597, 663, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": [[596, 663, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[555, 1429, 18, 21, 397, 190], [381, 2421, 161, 25, 415, 207], [0, 2241, 361, 182, 20, 466]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[597, 650, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 99, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[599, 650, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[597, 650, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[598, 650, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[597, 650, 1, 13, 37, 467]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 4000, "blit": [[596, 650, 1, 13, 37, 467]]}],
				"width": 600,
				"height": 650
			},

		"console-inspect": {
			timeline: [{"delay": 100, "blit": [[0, 0, 600, 200, 0, 0]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[598, 226, 1, 13, 26, 54]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[573, 482, 8, 13, 26, 54]]}, {"delay": 100, "blit": [[212, 469, 8, 13, 33, 54]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[204, 535, 81, 36, 25, 67]]}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[365, 540, 42, 13, 40, 54], [285, 540, 80, 34, 26, 68]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[447, 469, 81, 49, 25, 54]]}, {"delay": 100, "blit": []}, {"delay": 99, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[597, 226, 1, 13, 82, 54]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[588, 468, 7, 13, 83, 54]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[278, 469, 74, 66, 88, 54]]}, {"delay": 101, "blit": [[204, 469, 74, 66, 88, 54]]}, {"delay": 101, "blit": [[573, 482, 14, 13, 103, 54]]}, {"delay": 101, "blit": [[587, 429, 8, 13, 110, 54]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[0, 395, 587, 45, 12, 54]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[599, 213, 1, 13, 26, 86]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[598, 213, 1, 13, 26, 86]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[587, 390, 8, 13, 26, 86]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": [[534, 535, 39, 53, 25, 99]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[534, 469, 39, 66, 25, 86]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 350, 587, 45, 12, 86]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[597, 213, 1, 13, 26, 118]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[587, 416, 8, 13, 26, 118]]}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[587, 403, 8, 13, 33, 118]]}, {"delay": 101, "blit": [[102, 469, 102, 88, 25, 30]]}, {"delay": 101, "blit": [[0, 469, 102, 88, 25, 30], [407, 540, 34, 13, 40, 118]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[599, 200, 1, 13, 47, 118]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[352, 469, 95, 49, 25, 82]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 99, "blit": []}, {"delay": 102, "blit": [[598, 200, 1, 13, 75, 118]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[587, 455, 7, 13, 76, 118]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": [[587, 390, 8, 13, 82, 118]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[542, 469, 8, 13, 89, 118]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[597, 200, 1, 13, 96, 118]]}, {"delay": 102, "blit": [[587, 442, 7, 13, 97, 118]]}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[0, 440, 587, 29, 12, 118]]}, {"delay": 100, "blit": [[0, 200, 597, 150, 2, 25], [352, 518, 182, 22, 95, 176], [206, 176, 73, 22, 312, 176], [206, 176, 35, 22, 511, 176], [206, 176, 13, 22, 554, 176], [573, 469, 15, 13, 39, 181], [206, 183, 39, 10, 386, 183]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": [[587, 370, 10, 20, 287, 155]]}, {"delay": 102, "blit": [[587, 350, 10, 20, 287, 155]]}, {"delay": 100, "blit": []}, {"delay": 4000, "blit": []}],
			"width": 600,
			"height": 200
		},

    "right-click-inspect-element": {
      timeline: [{"delay": 101, "blit": [[0, 0, 600, 650, 0, 0]]}, {"delay": 101, "blit": [[319, 3408, 278, 286, 83, 140]]}, {"delay": 100, "blit": [[0, 5294, 252, 19, 96, 147]]}, {"delay": 101, "blit": [[332, 3415, 252, 19, 96, 147], [209, 5275, 252, 19, 96, 254]]}, {"delay": 102, "blit": [[332, 3522, 252, 19, 96, 254], [0, 5004, 252, 19, 96, 349]]}, {"delay": 101, "blit": [[332, 3617, 252, 19, 96, 349]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[304, 4215, 252, 19, 96, 380]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[509, 1207, 72, 38, 511, 252]]}, {"delay": 102, "blit": [[332, 3648, 252, 19, 96, 380]]}, {"delay": 100, "blit": [[304, 3978, 252, 260, 96, 143]]}, {"delay": 604, "blit": [[319, 3122, 278, 286, 83, 140]]}, {"delay": 101, "blit": [[0, 650, 596, 557, 2, 91]]}, {"delay": 102, "blit": [[0, 2905, 596, 217, 2, 74], [0, 3122, 319, 307, 2, 318], [304, 3694, 276, 284, 322, 341], [0, 5160, 409, 22, 95, 626]]}, {"delay": 101, "blit": [[237, 4494, 233, 217, 2, 74], [0, 4554, 199, 217, 399, 74], [556, 3978, 28, 44, 567, 358], [426, 5184, 157, 12, 326, 392], [308, 3831, 229, 13, 326, 404], [396, 3844, 138, 28, 414, 417], [478, 4251, 91, 12, 326, 418], [308, 3859, 88, 11, 326, 432], [304, 3873, 261, 32, 322, 446], [308, 3732, 152, 11, 326, 479], [469, 3906, 94, 12, 487, 479], [0, 5278, 192, 13, 389, 491], [239, 4065, 62, 12, 326, 492], [304, 5029, 236, 38, 326, 505], [0, 4954, 261, 50, 322, 544], [0, 5247, 209, 31, 326, 594], [556, 4022, 40, 29, 522, 596]]}, {"delay": 101, "blit": [[0, 5351, 199, 18, 399, 273], [3, 3126, 298, 249, 5, 318], [308, 3212, 8, 73, 310, 409], [68, 3375, 158, 27, 70, 567], [0, 3598, 304, 30, 2, 595]]}, {"delay": 100, "blit": [[0, 3736, 304, 307, 2, 318], [308, 3198, 8, 87, 310, 410]]}, {"delay": 101, "blit": [[0, 2688, 596, 217, 2, 74], [0, 3429, 304, 307, 2, 318], [308, 3201, 8, 84, 310, 425]]}, {"delay": 101, "blit": [[0, 1820, 1, 163, 2, 74], [0, 5096, 594, 25, 4, 74], [0, 4771, 594, 59, 4, 232], [32, 3342, 194, 4, 34, 318], [298, 5220, 298, 27, 5, 323], [32, 3375, 194, 12, 34, 351], [44, 3389, 249, 10, 46, 365], [44, 3597, 175, 11, 46, 378], [0, 3610, 304, 66, 2, 391], [308, 3185, 8, 100, 310, 437], [68, 3678, 158, 12, 70, 459], [343, 4859, 116, 25, 82, 473], [197, 3706, 83, 12, 199, 487], [0, 5029, 304, 67, 2, 500], [13, 4831, 250, 57, 46, 568]]}, {"delay": 101, "blit": [[0, 2471, 596, 217, 2, 74], [3, 3347, 298, 26, 5, 323]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[304, 3581, 12, 12, 129, 396]]}, {"delay": 100, "blit": [[127, 3615, 12, 12, 129, 396]]}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[304, 3569, 12, 12, 129, 396]]}, {"delay": 100, "blit": [[239, 4238, 239, 256, 122, 394]]}, {"delay": 102, "blit": [[304, 3557, 12, 12, 129, 396]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 5332, 213, 19, 135, 401]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 102, "blit": [[213, 5313, 213, 19, 135, 401]]}, {"delay": 101, "blit": [[0, 5313, 213, 19, 135, 432]]}, {"delay": 101, "blit": [[252, 4276, 213, 19, 135, 432]]}, {"delay": 100, "blit": [[252, 5294, 213, 19, 135, 463]]}, {"delay": 101, "blit": [[213, 5182, 213, 38, 135, 463]]}, {"delay": 100, "blit": [[0, 5182, 213, 38, 135, 482]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[298, 5121, 213, 38, 135, 501]]}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[304, 3545, 12, 12, 184, 521]]}, {"delay": 100, "blit": [[347, 5141, 12, 12, 184, 521]]}, {"delay": 102, "blit": [[0, 4299, 237, 255, 123, 395]]}, {"delay": 100, "blit": [[0, 4043, 239, 256, 122, 394]]}, {"delay": 101, "blit": [[0, 2254, 596, 217, 2, 74], [263, 4830, 304, 95, 2, 378], [199, 5358, 248, 12, 326, 392], [426, 5171, 158, 13, 397, 404], [478, 4263, 71, 12, 325, 405], [209, 5247, 226, 28, 326, 417], [409, 5159, 173, 12, 343, 446], [478, 4238, 106, 13, 326, 458], [239, 4077, 61, 12, 439, 459], [304, 3429, 8, 85, 310, 465], [304, 3885, 261, 20, 322, 471], [54, 5068, 99, 28, 56, 473], [470, 4494, 126, 12, 156, 487], [263, 4925, 255, 104, 326, 492], [0, 4830, 263, 124, 33, 501], [304, 5067, 261, 29, 322, 596], [239, 4043, 59, 22, 445, 626]]}, {"delay": 101, "blit": []}, {"delay": 100, "blit": [[0, 2037, 596, 217, 2, 74], [3, 5043, 298, 13, 5, 448], [0, 5121, 298, 39, 5, 504]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 100, "blit": []}, {"delay": 101, "blit": []}, {"delay": 101, "blit": [[0, 1820, 596, 217, 2, 74], [199, 4711, 298, 53, 5, 490]]}, {"delay": 99, "blit": [[241, 4778, 172, 18, 245, 239], [3, 4782, 237, 10, 7, 243], [0, 5220, 298, 27, 5, 476]]}, {"delay": 101, "blit": [[0, 2254, 596, 131, 2, 74], [0, 2416, 11, 55, 2, 236], [61, 2419, 277, 18, 63, 239], [25, 2423, 36, 10, 27, 243], [15, 2456, 581, 15, 17, 276], [213, 5345, 298, 13, 5, 350], [3, 5071, 298, 13, 5, 476]]}, {"delay": 101, "blit": [[0, 1603, 596, 217, 2, 74], [3, 3374, 298, 13, 5, 350]]}, {"delay": 101, "blit": []}, {"delay": 101, "blit": []}, {"delay": 100, "blit": []}, {"delay": 100, "blit": [[304, 3531, 14, 14, 7, 298]]}, {"delay": 101, "blit": []}, {"delay": 102, "blit": []}, {"delay": 101, "blit": [[304, 3514, 15, 17, 6, 298], [213, 5332, 304, 13, 2, 378]]}, {"delay": 100, "blit": [[586, 91, 9, 134, 586, 91], [0, 1207, 596, 396, 2, 252]]}, {"delay": 4000, "blit": []}],
      "width": 600,
      "height": 650
    }
	};

	global.animationData = animationData;

}(window));




(function(global) {

	var init = function() {
		global.prepareAnimations();
	};

	document.addEventListener("DOMContentLoaded", init, false);

}(window));
