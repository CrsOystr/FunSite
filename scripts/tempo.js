var context;
var bufferLoader;
var bufList;
var eighthNoteTime = 0.42857142857;
var tempoList = [];
window.onload = init;
function init() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
        bufferLoader = new BufferLoader(context, [
            'sounds/808-Clap.wav',
            'sounds/808-Kicks.wav',
            'sounds/808-Snare.wav',
        ], finishedLoading);
        bufferLoader.load();
    }
    catch (e) {
        alert('broke ' + e);
    }
}
function tempo() {
    tempoList.push(performance.now());
    if (tempoList.length >= 2) {
        var newTempo = 0;
        for (var i = 0; i < tempoList.length - 1; i++) {
            newTempo = newTempo + (tempoList[i + 1] - tempoList[i]);
        }
        newTempo = newTempo / (tempoList.length - 1);
        var elem = document.getElementById('tempo');
        elem.innerText = 'Tempo: ' + 60000 / newTempo;
        eighthNoteTime = newTempo / 1000;
        if (tempoList[tempoList.length - 1] - tempoList[tempoList.length - 2] > 2000) {
            tempoList = [];
            elem.innerText = 'Tap to set tempo';
        }
    }
}
function playpause() {
    var elem = document.getElementById('dummy');
    elem.innerText = "Sick";
    for (var bar = 0; bar < 2; bar++) {
        var time = context.currentTime + bar * 8 * eighthNoteTime;
        playSound(bufList[0], time);
        playSound(bufList[0], time + 2 * eighthNoteTime);
        playSound(bufList[0], time + 4 * eighthNoteTime);
        playSound(bufList[0], time + 6 * eighthNoteTime);
        for (var i = 0; i < 8; ++i) {
            playSound(bufList[1], time + i * eighthNoteTime);
        }
        playSound(bufList[3], time + 2.1 * eighthNoteTime);
        playSound(bufList[3], time + 6 * eighthNoteTime);
    }
}
function finishedLoading(bufferList) {
    bufList = bufferList;
}
function playSound(buffer, time) {
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(time);
}
function BufferLoader(context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = new Array();
    this.loadCount = 0;
}
BufferLoader.prototype.loadBuffer = function (url, index) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";
    var loader = this;
    request.onload = function () {
        loader.context.decodeAudioData(request.response, function (buffer) {
            if (!buffer) {
                alert('error decoding file data: ' + url);
                return;
            }
            loader.bufferList[index] = buffer;
            if (++loader.loadCount == loader.urlList.length)
                loader.onload(loader.bufferList);
        }, function (error) {
            console.error('decodeAudioData error', error);
        });
    };
    request.onerror = function () {
        alert('BufferLoader: XHR error');
    };
    request.send();
};
BufferLoader.prototype.load = function () {
    for (var i = 0; i < this.urlList.length; ++i)
        this.loadBuffer(this.urlList[i], i);
};
