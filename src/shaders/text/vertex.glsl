varying float vY;
uniform float uMinY;
uniform float uMaxY;

void main() {
    vY = (position.y - uMinY) / (uMaxY - uMinY);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}