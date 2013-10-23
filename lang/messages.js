/* jshint node: true */
var _    = require('lodash'),
	fs   = require('fs'),
	path = require('path'),
	glob = require('glob'),
	YAML = require('js-yaml'),
	List = require('collections/list');

function flatten(original) {
	var q = new List,
		m = Object.create(null),
		o, b, i;

	q.push([[], original]);
	while ( q.length ) {
		o = q.shift();
		b = o[0];
		i = o[1];
		if ( _.isObject(i) ) {
			_.forOwn(i, function(v, k) {
				q.push([b.concat(k), v]);
			});
		} else {
			m[b.join('.')] = i
		}
	}

	return m;
}

function Lang() {}

Object.defineProperties(Lang.prototype, {
	code: {
		enumerable: false,
		configurable: true,
		set: function(code) {
			// Only permit code to be set on objects with none defined on themselves
			// ie: Not on the base prototype or on instances that already have a code.
			if ( _.has(this, 'code') ) {
				return false;
			}
			Object.defineProperties(this, {
				code: {
					value: code.toLowerCase(),
					configurable: true,
					enumerable: true,
					writable: false
				},
				originalCode: {
					value: code,
					configurable: true,
					enumerable: true,
					writable: false
				}
			});
		}
	},
	tree: {
		enumerable: false,
		configurable: true,
		set: function(tree) {
			// Reject changes to the prototype
			if ( this === Lang.prototype ) {
				return false;
			}
			Object.defineProperties(this, {
				// Set the standard tree
				tree: {
					value: tree,
					configurable: true,
					enumerable: true,
					writable: false
				},
				// Set the flat message map
				messages: {
					value: flatten(tree),
					configurable: true,
					enumerable: true,
					writable: false
				}
			});
		}
	}
});

Lang.fromString = function fromString(src, options) {
	options = options || {};
	
	var lang = new Lang;
	if ( options.lang ) {
		lang.code = options.lang;
	}
	lang.commentHeader = src.match(/^((#[^\r\n]*(?:\r\n|\n|\r))*)/)[0];
	lang.tree = YAML.safeLoad(src, {filename: options.filename});
	return lang;
};

Lang.fromFile = function fromFile(filename, options) {
	options = _.extend({ filename: filename }, options || {});
	return Lang.fromString(fs.readFileSync(filename, {encoding: "utf-8"}), options);
};

Lang.load = function load(lang) {
	return Lang.fromFile(path.join(path.dirname(module.filename), lang + '.yaml'), { lang: lang });
};

Lang.listLanguages = function listLanguages() {
	return glob.sync('*.yaml', {
		cwd: path.dirname(module.filename)
	}).map(function(filename) {
		return filename.replace(/\.yaml$/, '');
	});
};

module.exports = Lang;
