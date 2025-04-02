import { defineConfig } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';
import generateAssetsPlugin from './vite-plugins/generate-assets-plugin';

export default defineConfig({
  server: {
    port: 4205
  },
  plugins: [
    generateAssetsPlugin(),
    classicEmberSupport(),
    ember(),
    // extra plugins here
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
