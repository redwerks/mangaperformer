icons/
======
This directory contains the rasterized PNG and scoured SVG icons used by the manga/comic reader. It is copied into the dist/ directory as is when building.

These files shouldn't be edited directly. The original SVG files inside svg/ should be edited. And then bin/.py should be used to rebuild this directory from the source files.

Inkscape is used to rasterize the SVG files into PNG images. And an included copy of scour is used to create cleaned versions of the SVG files without unnecessary extras.
