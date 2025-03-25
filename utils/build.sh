#!/bin/bash

uglifyjs ../src/DCapture.js --compress --mangle -o ../build/DCapture.min.js
uglifyjs ../src/webm-writer-0.2.0.js ../src/download.js ../src/tar.js ../src/gif.js ../src/DCapture.js --compress --mangle -o ../build/DCapture.all.min.js
