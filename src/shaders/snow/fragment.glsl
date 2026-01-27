void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    gl_FragColor = vec4(0.749, 0.839, 0.902, smoothstep(0.5, 0.0, d));
}