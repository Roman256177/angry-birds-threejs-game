import glsl from "vite-plugin-glsl";
import { defineConfig } from "vite";

export default defineConfig({
	root: "src/",
	publicDir: "../static/",

	server: {
		host: true,
		open: !("SANDBOX_URL" in process.env || "CODESANDBOX_HOST" in process.env),
	},

	build: {
		outDir: "../dist",
		emptyOutDir: true,
		sourcemap: true,
		rollupOptions: {
			output: {
				manualChunks: {
					three: ["three"],
					cannon: ["cannon-es"],
					gsap: ["gsap"],
				},
			},
		},
	},

	plugins: [glsl()],
});
