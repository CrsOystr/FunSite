/// <reference path="typings/threejs/three.d.ts"/>

class BeatBox{
  isActive: boolean = false;
  mesh: any;
  constructor(x: number, y: number){
    this.mesh = new THREE.Mesh( geometry,new THREE.MeshLambertMaterial( { color: 0xff0fff, shading: THREE.SmoothShading }  ));
    this.mesh.position.y = y;
    this.mesh.position.x = x;
    scene.add(this.mesh);
  }
  rotate(delta: number){
    this.mesh.rotation.x += 0.5 * delta;
    this.mesh.rotation.y += 0.5 * delta;
  }
  toggleActive(){
    if(this.isActive){
      this.isActive = false;
      this.mesh.material.color.set( 0xff0fff );
    }else{
      this.isActive = true;
      this.mesh.material.color.set( 0x999999 );
    }
  }
  play(){
    if(this.isActive){
      this.mesh.material.emissive.setHex(0x006600);
    }else{
      this.mesh.material.emissive.setHex(0x002200);
    }
  }
  unplay(){
    this.mesh.material.emissive.setHex(0x000000);
  }
}

class Kick{
  osc: any;
  gain: any;
  constructor(){
  }
  setup(){
    this.osc = audioContext.createOscillator();
    this.gain = audioContext.createGain();
    this.osc.connect(this.gain);
	   this.gain.connect(audioContext.destination);
  }
  play(startTime: number, endTime: number){
    this.setup();

    this.osc.frequency.setValueAtTime(150, startTime);
    this.gain.gain.setValueAtTime(1, startTime);

    this.osc.frequency.exponentialRampToValueAtTime(0.01, endTime);
    this.gain.gain.exponentialRampToValueAtTime(0.01, endTime);

    this.osc.start(startTime);
    this.osc.stop(endTime);
  }
}


class Snare{
  osc: any;
  noise: any;
  noiseEnvelope: any;
  oscEnvelope: any;
  constructor(){
  }
  noiseBuffer(){
    var bufferSize = audioContext.sampleRate;
  	var buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  	var output = buffer.getChannelData(0);

  	for (var i = 0; i < bufferSize; i++) {
  		output[i] = Math.random() * 2 - 1;
  	}
    return buffer;
  }
  setup(){
    this.noise = audioContext.createBufferSource();
    this.noise.buffer = this.noiseBuffer();
    var noiseFilter = audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    this.noise.connect(noiseFilter);

    this.noiseEnvelope = audioContext.createGain();
    noiseFilter.connect(this.noiseEnvelope);

    this.noiseEnvelope.connect(audioContext.destination);

    this.osc = audioContext.createOscillator();
    this.osc.type = 'triangle';

    this.oscEnvelope = audioContext.createGain();
    this.osc.connect(this.oscEnvelope);
    this.oscEnvelope.connect(audioContext.destination);
  }
  play(startTime: number, endTime: number){
    this.setup();

    this.noiseEnvelope.gain.setValueAtTime(.5, startTime);
  	this.noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
  	this.noise.start(startTime)

  	this.osc.frequency.setValueAtTime(100, startTime);
  	this.oscEnvelope.gain.setValueAtTime(0.3, startTime);
  	this.oscEnvelope.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
  	this.osc.start(startTime)

  	this.osc.stop(startTime + 0.2);
  	this.noise.stop(startTime + 0.2);
  }
}
var kick = new Kick();
var snare = new Snare();
//THREEjs variables
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 50, window.innerWidth/window.innerHeight, 0.1, 1000 );
var renderer = new THREE.WebGLRenderer();
var clock = new THREE.Clock();
var delta;

//THREEjs OBJECTS
var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var light = new THREE.AmbientLight( 0x404040 ); // soft white light
var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );

//WebAudio Variables
var audioContext = null;
var isPlaying = false;      // Are we currently playing?
var startTime;              // The start time of the entire sequence.
var currentNote;        // What note is currently last scheduled?
var tempoCurrent = 100.0;          // tempo (in beats per minute)
var lookahead = 25.0;
var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
var nextNoteTime = 0.0;     // when the next note is due.
var noteLength = 0.5;      // length of "beep" (in seconds)
var lastNoteDrawn = -1; // the last "box" we drew on the screen
var notesInQueue = [];      // the notes that have been put into the web audio,
var timerWorker = null;     // The Web Worker used to fire timer messages

//handle mouse raycasting
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var intersected;

//nics added variables
var columns: number = 8;
var rows: number = 2;
var beatboxes: BeatBox[][] = [];

function nextNote() {
    // Advance current note and time by a 16th note...
    var secondsPerBeat = 60.0 / tempoCurrent;    // Notice this picks up the CURRENT
    nextNoteTime += secondsPerBeat;    // Add beat length to last beat time
    currentNote++;    // Advance the beat number, wrap to zero
    if (currentNote == columns) {
        currentNote = 0;
    }
    console.log(currentNote);
}

function scheduleNote( beatNumber, time ) {
    // push the note on the queue, even if we're not playing.
    notesInQueue.push( { note: beatNumber, time: time } );
    // create an oscillator
    var osc = audioContext.createOscillator();
    var gainNode = audioContext.createGain();
    osc.connect( gainNode );
    gainNode.connect( audioContext.destination );

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + noteLength);

    if (beatboxes[1][beatNumber].isActive){
      snare.play(time, time + noteLength);
    }
    if(beatboxes[0][beatNumber].isActive){
      kick.play(time, time + noteLength);
    }
    //osc.start( time );
    //osc.stop( time + noteLength );
}

function scheduler() {
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
        scheduleNote( currentNote, nextNoteTime );
        nextNote();
    }
}

function play() {
    isPlaying = !isPlaying;
    if (isPlaying) { // start playing
        currentNote = 0;
        nextNoteTime = audioContext.currentTime;
        timerWorker.postMessage("start");
        return "stop";
    } else {
        timerWorker.postMessage("stop");
        return "play";
    }
}

var render = function () {
  delta = clock.getDelta();
  //console.log("delta: " + delta);
  requestAnimationFrame( render );

  var currentNote = lastNoteDrawn;
  var currentTime = audioContext.currentTime;

  while (notesInQueue.length && notesInQueue[0].time < currentTime) {
      currentNote = notesInQueue[0].note;
      notesInQueue.splice(0,1);   // remove note from queue
  }
  if (lastNoteDrawn != currentNote) {
    lastNoteDrawn = currentNote;
}

  for (let i = 0; i<rows; i++){
    for (let j = 0; j<columns; j++){
      beatboxes[i][j].rotate(delta);
      if (j == currentNote){
        beatboxes[i][j].play();
      }else{
        beatboxes[i][j].unplay();
      }
    }
  }
  raycaster.setFromCamera( mouse, camera );
  var intersects: any = raycaster.intersectObjects( scene.children );
  if (intersects.length > 0){
    if(intersected != intersects[0].object){
      if (intersected){
        intersected.material.emissive.setHex(intersected.currentHex);
      }
      intersected = intersects[0].object;
      intersected.currentHex = intersected.material.emissive.getHex();
      intersected.material.emissive.setHex(0xff0000);
    }
  }else{
    if (intersected){
      intersected.material.emissive.setHex(intersected.currentHex);
    }
    intersected = null;
  }
  renderer.render(scene, camera);
};

function onMouseUp( event ) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
  raycaster.setFromCamera( mouse, camera );
  var intersect: any = raycaster.intersectObjects( scene.children );
  if (intersect.length > 0){
    beatboxes[Math.round(intersect[0].object.position.y/2)][Math.round(((intersect[0].object.position.x + columns)/2)-1)].toggleActive();
  }
}

function onMouseMove( event ) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function initialize(){
  console.log("LOADED");
  //webaudio init
  audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();

  //threejs init
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );
  scene.add( light );
  directionalLight.position.set( 0, 1, 0 );
  scene.add( directionalLight );
  camera.position.z = 20;

  //boxes init
  for (let i = 0; i<rows; i++){
    beatboxes[i] = [];
    for (let j = 0; j<columns; j++){
      beatboxes[i][j] = new BeatBox(j*2-columns+1, 2*i);
      if (j%2 == 0 && i ==1) beatboxes[i][j].toggleActive();
      if( i == 0) beatboxes[i][j].toggleActive();
    }
  }

  //setup for the timer worker.
  timerWorker = new Worker("scripts/metronomeworker.js");
  timerWorker.onmessage = function(e) {
    if (e.data == "tick") {
      scheduler();
    }
    else
      console.log("message: " + e.data);
  };
  timerWorker.postMessage({"interval":lookahead});

  render();
}

function startButton(){
    kick.play(0, noteLength);
    play();
    document.getElementById('startButton').style.visibility = 'hidden';
}
//handle adding of event listeners
window.addEventListener( 'mousemove', onMouseMove, false );
window.addEventListener( 'mouseup', onMouseUp);
window.addEventListener( 'touchend', onMouseUp);
window.addEventListener( 'load', initialize );
