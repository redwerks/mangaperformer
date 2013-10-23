#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This script executes inkscape from the cli to generate .png versions of the
# .svg icons in icons/.

import sys, os, glob, subprocess

# Determine the executable to use
if len(sys.argv) >= 2:
	# Accept the executable path as the first argument
	inkscape = sys.argv[1]
elif os.access( '/Applications/Inkscape.app/Contents/Resources/bin/inkscape', os.X_OK ):
	# Special case 
	inkscape = '/Applications/Inkscape.app/Contents/Resources/bin/inkscape'
else:
	# Fall back to a plain 'inkscape'
	inkscape = 'inkscape'

for filename in glob.glob( os.path.join( os.path.abspath( os.path.dirname( os.path.dirname( __file__ ) ) ), 'icons', '*.svg' ) ):
	basename = os.path.basename( filename )
	# if filename == 'prev.svg' or filename == 'next.svg':
	if filename.starts_with('nav-'):
		size = 40
	else:
		size = 34

	subprocess.call([
		inkscape,
		'-z',
		filename,
		'--export-png=%s' % filename.replace('.svg', '.png'),
		'--export-width=%s' % size,
		'--export-height=%s' % size,
	])
