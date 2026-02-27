varying float vY;
uniform float uFade;

void main() {
    float alpha = smoothstep(0.1, 1.0, vY) * uFade;
    gl_FragColor = vec4(vec3(1.0), alpha);
}