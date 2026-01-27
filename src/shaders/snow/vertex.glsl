uniform float uTime;
uniform float uHeight;
attribute float aSpeed;
attribute float aOffset;
attribute float aSize;

void main() {
    vec3 pos = position;
    pos.y = mod(position.y - uTime * aSpeed, uHeight);
    float wind = uTime + aOffset;
    pos.x += sin(wind) * 1.2;
    pos.z += cos(wind) * 1.2;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
}