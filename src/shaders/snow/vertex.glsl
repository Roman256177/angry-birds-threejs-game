#define height 100.0
uniform float uTime;
attribute float aSpeed;
attribute float aWind;
attribute float aSize;
varying float vHeight;

void main() {
    vec3 pos = position;
    pos.y = mod(position.y - uTime * aSpeed, height);
    float wind = uTime + aWind;
    pos.x += sin(wind) * 1.5;
    pos.z += cos(wind) * 1.5;
    vec4 mvPos = viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    vHeight = pos.y / height;
}