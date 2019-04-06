import {vec3} from 'gl-matrix';

export default class DrawingRule {

	c: string; // character
	res: any; // drawing function

	constructor(c: string, res: any) {
		this.c = c;
		this.res = res;
	}

	getFunc() {
		return this.res;
	}

	getChar() {
		return this.c;
	}
};