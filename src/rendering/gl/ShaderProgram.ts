import {vec2, vec4, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;
  attrUV: number;
  attrT0: number; // col0
  attrT1: number; // col1
  attrT2: number; // col2
  attrT3: number; // col3

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifColor: WebGLUniformLocation;
  unifPlanePos: WebGLUniformLocation;
  unifDimensions: WebGLUniformLocation;
  unifTime: WebGLUniformLocation;
  unifPopMap: WebGLUniformLocation;
  unifTerMap: WebGLUniformLocation;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.attrUV = gl.getAttribLocation(this.prog, "vs_UV");
    this.attrT0 = gl.getAttribLocation(this.prog, "vs_T0");
    this.attrT1 = gl.getAttribLocation(this.prog, "vs_T1");
    this.attrT2 = gl.getAttribLocation(this.prog, "vs_T2");
    this.attrT3 = gl.getAttribLocation(this.prog, "vs_T3");
    this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifDimensions = gl.getUniformLocation(this.prog, "u_Dimensions");
    this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifPlanePos   = gl.getUniformLocation(this.prog, "u_PlanePos");
    this.unifTime       = gl.getUniformLocation(this.prog, "u_Time");
    this.unifPopMap = gl.getUniformLocation(this.prog, "u_PopMap");
    this.unifTerMap = gl.getUniformLocation(this.prog, "u_TerMap");
  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setDimensions(width: number, height: number) {
    this.use();
    if(this.unifDimensions !== -1) {
      gl.uniform2f(this.unifDimensions, width, height);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setPlanePos(pos: vec2) {
    this.use();
    if (this.unifPlanePos !== -1) {
      gl.uniform2fv(this.unifPlanePos, pos);
    }
  }

  setTime(t: number) {
    this.use();
    if (this.unifTime !== -1) {
      gl.uniform1f(this.unifTime, t);
    }
  }

  showPopulationMap(t: number) {
    this.use();
    if (this.unifPopMap !== -1) {
      gl.uniform1i(this.unifPopMap, t);
    }
  }

  showTerrainMap(t: number) {
    this.use();
    if (this.unifTerMap !== -1) {
      gl.uniform1i(this.unifTerMap, t);
    }
  }

  draw(d: Drawable) {
    this.use();
    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrUV != -1 && d.bindUV()) {
      gl.enableVertexAttribArray(this.attrUV);
      gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 0, 0);
    }

    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);
    
    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrUV != -1) gl.disableVertexAttribArray(this.attrUV);
  }

  drawInstanced(d: Drawable) {
    this.use();
    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrPos, 0); // Advance 1 index in pos VBO for each vertex
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrNor, 0); // Advance 1 index in pos VBO for each vertex
    }

    if (this.attrCol != -1 && d.bindCol()) {
      gl.enableVertexAttribArray(this.attrCol);
      gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrCol, 1); // Advance 1 index in col VBO for each drawn instance
    }

    if (this.attrUV != -1 && d.bindUV()) {
      gl.enableVertexAttribArray(this.attrUV);
      gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrUV, 0); // Advance 1 index in pos VBO for each vertex
    }

    if (this.attrT0 != -1 && d.bindT0()) {
      gl.enableVertexAttribArray(this.attrT0);
      gl.vertexAttribPointer(this.attrT0, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrT0, 1); // Advance 1 index in translate VBO for each drawn instance
    }

    if (this.attrT1 != -1 && d.bindT1()) {
      gl.enableVertexAttribArray(this.attrT1);
      gl.vertexAttribPointer(this.attrT1, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrT1, 1); // Advance 1 index in translate VBO for each drawn instance
    }

    if (this.attrT2 != -1 && d.bindT2()) {
      gl.enableVertexAttribArray(this.attrT2);
      gl.vertexAttribPointer(this.attrT2, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrT2, 1); // Advance 1 index in translate VBO for each drawn instance
    }

    if (this.attrT3 != -1 && d.bindT3()) {
      gl.enableVertexAttribArray(this.attrT3);
      gl.vertexAttribPointer(this.attrT3, 4, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(this.attrT3, 1); // Advance 1 index in translate VBO for each drawn instance
    }

    d.bindIdx();
    gl.drawElementsInstanced(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0, d.numInstances);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
    if (this.attrUV != -1) gl.disableVertexAttribArray(this.attrUV);
    if (this.attrT0 != -1) gl.disableVertexAttribArray(this.attrT0);
    if (this.attrT1 != -1) gl.disableVertexAttribArray(this.attrT1);
    if (this.attrT2 != -1) gl.disableVertexAttribArray(this.attrT2);
    if (this.attrT3 != -1) gl.disableVertexAttribArray(this.attrT3);
  }
};

export default ShaderProgram;
