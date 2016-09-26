


var context;
window.addEventListener('load', init, false);
function init() {
  try {
    // Fix up for prefixing
    (<any>window).AudioContext = (<any>window).AudioContext||(<any>window).webkitAudioContext;
    context = new AudioContext();
  }
  catch(e) {
    alert('Web Audio API is not supported in this browser');
  }
}
