import {vec3} from 'gl-matrix';

export default class ExpansionRule {

	c: string; // character
	exp: string; // expanded version

	constructor(c: string, exp: string) {
		this.c = c;
		this.exp = exp;
	}

	getRule() {
		return this.exp;
	}

	getChar() {
		return this.c;
	}

	changeRule(newExp: string) {
		this.exp = newExp;
	}
};