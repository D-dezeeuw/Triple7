/* Triple7 — sprites.js
 * Optional painted-sprite skin (Phase 31). Preloads assets/sprites/<id>.png;
 * renderers ask get(id) each frame and fall back to their canvas painters
 * while an image is missing or still loading, so the game keeps working with
 * zero generated assets present (invariant 5: no runtime network required —
 * these are ordinary static files served with the page).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.T7 = root.T7 || {}, root.T7.sprites = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var IDS = [
    'strawberry', 'cherry', 'lemon', 'melon', 'berry', 'orange', 'plum', 'seven', 'star',
    'sun', 'sprout', 'sparkle', 'arrowup', 'lock', 'gear', 'jar', 'trophy', 'gem', 'bottle',
    'suncoin', 'coin7', 'coin21', 'coin49', 'droplet',
    // Glass Charm collectibles live in charms/<id>.png; ids never collide.
    'charms/lemondrop', 'charms/limewedge', 'charms/orangeslice', 'charms/grapefruit',
    'charms/yuzu', 'charms/citron', 'charms/tangerine',
    'charms/cherrytwin', 'charms/strawheart', 'charms/bluepearl', 'charms/raspcluster',
    'charms/blacknight', 'charms/cranbead', 'charms/elderstar',
    'charms/pinecrown', 'charms/mangosunset', 'charms/cocomoon', 'charms/papayadawn',
    'charms/kiwieye', 'charms/dragonflame', 'charms/passionswirl',
    'charms/sunprism', 'charms/moonmelon', 'charms/starseed', 'charms/cometgrape',
    'charms/aurorapeach', 'charms/nebulaplum', 'charms/galaxyfig'
  ];
  var ready = {};

  if (typeof document !== 'undefined') {
    IDS.forEach(function (id) {
      var img = new Image();
      img.onload = function () { ready[id] = img; };
      img.src = 'assets/sprites/' + id + '.png';
    });
  }

  return {
    get: function (id) { return ready[id] || null; }
  };
});
