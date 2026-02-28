#define minY -13.46
#define maxY 44.57
varying float vY;

void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
    vY = (position.y - minY) / (maxY - minY);
}