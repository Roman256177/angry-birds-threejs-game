#define minY -13.46
#define maxY 44.57
#define rangeY (maxY - minY)
varying float vY;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vY = (position.y - minY) / rangeY;
}