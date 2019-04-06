#version 300 es
precision highp float;

uniform vec2 u_PlanePos; // Our location in the virtual world displayed by the plane

in vec3 fs_Pos;
in vec4 fs_Nor;
uniform float u_Time; // time elapsed
uniform int u_PopMap; // population map activated?
uniform int u_TerMap; // terrain map activated?
uniform vec2 u_Dimensions;

in float height;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.
float shoreAmp = 0.05;
vec3 seed = vec3(0.1, 0.05, 0.4);
float u_Pop = 5.0;

float power(float x, int y) {
  float ret = 1.0;
  for (int i = y; i > 0; i--) {
    ret *= x;
  }
  return ret;
}

vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                     dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                     dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}

float random1( vec2 p , vec2 seed) {
  return fract(sin(dot(p + seed, vec2(127.1, 311.7))) * 43758.5453);
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

float random1( float p , vec2 seed) {
  return fract(sin(dot(p * seed, vec2(127.1, 311.7))) * 43758.5453);
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
// return population density at a given area
float noisePopulation(vec2 pos) {
    if (pos.x + 40.0 < shore(pos.y)) {
        return 0.0;
    }
    return clamp(fbm(pos.x*0.05 + 50.0, pos.y*0.05 + 50.0, 8.0) + (-200.0 + fs_Pos.x) / 400.0, 0.0, 1.0);
}

float noiseTerrain(vec2 pos) {
    if (pos.x + 40.0 < shore(pos.y)) {
        return 0.0;
    }
    return clamp(fbm(pos.x*0.1 + 50.0, pos.y*0.1 + 50.0, 3.0) + (-200.0 + fs_Pos.x) / 400.0, 0.0, 1.0) - 0.5;
}

void main() {
    vec3 finalCol; // finalColor
    vec3 pop_color = vec3(noisePopulation(fs_Pos.xz), 0.0, 0.0); // color assigned to the population
    vec3 ter_color; // terrain color
    float terFac = noiseTerrain(fs_Pos.xz); // color assigned to the terrain
    if (terFac == 0.0) {
        ter_color = vec3(0.0, 0.0, 1.0);
    } else {
        ter_color = vec3(0.35 + terFac, 0.35 + terFac * 2.0, 0.05 + terFac) + 0.1 * height;
    }
    if (u_PopMap == 1 && u_TerMap == 1) {
      out_Col = vec4((pop_color + ter_color) / 2.0, 1.0); 
    } else if (u_PopMap == 1) {
      out_Col = vec4(pop_color / 2.0, 1.0);
    } else if (u_TerMap == 1) {
      out_Col = vec4(ter_color / 2.0, 1.0);
    } else {
      if (terFac == 0.0) {
        vec2 st = round(fs_Pos.xz * 0.5)/u_Dimensions.xy;
        st.x *= u_Dimensions.x/u_Dimensions.y;
        vec3 color = vec3(0.0);
        float t = 1.0;
        // Uncomment to animate
        t = abs(1.0-sin(u_Time*.001))*5.;
        // Comment and uncomment the following lines:
        st += noise(st*2.)*t; // Animate the coordinate space
        color = vec3(1.) * smoothstep(.18,.2,noise(st)); // Big black drops
        color += smoothstep(.15,.2,noise(st*5.)); // Black splatter
        color -= smoothstep(.35,.4,noise(st*10.)); // Holes on splatter
        out_Col = vec4(0.9 - 0.2 * color.x, 0.3 - 0.1 * color.y, 0.0,1.0);
      } else {
        float c = 0.3 * fbm(abs(fs_Pos.x*0.05), abs(fs_Pos.z*0.05), 2.0);
        out_Col = vec4(vec3(c), 1.0);
      }
    }
}
