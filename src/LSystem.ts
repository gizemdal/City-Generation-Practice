import {vec2, vec3, mat4, mat3, vec4} from 'gl-matrix';
import {dot, length, angle, normalize, rotateZ} from 'gl-vec3';
import {transformMat4} from 'gl-vec4';
import {setAxisAngle} from 'gl-quat';
import {rotateY, scale} from 'gl-mat4';
import ExpansionRule from './ExpansionRule';
import DrawingRule from './DrawingRule';
import Turtle from './Turtle';
import Edge from './Edge';

let expansionRules : Map<string, [ExpansionRule]> = new Map(); // store expansion rules
let drawRules : Map<string, [DrawingRule]> = new Map(); // store drawing rules
let turtleQueue: Array<Turtle> = []; // queue for turtles
let turtleGridQueue: Array<Turtle> = []; // queue for turtles that will generate grids
let up: vec3 = vec3.fromValues(0.0, 0.0, 1.0); // global up vector (along z because we're drawing in xz plane)
let matrices: Array<mat4> = []; // transformations for instanced rendering
let shoreAmp: number = 0.05;
let seed: vec3 = vec3.fromValues(0.1, 0.05, 0.4);
let edges: Array<Edge> = []; // store edges
let intersections: Array<vec3> = []; // store intersection points
let fac: number = 15.0; // move forward factor
let startPos: vec3 = vec3.fromValues(0.0, 3.0, 0.0); // starting position
let isStart: boolean = false; // set to true if random start position is generated already
let ht: number = 1.0; // height of roads

let buildings: Array<vec2> = []; // randomly generated points for building locations in the 2D grid
let buildingMatrices: Array<mat4> = []; // building transformations
let buildingIdxs: Array<number> = []; // index for picked building meshes
let citySeed: number = 23; // global city seed for hashing

let raster2D: Array<Array<boolean>> = []; // 2D validity grid
let rasterX: number = 199;
let rasterZ: number = 199;

function initializeRaster2D() {
  for (var i = 0; i < 400; i++) {
    raster2D[i] = [];
    for (var j = 0; j < 400; j++) {
      raster2D[i][j] = true; // this grid is not occupied
    }
  }
}

function sameVector(v1: vec2, v2: vec2) {
  if ((v1[0] == v2[0]) && (v1[1] == v2[1])) {
    return true;
  } else {
    return false;
  }
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * Math.floor(max));
}

function random2(p: vec2) {
    var start = vec2.fromValues(Math.sin(p[0] * 127.1 + p[1] * 311.7)* 43758.5453, Math.sin(p[0] * 269.5 + p[1] * 183.3)* 43758.5453);
    var ret = vec2.fromValues(Math.floor(start[0]), Math.floor(start[1]));
    return vec2.fromValues(start[0] - ret[0], start[1] - ret[1]);
}

function random1(p: vec2, seed: vec2) {
  var vec = vec2.fromValues(p[0]+seed[0], p[1]+seed[1]);
  var dotProduct = (vec[0] * 127.1 + vec[1] * 311.7) * 43758.5453;
  return dotProduct - Math.floor(dotProduct);
}

function interpNoise2D(x: number, y: number) {
  var intX = Math.floor(x);
  var fractX = x - Math.floor(x);
  var intY = Math.floor(y);
  var fractY = y - Math.floor(y);

  var v1 = random1(vec2.fromValues(intX, intY), vec2.fromValues(seed[0], seed[1]));
  var v2 = random1(vec2.fromValues(intX + 1.0, intY), vec2.fromValues(seed[0], seed[1]));
  var v3 = random1(vec2.fromValues(intX, intY + 1.0), vec2.fromValues(seed[0], seed[1]));
  var v4 = random1(vec2.fromValues(intX + 1.0, intY + 1.0), vec2.fromValues(seed[0], seed[1]));
  var i1 = v1 * (1.0 - fractX) + v2 * fractX;
  var i2 = v3 * (1.0 - fractX) + v4 * fractX;
  return i1 * (1 - fractY) + i2 * fractY;
}

function fbm(x: number, y: number, octaves: number) {
  var total = 0.0;
  var persistence = 0.5;

  for(var i = 0; i < Math.ceil(octaves); i++) {
    var freq = Math.pow(2.0, i);
    var amp = Math.pow(persistence, i);
    total += interpNoise2D(x * freq, y * freq) * amp;
  }
  return total;
}

// determine the coast line
function shore(y: number) {
    if (y > 30.0) {
        return -30.0 * Math.sin(y*0.05);
    } else if (y < -90.0) {
        return -3.0 * Math.sin(y*0.25);
    } else if (y == 0.0) {
      return Math.sin(y + 1.0);
    }
    return Math.sin(1.15*y)/y;
}

// return population density at a given area
function noisePopulation(pos: vec2, pop: number) {
  if (pos[0] + 10.0 < shore(pos[1])) {
    return 0.0;
  }
  var value = fbm(pos[0]*0.05 + 50.0, pos[1]*0.05 + 50.0, 8.0) + (-200.0 + pos[0]) / 400.0;
  value = Math.max(Math.min(value, 1.0), 0.0);
  return value;
}

function noiseTerrain(pos: vec2) {
    if (pos[0] + 10.0 < shore(pos[1])) {
        return 0.0;
    }
    var value = fbm(pos[0]*0.1 + 50.0, pos[1]*0.1 + 50.0, 3.0) + (-200.0 + pos[0]) / 400.0;
    value = Math.max(Math.min(value, 1.0), 0.0);
    return value - 0.5;
}

// intersection test
function intersectionTest(e0: vec2, e1: vec2, o0: vec2, o1: vec2) {
  // convert to Ax + By = C form
  var A1 = e1[1] - e0[1];
  var B1 = e0[0] - e1[0];
  var C1 = A1 * e0[0] + B1 * e0[1];
    
  var A2 = o1[1] - o0[1];
  var B2 = o0[0] - o1[0];
  var C2 = A2 * o0[0] + B2 * o0[1];

  var det = A1 * B2 - A2 * B1;

  // parallel lines
  if (Math.abs(det) < 0.001) {
    return undefined;
  } else { 
    var x = (B2 * C1 - B1 * C2) / det;
    var y = (A1 * C2 - A2 * C1) / det;
    var intersection = vec2.fromValues(x, y);
    return intersection;
  }
}

function rasterize() {
  // create vertical "edges" for each 2D array row and check for intersection
  for (let e of edges) {
    var start = vec2.fromValues(e.p1[0], e.p1[2]);
    var end = vec2.fromValues(e.p2[0], e.p2[2]);
    //raster2D[start[0] + 200][start[1] + 200] = false;
    //raster2D[end[0] + 200][end[1] + 200] = false;
    var or = vec2.fromValues(end[0] - start[0], end[1] - start[1]);
    var incr = vec2.fromValues(or[0] / 15.0, or[1] / 15.0);
    for (var i = 0; i < 15; i++) {
      start = vec2.fromValues(start[0] + incr[0], start[1] + incr[1]);
      for (var x = start[0] + 195; x <= start[0] + 205; x++) {
        for (var z = start[1] + 195; z <= start[1] + 205; z++) {
          if (x < 0 || x > 399 || z < 0 || z > 399) {
            continue;
          }
            raster2D[z][x] = false;
        }
      }
    }
  }
  // also fill out the 2D raster array for water coordinates
  for (var i = 0; i < 400; i++) {
    var row = raster2D[i];
    var zCoor = 200.0 - i;
    var sx = Math.floor(shore(zCoor)) + 200; // corresponding x coordinate in range
    for (var j = sx; j < 400; j++) {
      row[sx] = false;
    }
  }
}

function hash(key: number) {
  key += (key << 15);
  key ^= (key >> 10);
  key += (key << 3);
  key ^= (key >> 6);
  key += (key << 11);
  key ^= (key >> 16);
  return key;
}

function buildingPts() {
  // pick 50 random (valid) building points
  for (var i = 0; i < 100; i++) {
    var valid = false;
    while (!valid) {
      var bx = getRandomInt(400);
      var by = getRandomInt(400);
      var status = raster2D[bx][by];
      var pop = noisePopulation(vec2.fromValues(bx - 200, by - 200), 5);
      if (status && pop > 0) {
        buildings.push(vec2.fromValues(bx, by));
        raster2D[bx][by] = false;
        for (var x1 = bx - 10; x1 <= bx + 10; x1++) {
          for (var z1 = by - 10; z1 <= by + 10; z1++) {
            if (z1 < 0 || z1 > 399 || x1 < 0 || x1 > 399) {
              continue;
            }
            raster2D[x1][z1] = false;
          }
        }
        valid = true;
      }
    }
  }
}

export default class LSystem {
	iter: number;
	axiom: string;
	expansion: ExpansionRule;
	draw: DrawingRule;
	turtle: Turtle;
  population: number;

  constructor(iter: number, axiom: string, p: number) {
  	this.iter = iter; // number of iterations
  	this.axiom = axiom; // axiom string
    this.population = p;
    this.turtle = new Turtle(vec3.fromValues(0.0, ht, 0.0), vec3.fromValues(0, 0, 1), 4);
  	turtleQueue.push(this.turtle);
  }

  setupRules() {
    this.addRule('F', new ExpansionRule('F', 'FFRF')); 
    this.addRule('R', new ExpansionRule('R', 'F')); // raster towards population
    this.addDraw('F', new DrawingRule('F', this.moveForward.bind(this)));
    this.addDraw('R', new DrawingRule('R', this.branchOutRaster.bind(this)));
  }

  // New York style branching out with perpendicular grids
  branchOutRaster() {
    // get the current turtle by removing it from the queue
    var turtle = turtleQueue.shift();

    // generate 3 possible directions
    // direction towards west
    var newOr1 = vec3.fromValues(-turtle.orientation[2], 0.0, turtle.orientation[0]);
    var dir1: vec3 = vec3.fromValues(turtle.position[0] + newOr1[0] * fac, ht,
                                     turtle.position[2] + newOr1[2] * fac);
    // direction forward
    var dir2: vec3 = vec3.fromValues(turtle.position[0] + turtle.orientation[0] * fac, ht,
                                     turtle.position[2] + turtle.orientation[2] * fac);
    // direction towards east
    var newOr2 = vec3.fromValues(turtle.orientation[2], 0.0, -turtle.orientation[0]);
    var dir3: vec3 = vec3.fromValues(turtle.position[0] + newOr2[0] * fac, ht,
                                     turtle.position[2] + newOr2[2] * fac);

    // get population densities
    var pop1 = noisePopulation(vec2.fromValues(dir1[0], dir1[2]), this.population);
    var pop2 = noisePopulation(vec2.fromValues(dir2[0], dir2[2]), this.population);
    var pop3 = noisePopulation(vec2.fromValues(dir3[0], dir3[2]), this.population);

    // check for the first possible direction
    if (dir1[0] != turtle.position[0] || dir1[2] != turtle.position[2]) {
      // if the density doesn't meet a certain threshold, don't go there
      if (pop1 > 0.5 && (dir1[0] < 200 && dir1[0] > -200 && dir1[2] < 200 && dir1[2] > -200)) {
      // create the new road
      let newE = new Edge(turtle.position, dir1, turtle.width);
      // check if intersection exists between this new road and existing roads
      var foundInter = false; // boolean for intersection finding
      for (let e of edges) {
          // if the intersection exists, add the intersection point
          var p1 = vec2.fromValues(newE.p1[0], newE.p1[2]);
          var p2 = vec2.fromValues(newE.p2[0], newE.p2[2]);
          var p3 = vec2.fromValues(e.p1[0], e.p1[2]);
          var p4 = vec2.fromValues(e.p2[0], e.p2[2]);
          var isect = intersectionTest(p1, p2, p3, p4);
          if (isect) {
            newE.p2 = vec3.fromValues(isect[0], ht, isect[1]);
            intersections.push(newE.p2);
            foundInter = true;
            break;
          }
      }
      // if an intersection doesn't exist, connect the road to the nearest
      // previously existing intersection
      if (!foundInter && intersections.length > 0) {
        var closest: vec3;
        var dist = Number.MAX_VALUE;
        for (let is of intersections) {
          var v = vec3.fromValues(is[0] - dir1[0], 0.0, is[1] - dir1[1]);
          var d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
          if (d < dist) {
            dist = d;
            closest = is;
          }
        }
        newE.p2 = closest;
      }
      edges.push(newE);
      // create a new turtle that has this new position and orientation
      // and push it to the queue
      turtleQueue.push(new Turtle(dir1, newOr1, turtle.width));
      }
    }

    // check for the second possible direction
    if (dir2[0] != turtle.position[0] || dir2[2] != turtle.position[2]) {
      // if the density doesn't meet a certain threshold, don't go there
      if (pop2 > 0.5 && (dir2[0] < 200 && dir2[0] > -200 && dir2[2] < 200 && dir2[2] > -200)) {
      // create the new road
      let newE = new Edge(turtle.position, dir2, turtle.width);
      // check if intersection exists between this new road and existing roads
      var foundInter = false; // boolean for intersection finding
      for (let e of edges) {
          // if the intersection exists, add the intersection point
          var p1 = vec2.fromValues(newE.p1[0], newE.p1[2]);
          var p2 = vec2.fromValues(newE.p2[0], newE.p2[2]);
          var p3 = vec2.fromValues(e.p1[0], e.p1[2]);
          var p4 = vec2.fromValues(e.p2[0], e.p2[2]);
          var isect = intersectionTest(p1, p2, p3, p4);
          if (isect) {
            newE.p2 = vec3.fromValues(isect[0], ht, isect[1]);
            intersections.push(newE.p2);
            foundInter = true;
            break;
          }
      }
      // if an intersection doesn't exist, connect the road to the nearest
      // previously existing intersection
      if (!foundInter && intersections.length > 0) {
        var closest: vec3;
        var dist = Number.MAX_VALUE;
        for (let is of intersections) {
          var v = vec3.fromValues(is[0] - dir2[0], 0.0, is[1] - dir2[1]);
          var d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
          if (d < dist) {
            dist = d;
            closest = is;
          }
        }
        newE.p2 = closest;
      }
      edges.push(newE);
      // create a new turtle that has this new position and orientation
      // and push it to the queue
      turtleQueue.push(new Turtle(dir2, turtle.orientation, turtle.width));
      }
    }

    // check for the third possible direction
    if (dir3[0] != turtle.position[0] || dir3[2] != turtle.position[2]) {
      // if the density doesn't meet a certain threshold, don't go there
      if (pop3 > 0.5 && (dir3[0] < 200 && dir3[0] > -200 && dir3[2] < 200 && dir3[2] > -200)) {
      // create the new road
      let newE = new Edge(turtle.position, dir3, turtle.width);
      // check if intersection exists between this new road and existing roads
      var foundInter = false; // boolean for intersection finding
      for (let e of edges) {
          // if the intersection exists, add the intersection point
          var p1 = vec2.fromValues(newE.p1[0], newE.p1[2]);
          var p2 = vec2.fromValues(newE.p2[0], newE.p2[2]);
          var p3 = vec2.fromValues(e.p1[0], e.p1[2]);
          var p4 = vec2.fromValues(e.p2[0], e.p2[2]);
          var isect = intersectionTest(p1, p2, p3, p4);
          if (isect) {
            newE.p2 = vec3.fromValues(isect[0], ht, isect[1]);
            intersections.push(newE.p2);
            foundInter = true;
            break;
          }
      }
      // if an intersection doesn't exist, connect the road to the nearest
      // previously existing intersection
      if (!foundInter && intersections.length > 0) {
        var closest: vec3;
        var dist = Number.MAX_VALUE;
        for (let is of intersections) {
          var v = vec3.fromValues(is[0] - dir3[0], 0.0, is[1] - dir3[1]);
          var d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
          if (d < dist) {
            dist = d;
            closest = is;
          }
        }
        newE.p2 = closest;
      }
      edges.push(newE);
      // create a new turtle that has this new position and orientation
      // and push it to the queue
      turtleQueue.push(new Turtle(dir3, newOr2, turtle.width));
      }
    }

    // update the current turtle to be the first newly added turtle (if there is expansion)
    // if there is no possible expansion left then we reached a dead end
    if (turtleQueue.length == 0) {
      return 3; // dead end, stop going through the axiom
    } else {
      this.turtle = turtleQueue[0]; // update the turtle
      return 1; // we have something to draw, keep going
    }
  }

  moveForward() {
    var t = this.turtle;
    // find potential new position after moving forward
    var newP = vec3.fromValues(t.position[0] + t.orientation[0] * fac,
                               t.position[1] + t.orientation[1] * fac,
                               t.position[2] + t.orientation[2] * fac);
    // check if this expansion is valid (not towards water, etc.)
    var pop = noisePopulation(vec2.fromValues(newP[0], newP[2]), this.population);
    // if invalid density, then don't move forward with this turtle anymore
    var newE: Edge;
    // if we have an invalid density, we cannot move forward
    if (pop <= 0.0 && (newP[0] < 200 && newP[0] > -200 && newP[2] < 200 && newP[2] > -200)) {
      // if we have at least one other turtle in our stack, switch to that
      if (turtleQueue.length > 1) {
        this.turtle = turtleQueue.shift();
        return 2; // switched turtles
      } else if (turtleQueue.length == 1) {
        // try branching out to find new possible directions
        var state = this.branchOutRaster();
        if (state == 3) {
          return 3; // we reached a dead end, stop going through the axiom
        } else {
          return 1; // we got something to draw
        }
      } else {
        return 3; // we reached a dead end, stop going through the axiom
      }
    } else {
      newE = new Edge(t.position, newP, this.turtle.width);
    }
    // check if intersection exists between this new road and existing roads
    var foundInter = false; // boolean for intersection finding
    for (let e of edges) {
        // if the intersection exists, add the intersection point
        var p1 = vec2.fromValues(newE.p1[0], newE.p1[2]);
        var p2 = vec2.fromValues(newE.p2[0], newE.p2[2]);
        var p3 = vec2.fromValues(e.p1[0], e.p1[2]);
        var p4 = vec2.fromValues(e.p2[0], e.p2[2]);
        var isect = intersectionTest(p1, p2, p3, p4);
        if (isect) {
          newE.p2 = vec3.fromValues(isect[0], ht, isect[1]);
          intersections.push(newE.p2);
          foundInter = true;
          break;
        }
    }
    // if an intersection doesn't exist, connect the road to the nearest
    // previously existing intersection
    if (!foundInter && intersections.length > 0) {
      var closest: vec3;
      var dist = Number.MAX_VALUE;
      for (let is of intersections) {
        var v = vec3.fromValues(is[0] - newP[0], 0.0, is[1] - newP[1]);
        var d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        if (d < dist) {
          dist = d;
          closest = is;
        }
      }
      newE.p2 = closest;
    }
    // put the new edge into the edge list
    edges.push(newE);
    this.turtle.position = newP;
    turtleQueue[0] = this.turtle; // update our current turtle
    // create 2 grid turtles and push them to the grid queue
    var oneOr = vec3.fromValues(this.turtle.orientation[2], 0.0, -this.turtle.orientation[0]);
    var twoOr = vec3.fromValues(-this.turtle.orientation[2], 0.0, this.turtle.orientation[0]);
    var one = new Turtle(this.turtle.position, oneOr, this.turtle.width / 2.0);
    var two = new Turtle(this.turtle.position, twoOr, this.turtle.width / 2.0);
    turtleGridQueue.push(one);
    turtleGridQueue.push(two);
    return 1; // we got something to draw
  }

  // expand the streets
  expandStreets() {
    var t = this.turtle;
    var newP = vec3.fromValues(t.position[0] + t.orientation[0] * fac,
                               t.position[1] + t.orientation[1] * fac,
                               t.position[2] + t.orientation[2] * fac);
    // check if this expansion is valid (not towards water, etc.)
    var pop = noisePopulation(vec2.fromValues(newP[0], newP[2]), this.population);
    // if invalid density, then don't move forward with this turtle anymore
    if (newP[0] < 200 && newP[0] > -200 && newP[2] < 200 && newP[2] > -200) {
      var newE = new Edge(t.position, newP, this.turtle.width);
      // if we have an invalid density, we cannot move forward
      // if (pop <= 0.0) {
      //   return 3;
      // } else {
      //   newE = new Edge(t.position, newP, this.turtle.width);
      // }
      // check if intersection exists between this new road and existing roads
      var foundInter = false; // boolean for intersection finding
      for (let e of edges) {
          // if the intersection exists, add the intersection point
          var p1 = vec2.fromValues(newE.p1[0], newE.p1[2]);
          var p2 = vec2.fromValues(newE.p2[0], newE.p2[2]);
          var p3 = vec2.fromValues(e.p1[0], e.p1[2]);
          var p4 = vec2.fromValues(e.p2[0], e.p2[2]);
          var isect = intersectionTest(p1, p2, p3, p4);
          if (isect) {
            newE.p2 = vec3.fromValues(isect[0], ht, isect[1]);
            intersections.push(newE.p2);
            foundInter = true;
            break;
          }
      }
      // if an intersection doesn't exist, connect the road to the nearest
      // previously existing intersection
      if (!foundInter && intersections.length > 0) {
        var closest: vec3;
        var dist = Number.MAX_VALUE;
        for (let is of intersections) {
          var v = vec3.fromValues(is[0] - newP[0], 0.0, is[1] - newP[1]);
          var d = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
          if (d < dist) {
            dist = d;
            closest = is;
          }
        }
        newE.p2 = closest;
      }
      // put the new edge into the edge list
      edges.push(newE);
      }
  }

  addRule(c: string, rule: ExpansionRule) {
		var rules = expansionRules.get(c);
		if (rules) {
			rules.push(rule);
			expansionRules.set(c, rules);
		} else {
			expansionRules.set(c, [rule]);
		}
	}

	addDraw(c: string, rule: DrawingRule) {
		var rules = drawRules.get(c);
		if (rules) {
			rules.push(rule);
			drawRules.set(c, rules);
		} else {
			drawRules.set(c, [rule]);
		}
	}

	expandRule(str: string) {
		var newStr = '';
		for (var i = 0; i < str.length; i++) {
			var rules = expansionRules.get(str.charAt(i));
			if (rules) {
				var p = rules.length;
				newStr += rules[getRandomInt(p)].getRule();
			} else {
				newStr += str.charAt(i);
			}
		}
		return newStr;
	}

	generateSystem() {
		var str = this.axiom;
		for (var i = 0; i < this.iter; i++) {
			var res = this.expandRule(str);
			str = res;
		}
		this.axiom = str;
	}

	drawSystem() {
		var str = this.axiom;
		for (var i = 0; i < str.length; i++) {
			var key = str.charAt(i);
			var func = drawRules.get(key);
			if (func) {
			 var toCall = func[getRandomInt(func.length)].getFunc();
       var oldPos = this.turtle.position;
			 var isDraw = toCall();
			 if (isDraw == 3) {
        // reached a dead end, stop going through the axiom
        break;
			 } else if (isDraw == 1) {
        // we got something to draw, get the transform matrix
        var incr = vec2.fromValues(this.turtle.position[0] - oldPos[0],
                                   this.turtle.position[2] - oldPos[2]);
        // figure out how many iterations we need
        //incr = vec2.fromValues(incr[0] * 4, incr[1] * 4);
        this.findMatrix();
       }
			}
		}
    if (turtleQueue.length > 1) {
      for (let t of turtleQueue) {
        this.turtle = t;
        this.findMatrix();
      }
    }
    if (turtleGridQueue.length > 1) {
      for (let t of turtleGridQueue) {
        this.turtle = t;
        this.expandStreets();
        this.findMatrix();
      }
    }
    // Once we're finally done with generating all the roads, fill the raster2D
    initializeRaster2D(); // setup the raster 2D grid
    rasterize();

    // Now we can generate random points for our buildings and fill the transformations
    buildingPts();
    for (var i = 0; i < buildings.length; i++) {
      var coor = buildings[i];
      var worldCoor = vec2.fromValues(coor[0] - 200.0, coor[1] - 200.0);
      this.findBuildingMatrices(worldCoor);
    }
	}

  // find the transformation matrix for instanced rendering
	findMatrix() {
    var t = this.turtle;
    var o = t.orientation;
		var ang = angle(o, up); // rotation angle
    var trans = mat4.fromValues((t.width + 2.0) * 1.0, 0.0, 0.0, 0.0,
                                0.0, 1.0, 0.0, 0.0,
                                0.0, 0.0, (t.width + 2.0) * 1.0, 0.0,
                                t.position[0], t.position[1], t.position[2], 1.0);
		trans = rotateY(trans, trans, ang);
		trans = scale(trans, trans, vec3.fromValues(t.width * 0.25, 1.0, t.width * 5.0));
    // console.log(trans);
		matrices.push(trans);
		return 1;
	}

  findBuildingMatrices(pos: vec2) {
    // position along xz axis
    // hex = 0, cube = 1, pent = 2, sky = 3

    // first form the transform matrix
    // decide the height based on population density
    var p = noisePopulation(pos, this.population);
    var h = 3.0;
    h += 10.0 / (1.5*(1.1 - p));
    h = Math.max(3.0, h); // clamp the heights
    var trans = mat4.fromValues(3.0, 0.0, 0.0, 0.0,
                                0.0, 3.0, 0.0, 0.0,
                                0.0, 0.0, 3.0, 0.0,
                                pos[0], h, pos[1], 1.0);
    // decide with which mesh to start depending on the population density
    // if p is above a certain threshold then this will be a skyscraper
    if (p > 0.9) {
      buildingIdxs.push(3);
      trans = mat4.fromValues(0.2, 0.0, 0.0, 0.0,
                                0.0, 0.2, 0.0, 0.0,
                                0.0, 0.0, 0.2, 0.0,
                                pos[0], h, pos[1], 1.0);
    } else {
    buildingIdxs.push(getRandomInt(2));
    }
    buildingMatrices.push(trans);
    // push more matrices and meshes to make the building reach the floor
    var currH = h;
    while (currH > 3.0) {
      currH -= 3.0;
      var newT = mat4.fromValues(3.0, 0.0, 0.0, 0.0,
                                0.0, 3.0, 0.0, 0.0,
                                0.0, 0.0, 3.0, 0.0,
                                pos[0], currH, pos[1], 1.0);
      buildingMatrices.push(newT);
      buildingIdxs.push(getRandomInt(2));
    }
  }

  // get all the transformations for instanced rendering
	getTransformations() {
		return matrices;
	}

  getgrid2D() {
    return raster2D;
  }

  getBuildingPts() {
    return buildings;
  }

  getBuildingTrans() {
    return buildingMatrices;
  }

  getBuildingIdxs() {
    return buildingIdxs;
  }

  // reset the L-System
	reset() {
		matrices = [];
    buildingMatrices = [];
    buildingIdxs = [];
		turtleQueue = [];
    turtleGridQueue = [];
    edges = [];
    intersections = [];
    buildings = [];
		expansionRules = new Map();
		drawRules = new Map();
    raster2D = [];
    rasterX = 199;
    rasterZ = 199;
	}

  getEdges() {
    return edges;
  }

  getIntersections() {
    return intersections;
  }
};