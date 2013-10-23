#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This script builds the mangaperformer.js script. It must be re-executed every
# time the src/ js files, icons/ images, or mangaperformer.css are modified or a new language is added to lang/.

import os, sys, codecs, json, glob, tempfile, base64
import lang

# Add path to scour to the syspath before importing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'scour')))
import scour

# JS files in src/ except head.js and foot.js
srcjsfiles = [
	'event.js',
	'i18n.js',
	'extractor.js',
	'page.js',
	'manga.js',
	'preloader.js',
	'ui.js',
	'viewport.js',
	'pageoverview.js',
	'performer.js',
]

root_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
src_dir = os.path.join(root_dir, 'src')
lang_dir = os.path.join(root_dir, 'lang')
# scour_py = os.path.abspath(os.path.join(os.path.dirname(__file__), 'scour', 'scour.py'))
build_dir = root_dir
tmp_dir = tempfile.mkdtemp('mangaperformer')

scour_options, _ = scour._options_parser.parse_args([
	'--create-groups',
	'--enable-id-stripping',
	'--enable-comment-stripping',
	'--shorten-ids',
	'--remove-metadata',
])

source = u""

# Add header
with codecs.open(os.path.join(src_dir, 'head.js'), 'r', 'utf-8') as f:
	source += f.read()

# Add src/ js files
for filename in srcjsfiles:
	with codecs.open(os.path.join(src_dir, filename), 'r', 'utf-8') as f:
		source += f.read()

# Embed list of valid languages into the file
languages = list(lang.list_languages())
languages.sort()
source += u"\n\t// Valid language codes\n\ti18n.languages = %s;\n" % json.dumps(languages)

# Embed canonical English messages as fallback
source += u"\n\t// Canonical English message texts\n\ti18n.messages.en = %s;\n" % lang.format_json(lang.load_messages('en'))

# Embed mangaperformer.css into the file
with codecs.open(os.path.join(src_dir, 'mangaperformer.css')) as f:
	css_source = f.read()
	source += u"\n\t// src/mangaperformer.css\n\tvar MANGAPERFORMER_CSS = %s;\n" % json.dumps(css_source);

# Embed SVG image sources as data: URIs (after cleaning up the SVGs fwith scour)
icons = {}
for filename in glob.glob(os.path.join(root_dir, 'svg', '*.svg')):
	basename = os.path.basename(filename)
	tmp_filename = os.path.join(tmp_dir, basename)

	with open(filename, 'r') as f:
		data = scour.scourString(f.read(), scour_options)
		icons[basename.replace('.svg', '')] = u'data:image/svg+xml;base64,%s' % base64.b64encode(data)

source += u"\n\t// Cleaned up SVG icons from icons/\n\tvar MANGAPERFORMER_ICONS = %s;\n" % json.dumps(icons, sort_keys=True, indent=0)

# Add footer
with codecs.open(os.path.join(src_dir, 'foot.js'), 'r', 'utf-8') as f:
	source += f.read()

# Save file
with codecs.open(os.path.join(build_dir, 'mangaperformer.js'), 'w', 'utf-8') as f:
	f.write(source)
