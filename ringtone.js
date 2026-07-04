/* ============================================================
   CENSA — Sonnerie d'appel (synthétisée, Web Audio API)
   ------------------------------------------------------------
   Petit carillon à 3 notes (do-mi-sol aigus), signature sonore
   CENSA, joué en boucle pendant qu'un appel sonne :
     · côté appelant   → tonalité de retour d'appel ("ça sonne…")
     · côté destinataire → sonnerie d'appel entrant
   Aucun fichier audio externe : tout est généré en direct, donc
   aucun souci de droits et ça marche hors-ligne.
   ============================================================ */
(function () {
  'use strict';
  var ctx = null;
  var timer = null;

  function getCtx() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    return ctx;
  }

  function tone(ac, freq, at, dur, peak) {
    var osc = ac.createOscillator();
    var gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.02);
    gain.gain.linearRampToValueAtTime(peak * 0.7, at + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, at + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(at);
    osc.stop(at + dur + 0.03);
  }

  // Motif CENSA : do-mi-sol (arpège ascendant), joué deux fois par « ring ».
  function chime(ac, t0) {
    var notes = [1046.5, 1318.5, 1568.0]; // C6, E6, G6
    for (var i = 0; i < notes.length; i++) tone(ac, notes[i], t0 + i * 0.1, 0.2, 0.09);
  }

  function burst() {
    var ac = getCtx();
    if (!ac) return;
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    var now = ac.currentTime + 0.03;
    chime(ac, now);
    chime(ac, now + 0.38);
  }

  function start() {
    stop();
    burst();
    timer = setInterval(burst, 3200);
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  window.CENSA_RINGTONE = {
    start: start,   // sonnerie entrante OU tonalité de retour d'appel
    stop: stop,
  };
})();
