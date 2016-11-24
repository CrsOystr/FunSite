/// <reference path="typings/jquery.d.ts"/>

$(function () {
    console.log('ready!');
    window.requestAnimationFrame(loop)
});

$(document).click(function (e) {
  bubbles.unshift(new Bubble(e.pageX, e.pageY));
});

class Bubble {
  x: number;
  y: number;
  age: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.age = 0;
  }
  ageMe(){
      this.age++;
  }
}

class Runner {
  x: number;
  y: number;
  age: number;
  direction: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.changeDirection();
  }
  run(progress: number){
    if (this.direction == 1 || this.direction == 4){
      this.x += progress/25;
    }else{
      this.x -= progress/25;
    }
    if (this.direction == 1 || this.direction == 2){
      this.y += progress/25;
    } else {
      this.y -= progress/25;
    }
    if (Math.floor(this.x%50) == 49){
      this.changeDirection();
    }
  }
  changeDirection(){
    this.direction = Math.floor(Math.random() * (4 - 1 + 1)) + 1;
  }
}

var lastRender = 0
var bubbles: Bubble[] = [];
var runners: Runner[] = [];
var canvas = <HTMLCanvasElement>document.getElementById("canvas")
var ctx = <CanvasRenderingContext2D>canvas.getContext("2d")
ctx.fillStyle = "red"
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var spawn = 0;

function update1(progress) {
  spawn += progress;
  if(spawn > 30){
    spawn = 0;
    for (var i = 0; (i <(canvas.width-(canvas.width%200)/200));i++){
      runners.unshift(new Runner(200*i,(canvas.height - canvas.height%100)/2));
    }
  }
  for (var i=0;i<bubbles.length;i++) {
    bubbles[i].ageMe();
    if (bubbles[i].age > 55){
      bubbles.splice(i,1);
    }
  }
  for (var i=0;i<runners.length;i++) {
    runners[i].run(progress);
    if (runners[i].x > canvas.width || runners[i].x < 0
    || runners[i].y > canvas.height || runners[i].y < 0){
      runners.splice(i,1);
    }
  }
}

function draw() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  let floorw = canvas.width + (50 - canvas.width%50);
  let floorh = canvas.height + (50 - canvas.height%50)
  let numbx = (floorw)/50;
  let numby = (floorh)/50;
  ctx.strokeStyle= 'rgba(200,160,200,.7)';
  for (var i=0;i<numbx;i++) {
    ctx.beginPath();
    ctx.moveTo(i*50,0);
    ctx.lineTo(floorh+ i*50,floorh);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i*50, 0);
    ctx.lineTo(0,i*50);
    ctx.stroke();
  }
  for (var i=0;i<numby;i++) {
    ctx.beginPath();
    ctx.moveTo(0, floorw + i*50);
    ctx.lineTo(floorw,i*50);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0,50 +i*50);
    ctx.lineTo(floorh,floorh + 50 + i*50);
    ctx.stroke();
  }

  for (var i=bubbles.length-1;i>=0;i--) {
    ctx.beginPath();
    ctx.arc(bubbles[i].x, bubbles[i].y, bubbles[i].age * .5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(240,' +
                     Math.floor((bubbles[i].x % 255)-bubbles[i].age * 2) + ',  240, '+ (.8-bubbles[i].age/50) + ')';
    ctx.fill();
  }
  for (var i=runners.length-1;i>=0;i--) {
    ctx.beginPath();
    ctx.arc(runners[i].x, runners[i].y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255,230,255, 1)';
    ctx.fill();
  }
}

function loop(timestamp) {
  var progress = timestamp - lastRender
  update(progress)
  draw()
  lastRender = timestamp
  window.requestAnimationFrame(loop)
}
