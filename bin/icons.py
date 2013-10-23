#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import division, absolute_import
import sys, os, glob, subprocess, argparse

# Add path to scour to the syspath before importing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'scour')))
import scour

def icon_iter():
	root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
	svg_dir = os.path.join(root_dir, 'svg')
	icons_dir = os.path.join(root_dir, 'icons')
	svg_files = [os.path.basename(f) for f in os.listdir(svg_dir) if f.endswith('.svg')]
	for filename in svg_files:
		icon = {
			'src': os.path.join(svg_dir, filename),
			'dest_svg': os.path.join(icons_dir, filename),
			'dest_png': os.path.join(icons_dir, filename.replace('.svg', '.png')),
			'size': 34,
		}
		if filename.startswith('nav-'):
			icon['size'] = 40
		yield icon

scour_options, _ = scour._options_parser.parse_args([
	'--create-groups',
	'--enable-id-stripping',
	'--enable-comment-stripping',
	'--shorten-ids',
	'--remove-metadata',
])

def do_svg(icon):
	with open(icon['src'], 'r') as input_file:
		data = scour.scourString(input_file.read(), scour_options)
		with open(icon['dest_svg'], 'w') as output_file:
			output_file.write(data)

def do_png(icon, inkscape):
	subprocess.call([
		inkscape,
		'-z',
		icon['src'],
		'--export-png=%s' % icon['dest_png'],
		'--export-width=%s' % icon['size'],
		'--export-height=%s' % icon['size'],
	])

def find_inkscape(inkscape=None):
	def isexec(path):
		return os.path.isfile(path) and os.access(path, os.X_OK)

	# Use the explicitly defined binary if it exists and is executable
	if inkscape:
		if isexec(inkscape):
			return inkscape
		# @todo Use a logger
		# If it's unusable output a warning and continue to our normal detection method
		print "WARNING: Could not find inkscape at %s" % inkscape

	# Search PATH
	for path in os.environ["PATH"].split(os.pathsep):
		f = os.path.join(path.strip('"'), 'inkscape')
		if isexec(f):
			return f

	# Special case for OS X. Use the binary inside of the .app distributed at Inkscape.org 
	osx_path = '/Applications/Inkscape.app/Contents/Resources/bin/inkscape'
	if os.access( osx_path, os.X_OK ):
		return osx_path

	# @todo Logger
	print "ERROR: Could not find an Inkscape binary."
	exit(1)

def run(args=None):
	parser = argparse.ArgumentParser(
		description="Build MangaPerformer's icons/ folder by rasterizing and cleaning the svgs in svg/.")
	parser.add_argument('--inkscape',
		help="Specify an explicit path to the inkscape binary to execute to rasterize SVGs with.")
	ns = parser.parse_args(args=args)

	inkscape = find_inkscape(ns.inkscape)
	for icon in icon_iter():
		do_svg(icon)
		do_png(icon, inkscape=inkscape)

if __name__ == '__main__':
	run()
