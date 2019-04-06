#version 300 es
precision highp float;

in vec4 fs_Col;
in vec4 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_LightVec1;
in vec4 fs_LightVec2;
in vec4 fs_LightVec3;

uniform float u_Time;

out vec4 out_Col;

float square_wave(float x, float freq, float amplitude) {
	return abs(float(int(floor(x * freq)) % 2) * amplitude);
}

void main()
{
	if (fs_Nor.x != 0.0 || fs_Nor.y != 0.0 || fs_Nor.z != 0.0) {
		float diffuseTerm1 = dot(normalize(fs_Nor), normalize(fs_LightVec1));
		float diffuseTerm2 = dot(normalize(fs_Nor), normalize(fs_LightVec2));
		float diffuseTerm3 = dot(normalize(fs_Nor), normalize(fs_LightVec3));
	    // Avoid negative lighting values
	    diffuseTerm1 = clamp(diffuseTerm1, 0.0, 1.0);
	    diffuseTerm2 = clamp(diffuseTerm2, 0.0, 1.0);
	    diffuseTerm3 = clamp(diffuseTerm3, 0.0, 1.0);

	    float ambientTerm = 0.2;

	    float lightIntensity1 = diffuseTerm1 + ambientTerm;
    	float lightIntensity2 = diffuseTerm2 + ambientTerm;
    	float lightIntensity3 = diffuseTerm3 + ambientTerm;
    	float lightIntensity = (lightIntensity1 + lightIntensity2 + lightIntensity3 / 2.5);
    	float specularIntensity1 = max(pow(dot(normalize(fs_LightVec1), normalize(fs_Nor)), 30.0), 0.0);
    	float specularIntensity2 = max(pow(dot(normalize(fs_LightVec2), normalize(fs_Nor)), 30.0), 0.0);
    	float specularIntensity3 = max(pow(dot(normalize(fs_LightVec3), normalize(fs_Nor)), 30.0), 0.0);
    	float specularIntensity = (specularIntensity1 + specularIntensity2 + specularIntensity3);
    	if (int(fs_Pos.y) % 5 == 0) {
    		out_Col = vec4(vec3(0.9) * lightIntensity + specularIntensity, 1.0);
    	} else {
    		out_Col = vec4(vec3(square_wave(fs_Pos.y, 2.0, 5.0)) * lightIntensity + specularIntensity, 1.0);
    	}
	} else {
		out_Col = vec4(0.0, 0.0, 0.0, 1.0);
	}
}
