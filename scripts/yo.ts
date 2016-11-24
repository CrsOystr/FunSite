/// <reference path="typings/jquery.d.ts"/>

//start things here
$(function () {
    console.log('ready!');
    window.requestAnimationFrame(loop)
});

$(document).click(function (e) {
  bubbles.unshift(new Bubble(e.pageX, e.pageY));
});


//classes go below this
class Noder {
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  age: number;
  constructor(x: number, y: number, xVel: number, yVel: number) {
    this.x = x;
    this.y = y;
    this.xVel = xVel;
    this.yVel = yVel;
    this.age = 0;
  }
  ageMe(progress: number){
      this.age += progress;
      this.x += this.xVel * progress * .01;
      this.y += this.yVel * progress * .01;
  }
}

var lastRender = 0
var spawnTime = 50;
var spawnTimer = 0;
var stickLength = 100;
var noders: Noder[] = [];

var canvas = <HTMLCanvasElement>document.getElementById("canvas")
var ctx =(canvas).getContext("2d")
ctx.fillStyle = "red"
canvas.width = (window.innerWidth);
canvas.height = (window.innerHeight);

function update(progress) {
  spawnTimer += progress;
  while (spawnTimer > spawnTime){
    spawnTimer -= spawnTime;
    switch(Math.floor((Math.random() * 4) + 1)){
      case 1:
          noders.unshift(new Noder(0,Math.floor((Math.random() * (window.innerHeight-50)) + 50),(Math.random()*2 + 9),Math.random()*4 - 2));
          break;
      case 2:
          noders.unshift(new Noder(window.innerWidth,Math.floor((Math.random() * (window.innerHeight-50)) + 50),-(Math.random()*2 + 9),Math.random()*4 - 2));
          break;
      case 3:
          noders.unshift(new Noder(Math.floor((Math.random() * (window.innerWidth-50)) + 50),0,Math.random()*4 - 2,(Math.random()*2 + 9)));
          break;
      case 4:
          noders.unshift(new Noder(Math.floor((Math.random() * (window.innerWidth-50)) + 50),window.innerHeight,Math.random()*4 - 2,-(Math.random()*2 + 9)));
          break;
      }
  }
  for (var i=0;i<noders.length;i++) {
    noders[i].ageMe(progress);
  }
}

function draw1() {
  canvas.width = (window.innerWidth);
  canvas.height = (window.innerHeight);
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "red"

  //Nodes
  for (var i=noders.length-1;i>=0;i--) {
    ctx.beginPath();
    ctx.arc(noders[i].x, noders[i].y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(' + Math.floor((noders[i].x % 255)) + ',' +
                     Math.floor((noders[i].x % 255)) + ', 0, '+noders[i].age+ ')';
    ctx.fill();
    for (var j=i-1;j>=0;j--) {
        if (Math.sqrt(Math.pow(noders[i].x-noders[j].x, 2) + Math.pow(noders[i].y-noders[j].y, 2)) < stickLength){
          ctx.beginPath();
          ctx.moveTo(noders[i].x,noders[i].y);
          ctx.lineTo(noders[j].x,noders[j].y);
          ctx.stroke();
        }
      }
  }
}

function loop(timestamp) {
  var progress = timestamp - lastRender
  update(progress)
  draw1()
  lastRender = timestamp
  window.requestAnimationFrame(loop)
}
