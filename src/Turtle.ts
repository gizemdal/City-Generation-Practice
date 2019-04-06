
import {vec2, vec3, mat3, mat4, vec4} from 'gl-matrix';
import {dot, length, angle, normalize, rotateZ} from 'gl-vec3';
import {transformMat4} from 'gl-vec4';
import {setAxisAngle} from 'gl-quat';
import {fromQuat, fromTranslation, fromXRotation, fromYRotation, fromZRotation} from 'gl-mat4';

let count: number = 0;
export default class Turtle {
	position: vec3;
	orientation: vec3;
    width: number;

  constructor(p: vec3, orient: vec3, w: number) {
    this.position = p;
    this.orientation = orient;
    this.width = w;
  }

};