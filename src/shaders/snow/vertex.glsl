uniform float uTime;
uniform float uHeight;

attribute float aSpeed;
attribute float aWind;
attribute float aSize;

varying float vHeight;

void main() {
    vec3 pos = position;

    pos.y = mod(position.y - uTime * aSpeed, uHeight);

    float wind = uTime + aWind;
    pos.x += sin(wind) * 1.25;
    pos.z += cos(wind) * 1.25;

    vec4 mvPos = viewMatrix * modelMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = aSize * (300.0 / -mvPos.z);

    vHeight = clamp(pos.y / uHeight, 0.0, 1.0);
}