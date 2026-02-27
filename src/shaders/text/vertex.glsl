#define minY -13.463
#define maxY 44.571
varying float vY;

void main() {
    vY = (position.y - minY) / (maxY - minY);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}