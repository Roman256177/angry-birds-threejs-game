varying float vHeight;

void main() {
    float particle = smoothstep(0.5, 1.0, 1.0 - distance(gl_PointCoord, vec2(0.5)));
    float fade = clamp((vHeight - 0.05) / 0.05, 0.0, 1.0);

    gl_FragColor = vec4(vec3(1.0), particle * fade);
}