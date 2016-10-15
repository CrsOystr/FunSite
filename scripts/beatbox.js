var BeatBox = (function () {
    function BeatBox(x, y) {
        this.isActive = false;
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xff0fff, shading: THREE.SmoothShading }));
        this.mesh.position.y = y;
        this.mesh.position.x = x;
        scene.add(this.mesh);
    }
    BeatBox.prototype.rotate = function (delta) {
        this.mesh.rotation.x += 0.5 * delta;
        this.mesh.rotation.y += 0.5 * delta;
    };
    BeatBox.prototype.toggleActive = function () {
        if (this.isActive) {
            this.isActive = false;
            this.mesh.material.color.set(0xff0fff);
        }
        else {
            this.isActive = true;
            this.mesh.material.color.set(0x999999);
        }
    };
    BeatBox.prototype.play = function () {
        if (this.isActive) {
            this.mesh.material.emissive.setHex(0x006600);
        }
        else {
            this.mesh.material.emissive.setHex(0x002200);
        }
    };
    BeatBox.prototype.unplay = function () {
        this.mesh.material.emissive.setHex(0x000000);
    };
    return BeatBox;
}());
var Kick = (function () {
    function Kick() {
    }
    Kick.prototype.setup = function () {
        this.osc = audioContext.createOscillator();
        this.gain = audioContext.createGain();
        this.osc.connect(this.gain);
        this.gain.connect(audioContext.destination);
    };
    Kick.prototype.play = function (startTime, endTime) {
        this.setup();
        this.osc.frequency.setValueAtTime(150, startTime);
        this.gain.gain.setValueAtTime(1, startTime);
        this.osc.frequency.exponentialRampToValueAtTime(0.01, endTime);
        this.gain.gain.exponentialRampToValueAtTime(0.01, endTime);
        this.osc.start(startTime);
        this.osc.stop(endTime);
    };
    return Kick;
}());
var Snare = (function () {
    function Snare() {
    }
    Snare.prototype.noiseBuffer = function () {
        var bufferSize = audioContext.sampleRate;
        var buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        var output = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    };
    Snare.prototype.setup = function () {
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
    };
    Snare.prototype.play = function (startTime, endTime) {
        this.setup();
        this.noiseEnvelope.gain.setValueAtTime(.5, startTime);
        this.noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
        this.noise.start(startTime);
        this.osc.frequency.setValueAtTime(100, startTime);
        this.oscEnvelope.gain.setValueAtTime(0.3, startTime);
        this.oscEnvelope.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
        this.osc.start(startTime);
        this.osc.stop(startTime + 0.2);
        this.noise.stop(startTime + 0.2);
    };
    return Snare;
}());
var kick = new Kick();
var snare = new Snare();
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
var clock = new THREE.Clock();
var delta;
var geometry = new THREE.BoxGeometry(1, 1, 1);
var light = new THREE.AmbientLight(0x404040);
var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
var audioContext = null;
var isPlaying = false;
var startTime;
var currentNote;
var tempoCurrent = 100.0;
var lookahead = 25.0;
var scheduleAheadTime = 0.1;
var nextNoteTime = 0.0;
var noteLength = 0.5;
var lastNoteDrawn = -1;
var notesInQueue = [];
var timerWorker = null;
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var intersected;
var columns = 8;
var rows = 2;
var beatboxes = [];
function nextNote() {
    var secondsPerBeat = 60.0 / tempoCurrent;
    nextNoteTime += secondsPerBeat;
    currentNote++;
    if (currentNote == columns) {
        currentNote = 0;
    }
    console.log(currentNote);
}
function scheduleNote(beatNumber, time) {
    notesInQueue.push({ note: beatNumber, time: time });
    var osc = audioContext.createOscillator();
    var gainNode = audioContext.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + noteLength);
    if (beatboxes[1][beatNumber].isActive) {
        snare.play(time, time + noteLength);
    }
    if (beatboxes[0][beatNumber].isActive) {
        kick.play(time, time + noteLength);
    }
}
function scheduler() {
    while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
        scheduleNote(currentNote, nextNoteTime);
        nextNote();
    }
}
function play() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        currentNote = 0;
        nextNoteTime = audioContext.currentTime;
        timerWorker.postMessage("start");
        return "stop";
    }
    else {
        timerWorker.postMessage("stop");
        return "play";
    }
}
var render = function () {
    delta = clock.getDelta();
    requestAnimationFrame(render);
    var currentNote = lastNoteDrawn;
    var currentTime = audioContext.currentTime;
    while (notesInQueue.length && notesInQueue[0].time < currentTime) {
        currentNote = notesInQueue[0].note;
        notesInQueue.splice(0, 1);
    }
    if (lastNoteDrawn != currentNote) {
        lastNoteDrawn = currentNote;
    }
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < columns; j++) {
            beatboxes[i][j].rotate(delta);
            if (j == currentNote) {
                beatboxes[i][j].play();
            }
            else {
                beatboxes[i][j].unplay();
            }
        }
    }
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        if (intersected != intersects[0].object) {
            if (intersected) {
                intersected.material.emissive.setHex(intersected.currentHex);
            }
            intersected = intersects[0].object;
            intersected.currentHex = intersected.material.emissive.getHex();
            intersected.material.emissive.setHex(0xff0000);
        }
    }
    else {
        if (intersected) {
            intersected.material.emissive.setHex(intersected.currentHex);
        }
        intersected = null;
    }
    renderer.render(scene, camera);
};
function onMouseUp(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var intersect = raycaster.intersectObjects(scene.children);
    if (intersect.length > 0) {
        beatboxes[Math.round(intersect[0].object.position.y / 2)][Math.round(((intersect[0].object.position.x + columns) / 2) - 1)].toggleActive();
    }
}
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
function initialize() {
    console.log("LOADED");
    audioContext = new AudioContext();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    scene.add(light);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);
    camera.position.z = 20;
    for (var i = 0; i < rows; i++) {
        beatboxes[i] = [];
        for (var j = 0; j < columns; j++) {
            beatboxes[i][j] = new BeatBox(j * 2 - columns + 1, 2 * i);
            if (j % 2 == 0 && i == 1)
                beatboxes[i][j].toggleActive();
            if (i == 0)
                beatboxes[i][j].toggleActive();
        }
    }
    timerWorker = new Worker("scripts/metronomeworker.js");
    timerWorker.onmessage = function (e) {
        if (e.data == "tick") {
            scheduler();
        }
        else
            console.log("message: " + e.data);
    };
    timerWorker.postMessage({ "interval": lookahead });
    render();
    play();
}
window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mouseup', onMouseUp);
window.addEventListener("load", initialize);
