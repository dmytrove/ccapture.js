import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import { readFileSync } from 'fs';

// Read package.json manually since direct JSON imports require special handling in ESM
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const banner = `/*!
 * DCapture.js v${pkg.version}
 * A library to capture canvas-based animations at a fixed framerate
 * Based on CCapture.js (https://github.com/spite/ccapture.js)
 * 
 * Copyright (c) 2012-${new Date().getFullYear()}, Jaume Sanchez Elias
 * Licensed under the MIT license
 */`;

export default [
  // ESM build (for bundlers)
  {
    input: 'src/index.js',
    output: {
      file: pkg.module,
      format: 'es',
      banner
    },
    plugins: [
      resolve(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 0.25%, not dead' }]
        ]
      })
    ]
  },
  // UMD build
  {
    input: 'src/DCapture.js',
    output: {
      name: 'DCapture',
      file: 'build/DCapture.modern.js',
      format: 'umd',
      banner
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 0.25%, not dead' }]
        ]
      })
    ]
  },
  // Minified UMD build
  {
    input: 'src/DCapture.js',
    output: {
      name: 'DCapture',
      file: 'build/DCapture.modern.min.js',
      format: 'umd',
      banner
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 0.25%, not dead' }]
        ]
      }),
      terser({
        output: {
          comments: function(node, comment) {
            var text = comment.value;
            var type = comment.type;
            if (type === "comment2") {
              return /@preserve|@license|@cc_on/i.test(text);
            }
          }
        }
      })
    ]
  },
  
  // All-in-one builds
  // All-in-one build
  {
    input: 'src/DCapture.js',
    output: {
      name: 'DCapture',
      file: 'build/DCapture.all.js',
      format: 'umd',
      banner
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 0.25%, not dead' }]
        ]
      })
    ]
  },
  // All-in-one minified build (current main bundle)
  {
    input: 'src/DCapture.js',
    output: {
      name: 'DCapture',
      file: 'build/DCapture.all.min.js',
      format: 'umd',
      banner
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**',
        presets: [
          ['@babel/preset-env', { targets: '> 0.25%, not dead' }]
        ]
      }),
      terser({
        output: {
          comments: function(node, comment) {
            var text = comment.value;
            var type = comment.type;
            if (type === "comment2") {
              return /@preserve|@license|@cc_on/i.test(text);
            }
          }
        }
      })
    ]
  }
]; 