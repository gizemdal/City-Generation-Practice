import {vec2, vec3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';
import Mesh from './geometry/Mesh';
import Plane from './geometry/Plane';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL, readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import LSystem from './LSystem';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Load Scene': loadScene, // A function pointer, essentially
  populationMap: true, // display population map
  terrainMap: true, // display terrain map
  iteration: 3, // number of iterations
  axiom: 'F'
};

let road: Square;
let plane : Plane;
let planeTest: Square;
let background: ScreenQuad;
let planePos: vec2;
let time = 0.0;
let prevIteration: number = 3; // store previous iteration number
let prevAxiom: string = 'F';
let prevDayTime: number = 0;
let prevBiomeSize: number = 3;
let lsystem: LSystem;

// for buildings
let cube: Mesh;
let hex: Mesh;
let sky: Mesh;
let pentagon: Mesh;
let obj0: string = readTextFile('../obj_files/hex.obj');
let obj1: string = readTextFile('../obj_files/cube.obj');
let obj2: string = readTextFile('../obj_files/pentagon.obj');
let obj3: string = readTextFile('../obj_files/skyscraper.obj');

function loadScene() {
  road = new Square();
  road.create();
  planeTest = new Square();
  planeTest.create();
  plane = new Plane(vec3.fromValues(0,0,0), vec2.fromValues(400,400), 20);
  plane.create();
  background = new ScreenQuad();
  background.create();
  planePos = vec2.fromValues(0,0);

  let center = vec3.fromValues(0.0, 0.0, 0.0);
  hex = new Mesh(obj0, center); // the hexagonal prism
  cube = new Mesh(obj1, center); // the cube
  pentagon = new Mesh(obj2, center); // the pentagonal prism
  sky = new Mesh(obj3, center); // the top of the skyscraper
  hex.create();
  cube.create();
  pentagon.create();
  sky.create();
}

function instanceRendering() {
  lsystem = new LSystem(controls.iteration, controls.axiom, 
    5);
  lsystem.reset();
  lsystem.setupRules();
  lsystem.generateSystem();
  lsystem.drawSystem();
  // generate the roads
  let matrices = lsystem.getTransformations();
  let t0Array = []; // col0 array for road
  let t1Array = []; // col1 array for road
  let t2Array = []; // col2 array for road
  let t3Array = []; // col2 array for road
  let colorsArray = []; // colors array for road
  let n: number = matrices.length; // number of road instances
  for(let i = 0; i < n; i++) {
    var mat = matrices[i];
      t0Array.push(mat[0]);
      t0Array.push(mat[1]);
      t0Array.push(mat[2]);
      t0Array.push(mat[3]);
      t1Array.push(mat[4]);
      t1Array.push(mat[5]);
      t1Array.push(mat[6]);
      t1Array.push(mat[7]);
      t2Array.push(mat[8]);
      t2Array.push(mat[9]);
      t2Array.push(mat[10]);
      t2Array.push(mat[11]);
      t3Array.push(mat[12]);
      t3Array.push(mat[13]);
      t3Array.push(mat[14]);
      t3Array.push(mat[15]);
      colorsArray.push(1.0);
      colorsArray.push(1.0);
      colorsArray.push(1.0);
      colorsArray.push(1.0); // Alpha channel
  }

  let t0: Float32Array = new Float32Array(t0Array);
  let t1: Float32Array = new Float32Array(t1Array);
  let t2: Float32Array = new Float32Array(t2Array);
  let t3: Float32Array = new Float32Array(t3Array);
  let colors: Float32Array = new Float32Array(colorsArray);
  road.setInstanceVBOs(t0, t1, t2, t3, colors);
  road.setNumInstances(n);

  // generate the buildings
  let buildingMatrices = lsystem.getBuildingTrans();
  console.log('building m: ' + buildingMatrices.length);
  let indices = lsystem.getBuildingIdxs();
  let t0H = []; // col0 array for hex
  let t1H = []; // col1 array for hex
  let t2H = []; // col2 array for hex
  let t3H = []; // col2 array for hex
  let colH = []; // colors array for hex
  let t0C = []; // col0 array for cube
  let t1C = []; // col1 array for cube
  let t2C = []; // col2 array for cube
  let t3C = []; // col2 array for cube
  let colC = []; // colors array for cube
  let t0P = []; // col0 array for pent
  let t1P = []; // col1 array for pent
  let t2P = []; // col2 array for pent
  let t3P = []; // col2 array for pent
  let colP = []; // colors array for pent
  let t0S = []; // col0 array for skyscraper
  let t1S = []; // col1 array for skyscraper
  let t2S = []; // col2 array for skyscraper
  let t3S = []; // col2 array for skyscraper
  let colS = []; // colors array for skyscraper
  let nB: number = buildingMatrices.length; // number of mesh instances
  let bCol = vec3.fromValues(1.0, 0.2, 0.6); // color for buildings
  let nH = 0; // num instance for hex
  let nC = 0; // num instance for cube
  let nP = 0; // num instance for pentagon
  let nS = 0; // num instances for skyscraper
  for(let i = 0; i < nB; i++) {
    var mat = buildingMatrices[i];
    if (indices[i] == 0) {
      // we have a hex mesh
      t0H.push(mat[0]);
      t0H.push(mat[1]);
      t0H.push(mat[2]);
      t0H.push(mat[3]);
      t1H.push(mat[4]);
      t1H.push(mat[5]);
      t1H.push(mat[6]);
      t1H.push(mat[7]);
      t2H.push(mat[8]);
      t2H.push(mat[9]);
      t2H.push(mat[10]);
      t2H.push(mat[11]);
      t3H.push(mat[12]);
      t3H.push(mat[13]);
      t3H.push(mat[14]);
      t3H.push(mat[15]);
      colH.push(bCol[0]);
      colH.push(bCol[1]);
      colH.push(bCol[2]);
      colH.push(1.0); // Alpha channel
      nH++;
    } else if (indices[i] == 1) {
      // we have a cube mesh
      t0C.push(mat[0]);
      t0C.push(mat[1]);
      t0C.push(mat[2]);
      t0C.push(mat[3]);
      t1C.push(mat[4]);
      t1C.push(mat[5]);
      t1C.push(mat[6]);
      t1C.push(mat[7]);
      t2C.push(mat[8]);
      t2C.push(mat[9]);
      t2C.push(mat[10]);
      t2C.push(mat[11]);
      t3C.push(mat[12]);
      t3C.push(mat[13]);
      t3C.push(mat[14]);
      t3C.push(mat[15]);
      colC.push(bCol[0]);
      colC.push(bCol[1]);
      colC.push(bCol[2]);
      colC.push(1.0); // Alpha channel
      nC++;
    } else if (indices[i] == 2) {
      // we have a pentagon mesh
      t0P.push(mat[0]);
      t0P.push(mat[1]);
      t0P.push(mat[2]);
      t0P.push(mat[3]);
      t1P.push(mat[4]);
      t1P.push(mat[5]);
      t1P.push(mat[6]);
      t1P.push(mat[7]);
      t2P.push(mat[8]);
      t2P.push(mat[9]);
      t2P.push(mat[10]);
      t2P.push(mat[11]);
      t3P.push(mat[12]);
      t3P.push(mat[13]);
      t3P.push(mat[14]);
      t3P.push(mat[15]);
      colP.push(bCol[0]);
      colP.push(bCol[1]);
      colP.push(bCol[2]);
      colP.push(1.0); // Alpha channel
      nP++;
    } else {
      // we have a skyscraper mesh
      t0S.push(mat[0]);
      t0S.push(mat[1]);
      t0S.push(mat[2]);
      t0S.push(mat[3]);
      t1S.push(mat[4]);
      t1S.push(mat[5]);
      t1S.push(mat[6]);
      t1S.push(mat[7]);
      t2S.push(mat[8]);
      t2S.push(mat[9]);
      t2S.push(mat[10]);
      t2S.push(mat[11]);
      t3S.push(mat[12]);
      t3S.push(mat[13]);
      t3S.push(mat[14]);
      t3S.push(mat[15]);
      colS.push(bCol[0]);
      colS.push(bCol[1]);
      colS.push(bCol[2]);
      colS.push(1.0); // Alpha channel
      nS++;
    }
  }

  // create hex instances
  let t0Hex: Float32Array = new Float32Array(t0H);
  let t1Hex: Float32Array = new Float32Array(t1H);
  let t2Hex: Float32Array = new Float32Array(t2H);
  let t3Hex: Float32Array = new Float32Array(t3H);
  let colHex: Float32Array = new Float32Array(colH);
  hex.setInstanceVBOs(t0Hex, t1Hex, t2Hex, t3Hex, colHex);
  hex.setNumInstances(nH);

  // create cube instances
  let t0Cube: Float32Array = new Float32Array(t0C);
  let t1Cube: Float32Array = new Float32Array(t1C);
  let t2Cube: Float32Array = new Float32Array(t2C);
  let t3Cube: Float32Array = new Float32Array(t3C);
  let colCube: Float32Array = new Float32Array(colC);
  cube.setInstanceVBOs(t0Cube, t1Cube, t2Cube, t3Cube, colCube);
  cube.setNumInstances(nC);

  // create pentagon instances
  let t0Pen: Float32Array = new Float32Array(t0P);
  let t1Pen: Float32Array = new Float32Array(t1P);
  let t2Pen: Float32Array = new Float32Array(t2P);
  let t3Pen: Float32Array = new Float32Array(t3P);
  let colPen: Float32Array = new Float32Array(colP);
  pentagon.setInstanceVBOs(t0Pen, t1Pen, t2Pen, t3Pen, colPen);
  pentagon.setNumInstances(nP);  

  // create skyscraper top instances
  let t0Sky: Float32Array = new Float32Array(t0S);
  let t1Sky: Float32Array = new Float32Array(t1S);
  let t2Sky: Float32Array = new Float32Array(t2S);
  let t3Sky: Float32Array = new Float32Array(t3S);
  let colSky: Float32Array = new Float32Array(colS);
  sky.setInstanceVBOs(t0Sky, t1Sky, t2Sky, t3Sky, colSky);
  sky.setNumInstances(nS);


  let p0 = [400.0, 0.0, 0.0, 0.0];
  let p1 = [0.0, 1.0, 0.0, 0.0];
  let p2 = [0.0, 0.0, 400.0, 0.0];
  let p3 = [0.0, 0.0, 0.0, 1.0];
  let cp = [0.0, 0.0, 0.0, 1.0];
  let p0a : Float32Array = new Float32Array(p0);
  let p1a : Float32Array = new Float32Array(p1); 
  let p2a : Float32Array = new Float32Array(p2); 
  let p3a : Float32Array = new Float32Array(p3);
  let cpa : Float32Array = new Float32Array(cp);
  planeTest.setInstanceVBOs(p0a, p1a, p2a, p3a, cpa); 
  planeTest.setNumInstances(1);
}

function main() {

  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  // gui.add(controls, 'time_24hrs', 0, 23).step(0.5);
  // gui.add(controls, 'biome_size', 1, 10).step(1);
  gui.add(controls, 'iteration', 1, 5).step(1);
  gui.add(controls, 'axiom');
  gui.add(controls, 'populationMap');
  gui.add(controls, 'terrainMap');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  // Initial call to instance rendering
  instanceRendering();

  const camera = new Camera(vec3.fromValues(0, 50, -50), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(164.0 / 255.0, 233.0 / 255.0, 1.0, 1);
  gl.enable(gl.DEPTH_TEST);

  const terrain = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/terrain-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/terrain-frag.glsl')),
  ]);

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  // lambert.setDayTime(controls.time_24hrs);
  // lambert.setBiomeSize(controls.biome_size);
  // flat.setDayTime(controls.time_24hrs);
  // flat.setBiomeSize(controls.biome_size);

  // This function will be called every frame
  flat.setDimensions(window.innerWidth, window.innerHeight);
  terrain.setDimensions(window.innerWidth, window.innerHeight);
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    if (prevIteration != controls.iteration) {
      prevIteration = controls.iteration;
      instanceRendering();
    }
    if (prevAxiom != controls.axiom) {
      prevAxiom = controls.axiom;
      instanceRendering();
    }
    if (controls.populationMap) {
      terrain.showPopulationMap(1);
    } else {
      terrain.showPopulationMap(0);
    }
    if (controls.terrainMap) {
      terrain.showTerrainMap(1);
    } else {
      terrain.showTerrainMap(0);
    }
    renderer.render(camera, flat, [
      background,
    ], time);
    renderer.render(camera, terrain, [
      plane,
    ], time);
    renderer.renderInstanced(camera, instancedShader, [
      road, hex, cube, pentagon, sky, //planeTest,
    ], time);
    time += 1.0;
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    flat.setDimensions(window.innerWidth, window.innerHeight);
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();
  flat.setDimensions(window.innerWidth, window.innerHeight);
  // Start the render loop
  tick();
}

main();
