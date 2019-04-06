#version 300 es


uniform mat4 u_Model;
uniform mat4 u_ModelInvTr;
uniform mat4 u_ViewProj;
uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane
uniform float u_BiomeSize;

in vec4 vs_Pos;
in vec4 vs_Nor;
//in vec4 vs_Col;

out vec3 fs_Pos;
out vec4 fs_Nor;
out vec4 fs_LightVec; 

out float fs_Sine;
out float height;

// can't achieve slope :(

vec3 seed = vec3(0.1, 0.05, 0.49);

float random1( vec2 p , vec2 seed) {
  return fract(sin(dot(p + seed, vec2(127.1, 311.7))) * 43758.5453);
}

float random1( float p , vec2 seed) {
  return fract(sin(dot(p * seed, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 random2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float random1( vec3 p , vec3 seed) {
  return fract(sin(dot(p + seed, vec3(987.654, 123.456, 531.975))) * 85734.3545);
}

vec2 random2( vec2 p , vec2 seed) {
  return fract(sin(vec2(dot(p + seed, vec2(311.7, 127.1)), dot(p + seed, vec2(269.5, 183.3)))) * 85734.3545);
}

float square_wave(float x, float freq, float amplitude) {
	return float(int(floor(x * freq)) / 2) * amplitude;
}

float power(float x, int y) {
  float ret = 1.0;
  for (int i = y; i > 0; i--) {
    ret *= x;
  }
  return ret;
}

float interpNoise2D(float x, float y) {
  float intX = floor(x);
  float fractX = fract(x);
  float intY = floor(y);
  float fractY = fract(y);

  float v1 = random1(vec2(intX, intY), seed.xy);
  float v2 = random1(vec2(intX + 1.0, intY), seed.xy);
  float v3 = random1(vec2(intX, intY + 1.0), seed.xy);
  float v4 = random1(vec2(intX + 1.0, intY + 1.0), seed.xy);

  float i1 = mix(v1, v2, fractX);
  float i2 = mix(v3, v4, fractX);
  return mix(i1, i2, fractY);
}

float fbm(float x, float y, float octaves) {
  float total = 0.0;
  float persistence = 0.5;

  for(int i = 0; i < int(ceil(octaves)); i++) {
    float freq = power(2.0, i);
    float amp = power(persistence, i);
    total += interpNoise2D(x * freq, y * freq) * amp;
  }
  return total;
}

// determine the coast line
float shore(float y) {
    if (y > 30.0) {
        return -30.0 *sin(y*0.05);
    } else if (y < -90.0) {
        return -3.0 *sin(y*0.25);
    } else if (y == 0.0) {
      return sin(y + 1.0);
    }
    return sin(1.15*y)/y;
}

vec2 noiseTerrain(vec2 pos) {
  float s = shore(pos.y);
    if (pos.x + 40.0 < s) {
        return vec2(0.0, 0.0);
    }
    return vec2(clamp(fbm(pos.x*0.1 + 50.0, pos.y*0.1 + 50.0, 3.0), 0.0, 1.0) - 0.5, pos.x + 40.0 - s);
}

void main()
{
  fs_Pos = vs_Pos.xyz;
  float rand = random1(vs_Pos.xyz, seed);
  fs_Sine = (sin((square_wave(vs_Pos.x, 3.0, 1.0) + u_PlanePos.x) * 3.14159 * 0.1) + cos((vs_Pos.z + u_PlanePos.y) * 3.14159 * 0.1));
  float varY = fbm(vs_Pos.x, vs_Pos.z, sin(fs_Sine * 4.0));
  vec4 modelposition = vec4(vs_Pos.x, vs_Pos.y, vs_Pos.z, 1.0);
  vec2 yFac = noiseTerrain(fs_Pos.xz);
  if (yFac.y == 0.0) {
    modelposition.y -= (10.0);
  } else {
    if (yFac.y > 0.0 && yFac.y < 20.0) {
      modelposition.y -= (10.0 - 0.5 * yFac.y);
    }
  }
  modelposition = u_Model * modelposition;
  height = modelposition.y;
  gl_Position = u_ViewProj * modelposition;
}
