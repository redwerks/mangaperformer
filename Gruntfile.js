/* jshint node: true */
var _      = require('lodash'),
	Q      = require('q'),
	path   = require('path'),
	fs     = require('fs'),
	grunt  = require('grunt'),
	recess = require('recess'),
	Lang   = require('./lang/messages');

// Grunt tasks don't need heavy performance, so make errors more helpful.
Q.longStackSupport = true;

module.exports = function(grunt) {
	"use strict";

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		banner:
			"/*!\n" +
			" * Manga Performer v<%= pkg.version %>\n" +
			" *\n" +
			" * A well featured web based comic/manga reader.\n" +
			" *\n" +
			" * Copyright © 2013 – <%= pkg.author.name %>\n" +
			// Start using this second line when 2013 ends
			// " * Copyright © 2013-<%= grunt.template.today('yyyy') %> – <%= pkg.author.name %>\n" +
			"<%= pkg.contributors.map(function(author) {" +
			"		return ' * @author ' + author.name + (author.url ? ' (' + author.url + ')' : '') + '\\n';" +
			"	}).join('') %>" +
			" *\n" +
			" * Manga Performer is dual-licensed under the following licenses:\n" +
			"<%= pkg.licenses.map(function(license) {" +
			"		return ' * @license ' + license.url + ' ' + license.type + '\\n';" +
			"	}).join('') %>" +
			" *\n" +
			" * Requires:\n" +
			" *   - Underscore.js\n" +
			" *   - jQuery (jquery.js) >=1.8\n" +
			" *   - jQuery Hotkeys Plugin (jquery.hotkeys.js)\n" +
			" *   - Hammer.js + jquery.hammer.js\n" +
			" */\n",

		fnwrapper: {
			open: '(function( window, $, _, undefined ) {',
			close: '})( window, jQuery, _ );'
		},

		clean: {
			dist: ['dist']
		},

		copy: {
			icons: {
				expand: true,
				src: ['icons/*.svg', 'icons/*.png'],
				dist: 'dist/icons/'
			}
		},

		'mangaperformer-js': {
			options: {
				banner: "<%= banner %><%= fnwrapper.open %>\n",
				footer: "\n\twindow.MangaPerformer = MangaPerformer;\n\n" +
					"<%= fnwrapper.close %>\n"
			},
			dist: {
				src: [
					'src/depcheck.js',
					'src/functions.js',
					'src/namespace.js',
					'src/event.js',
					'src/i18n.js',
					'src/extractor.js',
					'src/page.js',
					'src/manga.js',
					'src/preloader.js',
					'src/ui.js',
					'src/viewport.js',
					'src/pageoverview.js',
					'src/performer.js'
				],
				dest: 'dist/<%= pkg.name %>.js'
			}
		},

		'mangaperformer-lang': {
			dist: {
				options: {
					skip: ['en'],
					destPattern: 'mangaperformer.lang.{code}.js'
				},
				dest: 'dist'
			},
		},

		watch: {
			dist: {
				files: [
					'src/*.js',
					'src/mangaperformer.css',
					'icons/*.svg',
					'lang/*.yaml'
				],
				tasks: ['dist']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerMultiTask('mangaperformer-js', 'Build mangaperformer.js file.', function() {
		var f = this.files,
			options = this.options({
				banner: "",
				footer: ""
			}),
			done = this.async();

		var promises = this.files.map(function(f) {
			var promises = [
				// Banner
				Q.when(options.banner),

				Q.fcall(function() {
					var promises = _.flatten([
						// Concatenate JS files
						f.src.map(function(filename) {
							return Q.nfcall(fs.readFile, filename, "utf-8");
						}),

						// Output the list of known language codes.
						Q.fcall(function() {
							return [
								'\n',
								'// Valid language codes\n',
								'i18n.languages = ',
									JSON.stringify(
										Lang.listLanguages()
											.map(function(code) { return code.toLowerCase(); })
											.sort(),
										undefined, '\t'),
									';\n'
							].join('');
						}),

						// Build the English i18n data then embed it in a JavaScript variable.
						Q.fcall(function() {
							return [
								'\n',
								'// Canonical English message texts\n',
								'i18n.messages.en = ',
									JSON.stringify(Lang.load('en').messages, undefined, '\t'),
									';\n'
							].join('');
						}),

						// Embed the mangaperformer.css file inside of a JavaScript variable.
						Q.fcall(function() {
							var filename = 'src/mangaperformer.less';
							var deffered = Q.defer();
							var opts = {
								compile: true,
								compress: false
							};
							recess(filename, opts, function(err, obj) {
								if ( err ) {
									console.warn(err[0])
									deffered.reject(new Error(err[0].message));
									return;
								}

								deffered.resolve([
									'\n',
									'// ' + filename + '\n',
									'var MANGAPERFORMER_CSS = ',
										JSON.stringify(String(obj[0].output)),
										';\n'
								].join(''));
							});
							return deffered.promise;
						}),

						// Output the contents of the icons/*.svg files in data: URI strings.
						Q.fcall(function() {
							var icons = Object.create(null);
							grunt.file.expand({}, 'icons/*.svg')
								.forEach(function(filename) {
									var name = path.basename(filename).replace(/\.svg$/, '');
									var data = grunt.file.read(filename, { encoding: null });
									icons[name] = 'data:image/svg+xml;base64,' + data.toString('base64');
								});

							return [
								'\n',
								'// Cleaned up SVG icons from icons/\n',
								'var MANGAPERFORMER_ICONS = ',
									JSON.stringify(icons, undefined, '\t'),
									';\n'
							].join('');
						})
					]);

					return Q.all(promises)
						.then(function(sources) {
							var exports = [],
								sources = sources
									.join('')
									.replace(/(\s*)\bexport\s+((?:function|var)\s+([_$0-9a-zA-Z]+))\b/gm,
										function(m, a, b, name) {
											exports.push(name);
											return a + b;
										});

							sources += [
								'\n',
								'// Exports\n',
								exports
									.map(function(ident) {
										return ['MangaPerformer.', ident, ' = ', ident, ';\n'].join('');
									})
									.join('')
							].join('');

							// Indent stuff between the banner/footer with a tab.
							return sources
								.replace(/^(?=.)/gm, '\t');
						});
				}),

				// Footer
				Q.when(options.footer)
			];

			return Q.all(promises)
				.then(function(sources) {
					grunt.file.write(f.dest, sources.join(''));
					grunt.log.writeln('File "' + f.dest + '" created.');
				});
		});

		Q.all(promises)
			.then(function() {
				done();
			})
			.fail(function(reason) {
				done(reason instanceof Error ? reason : false);
			})
			.done();
	});

	grunt.registerMultiTask('mangaperformer-lang', 'Build language .js files.', function() {
		var f = this.files,
			options = this.options({
				skip: [],
				destPattern: '{code}.js'
			});
		options.skip = options.skip.map(function(code) {
			return String(code).toLowerCase();
		});

		this.files.forEach(function(f) {
			Lang.listLanguages()
				.filter(function(code) {
					return !_.contains(options.skip, code.toLowerCase());
				})
				.forEach(function(code) {
					var lang = Lang.load(code)
					var src = [
						'/*!',
						lang.commentHeader
							.replace(/\s*$/, '')
							.split(/(?:\r\n|\r|\n)/)
							.map(function(line) {
								return line
									.replace(/^#\s*/, '')
									.replace(/^[Aa]uthor:\s*/, '@author ')
									.replace(/^/, ' * ')
									.replace(/\s$/, '')
									// Just some random paranoia ;)
									.replace(/\*\//g, '');
							})
							.join('\n'),
						' */',
						[
							'MangaPerformer.i18n.messages[',
							JSON.stringify(lang.code),
							'] = ',
							JSON.stringify(lang.messages, undefined, '\t'),
							';'
						].join(''),
						'' // Trailing newline at end of file
					].join('\n');

					var dest = path.join(f.dest, options.destPattern.replace('{code}', lang.code));
					grunt.file.write(dest, src);
					grunt.log.writeln('File "' + dest + '" created.');
				});
		});
	});

	grunt.registerTask('dist-icons', ['copy']);
	grunt.registerTask('dist-js', ['mangaperformer-js']);
	grunt.registerTask('dist-lang', ['mangaperformer-lang']);

	// Full distribution task.
	grunt.registerTask('dist', ['clean', 'dist-icons', 'dist-js', 'dist-lang']);

	// Default task.
	grunt.registerTask('default', ['dist']);

};
