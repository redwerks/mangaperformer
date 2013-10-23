#!/usr/bin/env python
# -*- coding: utf-8 -*-

import re, os, json, yaml, codecs, subprocess, argparse
from collections import deque

root_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
src_dir = os.path.join(root_dir, 'src')
lang_dir = os.path.join(root_dir, 'lang')
build_dir = root_dir

def format_json(obj):
	return json.dumps(obj,
		# If we don't sort it then built files won't be stable enough to be in git
		sort_keys=True,
		# We already have UTF-8 in the JS sources. These files should be sent with proper UTF-8 encodings.
		ensure_ascii=False,
		# These two trigger some minor pretty-printing with each comma getting a newline after it instead of a space.
		indent=0,
		separators=(',', ': '))

def load_messages(lang):
	def flatten(d):
		flat = {}
		q = deque()
		q.append(((), d))
		while len(q) > 0:
			base,i = q.popleft()
			if isinstance(i, dict):
				for k, v in i.iteritems():
					q.append((base+(k,), v))
			else:
				flat['.'.join(map(unicode, base))] = i
		return flat

	with file(os.path.join(lang_dir, '%s.yaml' % lang)) as f:
		return flatten(yaml.safe_load(f))

def list_languages():
	return set([f[0:-5] for f in os.listdir(lang_dir) if f.endswith('.yaml')])

def run_action_extract(args):
	output_path = os.path.join(lang_dir, 'messages.pot')

	cmd = [
		'xgettext',
		'--from-code=utf-8',
		'--language=perl',
		'--keyword=__',
		'--sort-by-file',
		'--copyright-holder=Redwerks Systems Inc.',
		'--package-name=MangaPerformer',
		'--msgid-bugs-address=daniel@redwerks.org',
		'--output=%s' % output_path
	]

	js_files = [f for f in os.listdir(src_dir) if f.endswith('.js')]
	js_files.sort()

	os.chdir(root_dir)
	for filename in js_files:
		cmd.append('src/%s' % filename)

	subprocess.check_call(cmd)

	with codecs.open(output_path, 'r+', encoding='utf-8') as f:
		content = f.read()

		pattern = re.compile(ur'^("Content-Type: text/plain; charset=)CHARSET(.*)$', re.UNICODE | re.MULTILINE)
		content = re.sub(pattern, ur'\1UTF-8\2', content)

		pattern = re.compile(ur'^(# This file is distributed under the same license as the) PACKAGE (package).$', re.UNICODE | re.MULTILINE)
		content = re.sub(pattern, ur'\1 MangaPerformer \2', content)

		f.seek(0)
		f.write(content)
		f.truncate()

	pass

def run_action_export(args):
	for lang in list_languages():
		if lang == 'en':
			continue
		messages = load_messages(lang)
		with codecs.open(os.path.join(build_dir, 'mangaperformer.lang.%s.js' % lang.lower()), 'w', encoding='utf-8') as f:
			source = u"""/**
 * MangaPerformer internationalization strings: %s
 * Copyright © 2013 – Redwerks Systems Inc.
 * Internationalization texts are CC-0 (https://creativecommons.org/publicdomain/zero/1.0/)
 */
MangaPerformer.i18n.messages[%s] = %s;
"""
			f.write(source % (messages['language'], json.dumps(lang.lower()), format_json(messages)))
	pass

def run_args(args=None):
	parser = argparse.ArgumentParser(
		description="Manage MangaPerformer's lang files.")
	subparsers = parser.add_subparsers(
		help="The management action to perform.",
		dest='action')

	parser_extract = subparsers.add_parser('extract',
		help="Rebuild the messages.pot file, re-extracting translation strings from the source.")
	parser_extract.set_defaults(func=run_action_extract)

	parser_export = subparsers.add_parser('export',
		help="Rebuild the language .js files used by the library.")
	parser_export.set_defaults(func=run_action_export)

	ns = parser.parse_args(args=None)
	ns.func(ns)

if __name__ == '__main__':
	run_args()
