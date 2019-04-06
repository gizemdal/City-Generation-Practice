import {vec3} from 'gl-matrix';

export default class Edge {
	p1: vec3;
	p2: vec3;
	w: number; // width

	constructor(p1: vec3, p2: vec3, w: number) {
		this.p1 = p1;
		this.p2 = p2;
		this.w = w;
	}
};