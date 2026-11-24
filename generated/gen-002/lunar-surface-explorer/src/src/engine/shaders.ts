export const CAP_DEG = 7;
export const POLAR_SIZE = 2048;
export const GLOBAL_W = 4096;

const COMMON = /* glsl */ `
#define PI 3.14159265359
const float R_KM = 1737.4;
const float CAP = ${((CAP_DEG * Math.PI) / 180).toFixed(8)};
const float SIN_CAP = ${Math.sin((CAP_DEG * Math.PI) / 180).toFixed(8)};
const float POLAR_N = ${POLAR_SIZE.toFixed(1)};
const float GLOBAL_N = ${GLOBAL_W.toFixed(1)};
uniform sampler2D uGlobal;
uniform sampler2D uPolar;
`;

export const vertexShader = /* glsl */ `
${COMMON}
uniform float uExag;
varying vec3 vObj;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(position);
  float disp = 0.0;
  #ifdef PATCH
    vec2 uv = dir.xz / SIN_CAP * 0.5 + 0.5;
    float h = textureLod(uPolar, uv, 1.0).r;
    float rr = length(dir.xz) / SIN_CAP;
    float fade = 1.0 - smoothstep(0.8, 1.0, rr);
    disp = h * uExag / R_KM * fade;
  #endif
  vec3 p = dir * (1.0 + disp);
  vObj = p;
  vDir = dir;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
${COMMON}
uniform vec3 uSun;
uniform vec3 uCam;
uniform float uPxKm;
uniform float uPsr;
uniform float uExposure;
uniform float uLoaded;
uniform int uCrN;
uniform vec4 uCrC[64];
uniform vec4 uCrP[64];
varying vec3 vObj;
varying vec3 vDir;

float h31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 h33(vec3 p) {
  vec3 q = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(q) * 43758.5453123);
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i + vec3(0, 0, 0)), h31(i + vec3(1, 0, 0)), f.x),
                 mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), f.x),
                 mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

/* Small procedural craters: one candidate per 3D cell; radius keeps its influence inside its own cell. */
vec3 craterLayer(vec3 pk, float cell, float seed, float amp) {
  vec3 id = floor(pk / cell);
  vec3 rnd = h33(id + seed);
  vec3 rnd2 = h33(id * 1.37 + seed + 11.0);
  if (rnd2.x > 0.5) return vec3(0.0);
  float r = cell * (0.05 + 0.13 * rnd2.y * rnd2.y + 0.03 * rnd2.y);
  vec3 c = (id + 0.27 + 0.46 * rnd) * cell;
  vec3 dv = pk - c;
  float d = length(dv);
  float x = d / r;
  if (x > 1.28) return vec3(0.0);
  float rpx = r / max(uPxKm, 1e-5);
  float lod = smoothstep(1.2, 4.5, rpx);
  if (lod <= 0.0) return vec3(0.0);
  float age = 0.12 + 0.88 * rnd2.z * rnd2.z;
  // f = x*x-1+0.25 inside, 0.25*exp(-4(x-1)) outside; derivative:
  float fp = x < 1.0 ? 2.0 * x : -0.55 * exp(-3.0 * (x - 1.0));
  float k = 0.30 * age * amp * lod;
  return k * fp * dv / max(d, 1e-6);
}
vec3 craterField(vec3 pk) {
  vec3 g = vec3(0.0);
  mat3 rot = mat3(0.80, 0.36, -0.48, -0.60, 0.48, -0.64, 0.0, 0.80, 0.60);
  vec3 pr = rot * pk;
  g += craterLayer(pk, 16.0, 1.0, 1.0) + craterLayer(pr + 7.3, 16.0, 2.0, 1.0);
  g += craterLayer(pk, 8.0, 3.0, 1.0) + craterLayer(pr + 3.1, 8.0, 4.0, 1.0);
  g += craterLayer(pk, 4.0, 5.0, 0.95) + craterLayer(pr + 1.7, 4.0, 6.0, 0.95);
  g += craterLayer(pk, 2.0, 7.0, 0.9) + craterLayer(pr + 5.9, 2.0, 8.0, 0.9);
  g += craterLayer(pk, 1.0, 9.0, 0.9) + craterLayer(pr + 9.1, 1.0, 10.0, 0.9);
  g += craterLayer(pk, 0.5, 11.0, 0.85) + craterLayer(pr + 2.3, 0.5, 12.0, 0.85);
  return g;
}

float prof(float x, float depth, float floorR, float peak) {
  float rim = depth * 0.16;
  float h;
  if (x < 1.0) {
    if (x <= floorR) h = -depth;
    else {
      float t = (x - floorR) / (1.0 - floorR);
      float w = t * t * (3.0 - 2.0 * t);
      h = -depth + (depth + rim) * pow(max(w, 1e-4), 1.15);
    }
    if (peak > 0.5 && x < 0.22) h += depth * 0.32 * exp(-(x * x) / 0.0128);
    return h;
  }
  return rim * exp(-(x - 1.0) * 3.4) / (x * x);
}
vec3 namedCraterGrad(vec3 N) {
  vec3 g = vec3(0.0);
  for (int i = 0; i < 64; i++) {
    if (i >= uCrN) break;
    vec4 c = uCrC[i];
    vec4 q = uCrP[i];
    float dp = dot(N, c.xyz);
    if (dp < q.w) continue;
    float x = acos(clamp(dp, -1.0, 1.0)) * R_KM / c.w;
    float e = 0.015;
    float h1 = prof(x + e, q.x, q.z, q.y);
    float h0 = prof(max(x - e, 0.0), q.x, q.z, q.y);
    float dhdr = (h1 - h0) / ((x + e - max(x - e, 0.0)) * c.w);
    vec3 v = N - c.xyz * dp;
    float vl = length(v);
    if (vl < 1e-7) continue;
    g += dhdr * v / vl;
  }
  return g;
}

vec2 fixSeamX(float u0, out float dudx, out float dudy) {
  float u1 = fract(u0 + 0.5) - 0.5;
  float a = dFdx(u0), b = dFdx(u1);
  float c = dFdy(u0), d = dFdy(u1);
  dudx = abs(a) < abs(b) ? a : b;
  dudy = abs(c) < abs(d) ? c : d;
  return vec2(u0, u1);
}

float polarH(vec3 dir) {
  vec2 uv = dir.xz / SIN_CAP * 0.5 + 0.5;
  return textureLod(uPolar, uv, 0.0).r;
}

float terrainShadow(vec3 p0, vec3 sun, vec3 N, float jit) {
  float sh = 1.0;
  const int STEPS = 48;
  float tmax = 0.125;
  vec3 start = p0 + N * 0.00018;
  for (int i = 1; i <= STEPS; i++) {
    float f = (float(i) - jit) / float(STEPS);
    float t = tmax * pow(f, 1.7);
    vec3 q = start + sun * t;
    vec3 qd = normalize(q);
    if (qd.y > -cos(CAP) + 0.0004) break;
    float h = polarH(qd);
    float over = length(q) - (1.0 + h / R_KM);
    sh = min(sh, smoothstep(-0.00002, 0.00022 + 0.010 * t, over));
    if (sh <= 0.001) break;
  }
  return sh;
}

void main() {
  vec3 N = normalize(vDir);
  vec3 pk = N * R_KM;
  vec3 grad = vec3(0.0);
  float bright = 0.0;
  float mareM = 0.0;
  float psr = 0.0;
  float heightKm = 0.0;

  #ifdef PATCH
    vec2 uv = N.xz / SIN_CAP * 0.5 + 0.5;
    vec2 dx = dFdx(uv), dy = dFdy(uv);
    vec4 t = textureGrad(uPolar, uv, dx, dy);
    float st = max(1.0 / POLAR_N, 0.75 * max(length(dx), length(dy)));
    float hx1 = textureGrad(uPolar, uv + vec2(st, 0.0), dx, dy).r;
    float hx0 = textureGrad(uPolar, uv - vec2(st, 0.0), dx, dy).r;
    float hz1 = textureGrad(uPolar, uv + vec2(0.0, st), dx, dy).r;
    float hz0 = textureGrad(uPolar, uv - vec2(0.0, st), dx, dy).r;
    float kmPerUv = 2.0 * R_KM * SIN_CAP;
    grad = vec3((hx1 - hx0) / (2.0 * st * kmPerUv), 0.0, (hz1 - hz0) / (2.0 * st * kmPerUv));
    bright = t.g;
    psr = t.b;
    heightKm = t.r;
  #else
    float lon = atan(N.x, N.z);
    float u0 = lon / (2.0 * PI) + 0.5;
    float lat = asin(clamp(N.y, -1.0, 1.0));
    float v = lat / PI + 0.5;
    float dudx, dudy;
    vec2 uu = fixSeamX(u0, dudx, dudy);
    vec2 gx = vec2(dudx, dFdx(v));
    vec2 gy = vec2(dudy, dFdy(v));
    vec2 uv = vec2(u0, v);
    vec4 t = textureGrad(uGlobal, uv, gx, gy);
    float stu = max(1.0 / GLOBAL_N, 0.8 * max(abs(gx.x), abs(gy.x)));
    float stv = max(0.5 / GLOBAL_N, 0.8 * max(abs(gx.y), abs(gy.y)));
    float he1 = textureGrad(uGlobal, uv + vec2(stu, 0.0), gx, gy).r;
    float he0 = textureGrad(uGlobal, uv - vec2(stu, 0.0), gx, gy).r;
    float hn1 = textureGrad(uGlobal, uv + vec2(0.0, stv), gx, gy).r;
    float hn0 = textureGrad(uGlobal, uv - vec2(0.0, stv), gx, gy).r;
    float cl = max(cos(lat), 0.06);
    float dE = (he1 - he0) / (2.0 * stu * 2.0 * PI * R_KM * cl);
    float dNn = (hn1 - hn0) / (2.0 * stv * PI * R_KM);
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), N) + vec3(1e-5, 0.0, 0.0));
    vec3 north = cross(N, east);
    float tb = smoothstep(1.2, 5.0, uPxKm);
    grad = (dE * east + dNn * north) * 1.15 * tb;
    if (uCrN > 0) grad += namedCraterGrad(N) * (1.0 - tb);
    bright = t.g;
    mareM = t.b;
    heightKm = t.r;
  #endif

  // fine procedural detail
  grad += craterField(pk);
  vec3 gt = grad - N * dot(grad, N);
  vec3 n = normalize(N - gt);

  // albedo
  float nz = 0.5 * vnoise(pk / 220.0) + 0.3 * vnoise(pk / 60.0 + 3.0) + 0.2 * vnoise(pk / 17.0 + 8.0);
  float fine = vnoise(pk / 2.6) * smoothstep(1.0, 4.0, 2.6 / max(uPxKm, 1e-5)) + vnoise(pk / 0.7) * smoothstep(1.0, 4.0, 0.7 / max(uPxKm, 1e-5));
  nz += 0.12 * (fine - 0.5);
  float mare = smoothstep(0.40, 0.60, mareM + (nz - 0.5) * 0.45);
  float alb = mix(0.60, 0.19, mare) * (0.80 + 0.45 * nz);
  #ifdef PATCH
    alb *= 0.93;
  #endif
  alb += bright * 1.5;

  // lighting (Lommel–Seeliger-like, as the Moon is nearly flat at Full)
  vec3 V = normalize(uCam - vObj);
  float mu0g = dot(N, uSun);
  float mu0 = max(dot(n, uSun), 0.0);
  float mu = max(dot(n, V), 0.05);
  float term = smoothstep(-0.015, 0.045, mu0g);
  float sh = 1.0;
  #ifdef PATCH
    if (mu0g > 0.0 && mu0 > 0.0) {
      float jit = 0.5;
      sh = terrainShadow(N * (1.0 + heightKm / R_KM), uSun, N, jit);
    }
  #endif
  float direct = alb * mu0 / (mu0 + mu) * 2.0 * term * sh;
  float amb = alb * 0.075 * (0.6 + 0.4 * dot(n, N));
  float x = (direct + amb) * uExposure;
  vec3 col = vec3(1.0 - exp(-x * 1.25));
  col *= vec3(1.0, 0.985, 0.955);
  col = pow(col, vec3(0.92));

  #ifdef PATCH
    float ring = 1.0 - smoothstep(0.0, max(fwidth(psr) * 1.6, 0.02), abs(psr - 0.5));
    vec3 ice = vec3(0.42, 0.72, 1.0);
    col = mix(col, ice * (0.35 + col * 0.8), psr * 0.30 * uPsr);
    col = mix(col, vec3(0.55, 0.82, 1.0), ring * 0.8 * uPsr * step(0.05, psr + 0.5));
  #endif
  gl_FragColor = vec4(col, 1.0);
}
`;
