var Canvas = require('drawille');
var line = require('bresenham');

var size = require('window-size');

var width = Math.floor(size.width / 2) * 4;
var height = Math.floor((size.height) / 16) * 24;


var c = new Canvas(width, height);

var i = 0;

String.prototype.repeat = function( num )
{
    return new Array( num + 1 ).join( this );
}

var drawHeader = function(left, right) {
  console.log(left + ' '.repeat(size.width - (left.length + right.length)) + right);
}


var os  = require('os-utils');

var currentCpuUsage = 0;
setInterval(function() {
  os.cpuUsage(function(v){
    currentCpuUsage = Math.floor(v * 100);
  });
}, 1000);



function draw() {
  c.clear();
  c.set(1, 1);
  c.set(1, 2);
  c.set(1, 3);

  for (y = 1; y < height; y ++) {
    c.set(1, y);
    c.set(width - 1, y);
  }

  for (x = 1; x < width; x ++) {
    c.set(x, 1);
    c.set(x, height - 1);
  }

  setTimeout(draw, 50);

  for (var i = 0; i < 5; i ++) {
    console.log('');
  }
  console.log('Parastats v0.0.1');

  drawHeader('Network', '10%');
  console.log(c.frame());

  drawHeader('CPU', currentCpuUsage + '%');
  console.log(c.frame());

  drawHeader('Memory', '6%');
  console.log(c.frame());

}

draw();
