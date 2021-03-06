/*!
 * Manga Performer v0.0.0-dev
 *
 * A well featured web based comic/manga reader.
 *
 * Copyright © 2013 – Redwerks Systems Inc.
 * @author Daniel Friesen (http://danielfriesen.name/)
 *
 * Manga Performer is dual-licensed under the following licenses:
 * @license https://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0
 * @license https://www.gnu.org/licenses/old-licenses/gpl-2.0.html GNU General Public License, version 2 or later
 *
 * Requires:
 *   - Underscore.js or Lo-Dash
 *   - jQuery (jquery.js) >=1.8
 *   - jQuery Hotkeys Plugin (jquery.hotkeys.js)
 *   - Hammer.js + jquery.hammer.js
 */
(function( window, $, _, undefined ) {
	"use strict";

	(function() {
		var ok = true,
			has = {
				_: true,
				$: true
			};

		function err( msg ) {
			if ( window.console && console.error ) {
				console.error( msg );
			}
			ok = false;
		}

		if ( typeof _ !== 'function'
			|| typeof _.each !== 'function' ) {
			err( "One of either Underscore.js or Lo-Dash is not loaded." );
			has._ = false;
		}

		if ( typeof $ !== 'function'
			|| typeof $.fn !== 'object'
			|| typeof $.fn.jquery !== 'string' ) {
			err( "jQuery is not loaded." );
			has.$ = false;
		} else {
			// We don't use parseHTML. However we do use jQuery's automatic handling of vendor
			// prefixes. Both of these were introduced in 1.8. We can't feature test vendor prefix
			// handling so we'll have to feature test parseHTML instead.
			if ( !$.Deferred || !$.fn.on || !$.parseHTML ) {
				err( "jQuery is too old, need at least 1.8." );
				has.$ = false;
			}
		}

		if ( typeof $.hotkeys !== 'object' ) {
			err( "jQuery Hotkeys Plugin is not loaded." );
		}

		if ( typeof window.Hammer !== 'function' ) {
			err( "Hammer.js is not loaded." );
		}

		if ( has.$ && typeof $.fn.hammer !== 'function' ) {
			err( "jquery.hammer.js is not loaded." );
		}

		if ( !ok ) {
			throw new Error( "One of MangaPerformer's dependencies was not present." );
		}
	})();

	var create = Object.create || function ( prototype ) {
			function Type() {}
			Type.prototype = prototype;
			return new Type;
		},
		freeze = Object.freeze || function() {},
		ArrayPush = [].push;

	function warn( msg ) {
		if ( window.console && console.warn ) {
			console.warn( msg );
		}
	}

	function now() {
		return +new Date;
	}

	/**
	 * Namespace for the Manga Performer library.
	 *
	 * This is available on the global window object.
	 * We document it as a class because otherwise JSDuck
	 * won't let us properly document registerDataExtractor.
	 *
	 * @class MangaPerformer
	 * @singleton
	 */
	var MangaPerformer = {};

	// Special key, should be overridden by the user.
	MangaPerformer.BASE = '.';

	/**
	 * Internal object containing information on browser support for various features.
	 * @singleton
	 * @private
	 */
	var Supports = {};

	(function() {

		var $test = $( '<div></div>' ),
			testDiv = $test[0];

		/**
		 * @property {boolean}
		 * Indicates support for SVG images in this browser.
		 * @readonly
		 */
		Supports.svg = document.implementation.hasFeature( "http://www.w3.org/TR/SVG11/feature#Image", "1.1" );

		/**
		 * @property {boolean}
		 * Indicates support for basic CSS Transforms.
		 * @readonly
		 */
		// Use jQuery to test for css3-transforms support. Thanks to the vendor prefix handling.
		// jQuery added in 1.8 we don't need to explicitly test individual vendor prefixed versions
		// of the transform property.
		Supports.transform = !!$test
			.css( 'transform', '' ) // reset
			.css( 'transform', 'translate(0,0)' )
			.css( 'transform' );

		/**
		 * @property {boolean}
		 * Indicates support for 3D CSS Transforms.
		 * @readonly
		 */
		Supports.transform3D = !!$test
			.css( 'transform', '' ) // reset
			.css( 'transform', 'translate3d(0,0,0)' )
			.css( 'transform' );

		/**
		 * @property {boolean}
		 * Indicates support for CSS Transitions.
		 * @readonly
		 */
		Supports.transition = false;

		/**
		 * @property {undefined|string}
		 * Indicates what event name(s) to use for the transitionend event.
		 * @readonly
		 */
		Supports.transitionEndEvents = undefined;

		var transitionEndEvents = {
			'transition'       : 'transitionend',
			'MozTransition'    : 'transitionend',
			'OTransition'      : 'otransitionend oTransitionEnd',
			'WebkitTransition' : 'transitionend webkitTransitionEnd',
			'msTransition'     : 'MSTransitionEnd'
		};
		for ( var propName in transitionEndEvents ) {
			if ( propName in testDiv.style ) {
				Supports.transition = true;
				Supports.transitionEndEvents = transitionEndEvents[propName];
				break;
			}
		}

		/**
		 * @property {undefined|Object}
		 * Indicates whether the Page Visibility API is supported
		 * and what the property and event names are.
		 * @readonly
		 */
		Supports.pageVisibility = undefined;

		var pageVisibility = {
			'hidden'       : 'visibilitychange',
			'mozHidden'    : 'mozvisibilitychange',
			'msHidden'     : 'msvisibilitychange',
			'webkitHidden' : 'webkitvisibilitychange'
		};
		for ( var hiddenProp in pageVisibility ) {
			if ( hiddenProp in document ) {
				Supports.pageVisibility = {
					hidden: hiddenProp,
					visibilitychange: pageVisibility[hiddenProp]
				};
				break;
			}
		}

	})();

	/**
	 * Class implementing an event emitter that can be applied
	 * to any custom object.
	 *
	 * @class MangaPerformer.Events
	 * @alternateClassName Events
	 */
	function Events() {
	}

	/**
	 * Binds an event handler to the object for a set of events.
	 *
	 * @param {string} eventNames Space separated list of event names to bind to.
	 * @param {Function} handler The function to bind to the event.
	 * @param {boolean} [once=false] Only fire the handler once if true. It's
	 *   preferred to use Events#once instead of this param.
	 * @chainable
	 */
	Events.prototype.on = function( eventNames, handler, once ) {
		var self = this;
		_.each( $.trim( eventNames ).split( /\s+/ ), function( eventName ) {
			eventName = '_event_' + eventName;
			self[eventName] = self[eventName] || [];
			self[eventName].push( {
				h: handler,
				once: !!once
			} );
		} );
		return self;
	};

	/**
	 * Binds an event handler to the object for a set of events
	 * such that it'll only be executed once.
	 *
	 * @param {string} eventNames Space separated list of event names to bind to.
	 * @param {Function} handler The function to bind to the event.
	 * @chainable
	 */
	Events.prototype.once = function( eventNames, handler ) {
		return this.on( eventNames, handler, true );
	};

	/**
	 * Unbind event handlers for a bunch of events.
	 * If handlers is not passed this will remove all handlers for those events.
	 *
	 * @param {string} eventNames Space separated list of event names.
	 * @param {Function|Function[]} handlers The registered handlers to unbind.
	 * @chainable
	 */
	Events.prototype.off = function( eventNames, handlers ) {
		var self = this;
		if ( _.isFunction( handlers ) ) {
			handlers = [handlers];
		}
		_.each( $.trim( eventNames ).split( /\s+/ ), function( evName ) {
			var eventName = '_event_' + evName;
			if ( !_.has( self, eventName ) ) {
				return;
			}

			if ( handlers ) {
				self[eventName] = _.reject( self[eventName], function( ev ) {
					return _.indexOf( handlers, ev.h ) !== -1;
				} );
			} else {
				self[eventName] = [];
			}
		} );
		return self;
	};

	/**
	 * Emit an event calling all event handlers registered for these events on the object.
	 *
	 * @param {string} eventNames Space separated list of event names to emit.
	 * @param {Object|undefined} context The context `this` to call the event handlers with.
	 * @param {Array} args The args to call the event handlers with.
	 * @chainable
	 */
	Events.prototype.emitWith = function( eventNames, context, args ) {
		var self = this;
		_.each( $.trim( eventNames ).split( /\s+/ ), function( evName ) {
			var eventName = '_event_' + evName;
			if ( !_.has( self, eventName ) ) {
				return;
			}

			var once = [];
			_.each( self[eventName], function( ev ) {
				ev.h.apply( context, args );
				if ( ev.once ) {
					once.push( ev.h );
				}
			} );

			if ( once.length ) {
				self.off( evName, once );
			}
		} );
		return self;
	};

	/**
	 * Emit an event with an undefined/global `this` context. See Events#emitWith
	 * and a single event object argument. The object passed as the first argument
	 * will be augmented with a type property identifying the fired event.
	 *
	 * @param {string} eventNames Space separated list of event names to emit.
	 * @param {Object} event The initial "event" argument to call the event handlers with.
	 * @param {Mixed...} args The additional args to call the event handlers with.
	 * @chainable
	 */
	// Events.prototype.emit = function( eventNames, event ) {
	// 	event = event || {};}
	// 	var args = [ eventNames, undefined, _.rest( arguments ) ];
	// 	return this.emitWith.apply( this, args );
	// };

	/**
	 * Emit an event. See Events#emitWith.
	 * The object this is called on is used as the context.
	 *
	 * @param {string} eventNames Space separated list of event names to emit.
	 * @param {Mixed...} args The args to call the event handlers with.
	 * @chainable
	 */
	Events.prototype.emit = function( eventNames ) {
		var args = [ eventNames, this, _.rest( arguments ) ];
		return this.emitWith.apply( this, args );
	};

	/**
	 * Mix the event emitter into an object. This adds on, once, off, emitWith, and
	 * emit methods onto the object. These methods proxy a Events instance on a
	 * private property. So a property name not in use by the object must be used.
	 * However as a result this means it's possible to mixin to the prototype of
	 * a class.
	 *
	 * @param {Object} The object to mixin to.
	 * @param {string} [privateName="_events"] The private name to use on the object.
	 * @static
	 */
	Events.mixin = function( obj, privateName ) {
		privateName = privateName || '_events';
		_.each( [ 'on', 'once', 'off', 'emitWith', 'emit' ], function( method ) {
			obj[method] = function() {
				var self = this;
				self[privateName] = self[privateName] || new Events;
				self[privateName][method].apply( self, arguments );
				return self;
			};
		} );
	};

	/**
	 * Object in charge of internationalization text.
	 * @class MangaPerformer.i18n
	 * @alternateClassName i18n
	 * @extends Events
	 * @singleton
	 */
	var i18n = {
		// @todo Document methods and properties
		/**
		 * @property {string}
		 * The language code of the current language set to output in the UI.
		 * @readonly
		 */
		language: 'en',

		/**
		 * @property {string[]}
		 * An internal list of valid language codes.
		 * Used when picking the automatic language from the document so that lang="en-US"
		 * will result in 'en' being picked when we don't have something specific to en-US.
		 * @private
		 * @readonly
		 */
		languages: ['en'],

		/**
		 * @property {object}
		 * An internal map of language codes to fingerprints.
		 * Used as a cache buster to allow far expiration times for language files.
		 * @private
		 * @readonly
		 */
		languageFingerprints: {},

		/**
		 * @property {Object}
		 * A map of language codes to promises that will be resolved when the language is available.
		 * @private
		 */
		loadedLanuages: {},
		
		/**
		 * @property {Object}
		 * The object storing loaded message contents for each language.
		 * Stored as i18n.messages[langCode][messageName]
		 * @private
		 */
		messages: {},

		detectLanguage: function() {
			i18n.setLanguage( $( 'body' ).closest( '[lang]' ).attr( 'lang' ) || 'en' );
		},

		setLanguage: function( code ) {
			code = String( code ).toLowerCase() || 'en';
			if ( i18n.language === code ) {
				return;
			}

			i18n.fetchLanguage( code )
				.done( function() {
					i18n.language = code;
					i18n.emit( 'languagechanged' );
				});
		},

		/**
		 * Return the script url for a MangaPerformer language file.
		 * This can be overridden if your environment has special handling like loading all resources through
		 * a specific resource loading script.
		 * @param {string} lang The language code.
		 */
		getLanguageURL: function( lang ) {
			var query = i18n.languageFingerprints[lang]
				? '?_=' + encodeURIComponent( i18n.languageFingerprints[lang] )
				: '';
			return MangaPerformer.BASE + '/mangaperformer.lang.' + lang.toLowerCase() + '.js' + query;
		},

		// Should this be @private?
		fetchLanguage: function( lang ) {
			lang = lang.toLowerCase();
			if( !_.has( i18n.loadedLanuages, lang ) ) {
				var deferred = $.Deferred();
				if ( _.has( i18n.messages, lang ) ) {
					// If the messages for this language have already been loaded
					// eg: Always for English as it's embedded into the file.
					//     Or the user pre-loaded the language with a script tag.
					deferred.resolve();
				} else {
					$.ajax({
						url: i18n.getLanguageURL( lang ),
						type: 'get',
						dataType: 'script',
						cache: true,
						success: function() {
							deferred.resolve();
						}
					});
				}
				i18n.loadedLanuages[lang] = deferred.promise();
			}

			return i18n.loadedLanuages[lang];
		},

		// Should this be @private?
		getMessage: function( name, lang ) {
			var m = i18n.messages;
			lang = lang.toLowerCase();
			if ( _.has( m, lang ) && _.has( m[lang], name ) ) {
				return m[lang][name];
			}
			if ( _.has( m.en, name ) ) {
				warn( name + ' not found for ' + lang + ' falling back to English language message.' );
				return m.en[name];
			}
			warn( name + ' not found in ' + lang + ' or English language, outputting {' + name + '}', name, lang, name );
			return '{' + name + '}';
		},
		__: function( name ) {
			return i18n.getMessage( name, i18n.language );
		}
	};

	Events.mixin( i18n );

	var __ = {
		t: function() {
			return i18n.__.apply( this, arguments );
		},
		f: function( name ) {
			return _.partial( __.t, name );
		}
	};

	var extractors = {};

	/**
	 * @member MangaPerformer
	 * @method registerDataExtractor
	 * Register an extractor to fill a {@link Manga} object with metadata and pages.
	 *
	 * The callback will accept the Manga object as the `this` and is expected to construct
	 * the proper {@link Page} and {@link PagePair} instances and add them to the object.
	 *
	 * The callback can vary in what kind of data it works with. The extractor could take a
	 * simple JSON object with all the page data and build the comic/manga from that. Or it
	 * could take a selector pointing to a location in a DOM where all the pages of the
	 * comic/manga happen to be output. In some format such as a list of linked images or
	 * some other format like RDFa then build the comfig/manga from that.
	 *
	 * @param {string} format The name of the extractor to register.
	 * @param {Function} callback The callback function to register for the extractor.
	 * @param {Object} callback.data The extractor data passed to Manga#extractMangaData.
	 */
	function registerDataExtractor( format, callback ) {
		if ( !$.isFunction( callback ) ) {
			throw new TypeError( "Data extractor callback must be a function." );
		}
		extractors[format] = callback;
	}

	/**
	 * Common implementation of getConstrained that'll be used
	 * by both PageList and PagePairList.
	 * @ignore
	 */
	function getConstrained( idx ) {
		/* jshint validthis:true */
		if ( idx < 0 ) {
			return this[0];
		}
		if ( idx >= this.length ) {
			return this[this.length-1];
		}
		return this[idx];
	}

	/**
	 * Class representing a single page in a manga/comic.
	 * @class MangaPerformer.Page
	 * @alternateClassName Page
	 */
	function Page() {
		/**
		 * @property {String|undefined}
		 * The URL of the full image for the page.
		 */
		this.src = undefined;

		/**
		 * @property {String|undefined}
		 * The URL of the thumbnail image for the page.
		 */
		this.thumb = undefined;

		/**
		 * @property {Number|undefined}
		 * The page number for the page.
		 * Leave undefined for some special pages like the cover.
		 */
		this.num = undefined;

		/**
		 * @property {PageList}
		 * The list of pages.
		 * @readonly
		 */
		this.pages = undefined;

		/**
		 * @property {PageList}
		 * Alias of Page#pages.
		 * @readonly
		 */
		this.list = undefined;

		/**
		 * @property {number}
		 * The page's index within the list of pages.
		 * @readonly
		 */
		this.idx = undefined;

		/**
		 * @property {PagePair}
		 * The page pair this page belongs to.
		 * @readonly
		 */
		this.pair = undefined;

		/**
		 * @property {Page|undefined}
		 * The previous page if any.
		 * @readonly
		 */
		this.prev = undefined;

		/**
		 * @property {Page|undefined}
		 * The next page if any.
		 * @readonly
		 */
		this.next = undefined;
	}

	/**
	 * Class representing a list of all the pages in a manga/comic.
	 * @class MangaPerformer.PageList
	 * @alternateClassName PageList
	 * @uses Page
	 */
	function PageList( manga ) {
		/**
		 * @property {number}
		 * The length of the list.
		 * @readonly
		 */
		this.length = 0;

		/**
		 * @property {Manga}
		 * The manga/comic these pages belong to.
		 * @readonly
		 */
		this.manga = manga;
	}

	/**
	 * Add a new page to the page list.
	 *
	 * @param {Page} page The page.
	 */
	PageList.prototype.add = function( page ) {
		ArrayPush.call( this, page );
	};

	/**
	 * Return the page at an index but do so constraining the index
	 * such that an index below 0 returns the first page and an
	 * index after the end of the list returns the last page.
	 *
	 * @param {number} idx The index.
	 * @return {Page}
	 */
	PageList.prototype.getConstrained = getConstrained;

	/**
	 * Class representing a pair of one or two pages in a 2-page spread.
	 * @class MangaPerformer.PagePair
	 * @alternateClassName PagePair
	 * @uses Page
	 */
	function PagePair() {
		/**
		 * @property {number}
		 * The length of the list.
		 * @readonly
		 */
		this.length = 0;

		/**
		 * @property {PagePairList}
		 * The list of page pairs.
		 * @readonly
		 */
		this.pairs = undefined;

		/**
		 * @property {PagePairList}
		 * Alias of PagePair#pairs.
		 * @readonly
		 */
		this.list = undefined;

		/**
		 * @property {number}
		 * The pair's index within the list of page pairs.
		 * @readonly
		 */
		this.idx = undefined;

		/**
		 * @property {Page|undefined}
		 * The previous page pair if any.
		 * @readonly
		 */
		this.prev = undefined;

		/**
		 * @property {Page|undefined}
		 * The next page pair if any.
		 * @readonly
		 */
		this.next = undefined;
	}

	/**
	 * Add page to the page pair.
	 *
	 * @param {Page} page The page.
	 * @throws {Error} When there are already 2 pages in the pair.
	 */
	PagePair.prototype.add = function( page ) {
		if ( this.length >= 2 ) {
			throw new Error( "Only two pages are permitted in a page pair." );
		}
		ArrayPush.call( this, page );
	};

	/**
	 * Class representing a list of all 2-page spread page pairs in a manga/comic.
	 * @class MangaPerformer.PagePairList
	 * @alternateClassName PagePairList
	 * @uses PagePair
	 */
	function PagePairList( manga ) {
		/**
		 * @property {number}
		 * The length of the list.
		 * @readonly
		 */
		this.length = 0;

		/**
		 * @property {Manga}
		 * The manga/comic these page pairs belong to.
		 * @readonly
		 */
		this.manga = manga;
	}

	/**
	 * Add a new page pair to the page pair list.
	 *
	 * @param {PagePair} pair The page pair.
	 */
	PagePairList.prototype.add = function( pair ) {
		ArrayPush.call( this, pair );
	};

	/**
	 * Return the page pair at an index but do so constraining the
	 * index such that an index below 0 returns the first pair and an
	 * index after the end of the list returns the last pair.
	 *
	 * @param {number} idx The index.
	 * @return {PagePair}
	 */
	PagePairList.prototype.getConstrained = getConstrained;

	/**
	 * Class representing an entire manga/comic including its pages and metadata such as directionality.
	 *
	 * @param cfg Some config metadata for the manga/comic. Most of these may be overridden by an extractor.
	 * @param {"ltr"|"rtl"} [cfg.dir="ltr"] The page directionality of the comic/manga.
	 *   Typically "rtl" for manga and "ltr" for comics and the rare flipped manga translations.
	 * @param {string} [cfg.title] The title of the comic/manga. Used when creating a window title.
	 * @param {number} [cfg.thumbHeight=200] The image height to display thumbnails at.
	 *   Used to ensure uniform thumbnail heights and allow the use of a retina resolution trick using
	 *   highly compressed progressive JPEG images with a larger than displayed resolution.
	 * @class MangaPerformer.Manga
	 * @alternateClassName Manga
	 * @uses PageList
	 * @uses PagePairList
	 */
	function Manga( cfg ) {
		cfg = cfg || {};

		/**
		 * @property {Boolean}
		 * The page directionality of the comic/manga.
		 *   true: "rtl" page order like in most manga.
		 *   false: "ltr" page order like in comics and the rare flipped manga.
		 */
		this.rtl = ( cfg.dir === 'rtl' );

		/**
		 * @property {string}
		 * The title of the comic/manga. Used when creating a window title.
		 */
		this.title = cfg.title;

		/**
		 * @property {number}
		 * The height to use for thumbnail images.
		 */
		this.thumbHeight = cfg.thumbHeight || 200;

		/**
		 * @property {PageList}
		 * The list of pages in this manga/comic.
		 * @readonly
		 */
		this.pages = new PageList( this );

		/**
		 * @property {PagePairList}
		 * The list of page pairs in this manga/comic.
		 * @readonly
		 */
		this.pagePairs = new PagePairList( this );

		/**
		 * @property {Preloader}
		 * A Preloader for this manga/comic.
		 * @private
		 * @readonly
		 */
		this._preloader = undefined;

		/**
		 * @property {boolean}
		 * Is this manga/comic frozen.
		 * @readonly
		 */
		this.frozen = false;
	}

	/**
	 * Use an extractor to setup the manga/comic pages and metadata using some extractor specific data.
	 * 
	 * @param {string} format The name of the extractor registered with {@link MangaPerformer.registerDataExtractor} to use.
	 * @param {Object} data The data to pass to the extractor.
	 */
	Manga.prototype.extractMangaData = function( format, data ) {
		if ( !extractors.hasOwnProperty( format ) || !$.isFunction( extractors[format] ) ) {
			throw new Error( "Extractor " + format + " does not exist." );
		}
		extractors[format].call( this, data );
	};

	/**
	 * Return a Preloader instance for this manga.
	 *
	 * @return {Preloader}
	 */
	Manga.prototype.getPreloader = function() {
		if ( !this._preloader ) {
			this._preloader = new Preloader( this );
		}
		return this._preloader;
	};

	/**
	 * Freeze the manga creating next/prev properties on all pages and
	 * page pairs. And when possible freezing the actual object properties.
	 */
	Manga.prototype.freeze = function() {
		if ( this.frozen ) {
			return;
		}

		var pages = this.pages,
			pairs = this.pagePairs;

		/* jshint -W004 */
		for ( var i = 0, l = pairs.length; i < l; i++ ) {
			var pair = pairs[i];
			pair.list = pair.pairs = pairs;
			pair.idx = i;
			pair.prev = i > 0
				? pairs[i-1]
				: undefined;
			pair.next = i < pairs.length - 1
				? pairs[i+1]
				: undefined;

			// Attach the pair to the page. Do this before we loop
			// over the pages themselves and then freeze them.
			_.each( pair, function( page ) {
				page.pair = pair;
			} );

			freeze( pair );
		}

		for ( var i = 0, l = pages.length; i < l; i++ ) {
			var page = pages[i];
			page.list = page.pages = pages;
			page.idx = i;
			page.prev = i > 0
				? pages[i-1]
				: undefined;
			page.next = i < pages.length - 1
				? pages[i+1]
				: undefined;

			// We need to deal with _img and _thumb before we can actually freeze a page.
			// freeze( page );
		}
		/* jshint +W004 */

		// Freeze the lists
		freeze( pairs );
		freeze( pages );

		// Properties cannot be modified after an object is frozen so we must
		// mark it as frozen before we actually freeze it.
		this.frozen = true;

		// We need to deal with _preloader before we can actually freeze the manga.
		// freeze( this );
	};

	/**
	 * Start playing/performing this manga/comic.
	 */
	Manga.prototype.play = function() {
		this.freeze();
		Performer.play( this );
	};

	/**
	 * A class that handles preloading the thumbnails and images
	 * for a manga/comic.
	 * @param {Manga} The manga to preload images for.
	 * @extends Events
	 * @private
	 */
	function Preloader( manga ) {
		/**
		 * @property {Manga} manga
		 * The manga to preload images for.
		 * @readonly
		 */
		this.manga = manga;

		/**
		 * @property {Object} pages
		 * A state object for the preloading of page images.
		 * @readonly
		 */
		this.pages = {
			urlKey: 'src',
			imgKey: '_img',
			className: 'mangaperformer-pagesource',
			inProgress: 0,
			nextIndex: 0,
			finished: 0,
			running: false
		};

		/**
		 * @property {Object} thumbs
		 * A state object for the preloading of page thumbnails.
		 * @readonly
		 */
		this.thumbs = {
			urlKey: 'thumb',
			imgKey: '_thumb',
			className: 'mangaperformer-pagethumb',
			inProgress: 0,
			nextIndex: 0,
			finished: 0,
			running: false
		};
	}

	Events.mixin( Preloader.prototype );

	/**
	 * @property {number}
	 * The maximum number of images of a type to preload at the same time.
	 * @static
	 */
	Preloader.maxConcurrentPreloads = 2;

	/**
	 * Return the hidden dom node preloaded images are put into.
	 * And create it if if doesn't yet exist.
	 * @return {jQuery} The node.
	 * @static
	 */
	Preloader.getNode = function() {
		var $preloader = $( '#mangaperformer-preloader' );
		if ( $preloader.length ) {
			return $preloader;
		}

		return $( '<div id="mangaperformer-preloader" aria-hidden="true"></div>' )
			.attr( 'aria-hidden', 'true' )
			.css( 'visibility', 'collapse' )
			.css( 'display', 'none' )
			.appendTo( 'body' );
	};

	/**
	 * Helper function for other code that given a list of image nodes returns
	 * a promise that will be resolved or rejected when enough of all the images
	 * have loaded enough to determine all their sizes.
	 *
	 * @param {jQuery|HTMLImageElement|HTMLImageElement[]} images The image nodes.
	 * @return {jQuery.Deferred} The promise.
	 * @static
	 */
	Preloader.readyPromise = function( images ) {
		var promises = [];
		$( images ).each( function() {
			var img = this;
			var promise = $.Deferred();
			if ( img.complete ) {
				// Image is already downloaded
				promise.resolve();
			} else if ( img.naturalHeight > 0 && img.naturalWidth > 0 ) {
				// We already have enough information to determine the image size
				promise.resolve();
			} else {
				// We have to wait for the image to start loading
				var timeout = 0;
				var $$ = $( img )
					.on( 'load.mangaPerformerReadyPromise', function() {
						promise.resolve();
					} )
					.on( 'error.mangaPerformerReadyPromise', function() {
						promise.reject();
					} )
					.on( 'abort.mangaPerformerReadyPromise', function() {
						promise.reject();
					} );

				// We don't need the image to completely load so use a timeout
				// to resolve immediately once the image's natural size is available.
				var wait = function wait() {
					if ( img.naturalHeight > 0 && img.naturalWidth > 0 ) {
						promise.resolve();
					} else {
						timeout = setTimeout( wait, 500 );
					}
				};
				timeout = setTimeout( wait, 10 );

				// Use our own promise to clear the events and timeouts
				promise.always( function() {
					$$.off( '.mangaPerformerReadyPromise' );
					timeout = clearTimeout( timeout );
				} );
			}

			promises.push( promise.promise() );
		} );

		return $.when.apply( $, promises );
	};

	(function() {
		/**
		 * Private method to initiate the preloading of an image.
		 * Returns the image node as well as a jQuery.Deferred
		 * promise that will be resolved or rejected when the
		 * preloading is complete.
		 *
		 * @param {jQuery} $preloader The preloader node from Preloader.getNode
		 * @param {string} src The url of the image to preload.
		 * @return {Object}
		 * @return {jQuery.Deferred} return.promise The promise.
		 * @return {HTMLImageElement} return.img The image node.
		 * @private
		 */
		function doPreload( $preloader, src ) {
			var deferred = $.Deferred();
			if ( !src ) {
				deferred.reject();
				return {
					promise: deferred.promise()
				};
			}

			var img = $( '<img />' )
				.prop( 'onload', function() {
					deferred.resolve();
				} )
				.prop( 'onerror', function() {
					deferred.reject();
				} )
				.prop( 'onabort', function() {
					deferred.reject();
				} )
				.attr( 'src', src )
				.appendTo( $preloader );

			return {
				promise: deferred.promise(),
				img: img[0]
			};
		}

		/**
		 * Private method to start the preloading of images in a manga/comic.
		 *
		 * @param {Preloader} self The preloader instance.
		 * @param {Object} o The state object from the preloader instance.
		 * @param {PageList|PagePairList} list The page or page pair list to preload.
		 * @private
		 */
		function runPreloads( self, o, list ) {
			if ( o.running ) {
				return;
			}
			o.running = true;
			var $preloader = Preloader.getNode();
			while ( o.inProgress < Preloader.maxConcurrentPreloads && o.nextIndex < list.length ) {
				var page = list[o.nextIndex];
				o.nextIndex++;
				if ( page[o.imgKey] ) {
					// Skip the page if it already has an <img> associated with it.
					// Such as if it was force loaded by getImage.
					continue;
				}
				o.inProgress++;
				var p = doPreload( $preloader, page[o.urlKey] );
				page[o.imgKey] = p.img;
				p.promise.always( function() {
					o.inProgress--;
					o.finished++;
					if ( o.urlKey === 'src' ) {
						self.emit( 'progress', {
							progress: o.finished / list.length
						} );
					}
					runPreloads( self, o, list );
				} );
			}
		}

		/**
		 * Begin preloading of the images and thumbs in the manga/comic.
		 */
		Preloader.prototype.preload = function() {
			runPreloads( this, this.thumbs, this.manga.pages );
			runPreloads( this, this.pages, this.manga.pages );
		};

		/** 
		 * Common getImage implementation for Preloader getImage and getThumb.
		 * @ignore
		 */
		function getImage( o, page ) {
			if ( !page[o.imgKey] ) {
				// We don't increment inProgress here since that could lead to a race
				// condition where preloading halts because previous images loaded
				// fully before 2 getImage calls finished leading to there being no
				// always promise callbacks to continue the preload process.
				var p = doPreload( Preloader.getNode(), page[o.urlKey] );
				page[o.imgKey] = p.img;
			}
			$( page[o.imgKey] )
				.addClass( 'mangaperformer-pageimage' )
				.addClass( o.className )
				.attr( 'data-page-index', page.idx );
			return page[o.imgKey];
		}

		/**
		 * Force the preloader to start preloading the image for a page
		 * and return the image. Used for when a user directly navigates to a page.
		 *
		 * @param {Page} The page to return the image for. 
		 * @return {HTMLImageElement}
		 */
		Preloader.prototype.getImage = function( page ) {
			return getImage.call( this, this.pages, page );
		};

		/**
		 * Force the preloader to start preloading the thumb for a page
		 * and return the image. Used for when a user directly navigates to a page.
		 *
		 * @param {Page} The page to return the thumbnail for.
		 * @param {number} [height=200] The thumbanail height to use on the img tag.
		 * @return {HTMLImageElement}
		 */
		Preloader.prototype.getThumb = function( page, height ) {
			var img = getImage.call( this, this.thumbs, page );
			img.height = height || 200;
			return img;
		};
	})();

	/**
	 * Internal object containing methods for generating some common UI components.
	 * @singleton
	 * @private
	 */
	var UI = {
		/**
		 * Set the (visual only) visibility of a DOM node.
		 *
		 * @param {jQuery|HTMLElement} node The DOM node.
		 * @param {Object} o The options
		 * @param {boolean} o.visible Whether to show or hide the node.
		 * @private
		 */
		visibility: function( node, o ) {
			var $node = $( node );

			if ( o.visible ) {
				// Show, by removing any css we added
				$node
					.css( 'position', '' )
					.css( 'clip', '' );
			} else {
				// Hide, by ensuring position is not static and adding a clip
				if ( $node.css( 'position' ) === 'static' ) {
					$node.css( 'position', 'absolute' );
				}
				$node.css( 'clip', 'rect(1px, 1px, 1px, 1px)' );
			}
		},

		/**
		 * Change the css adding a transition for the changed 
		 * properties and return a promise that will be resolved
		 * when the animation is finished, or immediately if not
		 * supported.
		 *
		 * @param {jQuery|HTMLElement} node The DOM node.
		 * @param {Object} o A combination of transition options
		 *                   and css properties to change, anything
		 *                   without a defined meaning is considered
		 *                   a css property.
		 * @param {string} [o.duration='1s'] The duration for the transition.
		 * @param {string} [o.timing='ease'] The timing function for the transition.
		 * @param {boolean} [o.exclusive=false] Kill any other transition events.
		 * @private
		 */
		transition: function( node, o ) {
			var $node = $( node ),
				defaults = {
					exclusive: false,
					duration: '1s',
					timing: 'ease'
				},
				options = _.defaults( {}, defaults, _.pick( o, _.keys( defaults ) ) ),
				properties = _.omit( o, _.keys( defaults ) ),
				propertyNames = _.keys( properties ),
				d = $.Deferred();

			// @todo Handle vendor prefixed properties like transform

			$node
				.css( 'transition-property', propertyNames.join( ' ' ) )
				.css( 'transition-duration', options.duration )
				.css( 'transition-timing-function', options.timing )
				.css( properties );

			if ( Supports.transition ) {
				if ( options.exclusive ) {
					$node.off( Supports.transitionEndEvents );
				}
				$node.one( Supports.transitionEndEvents, function( e ) {
					$node
						.css( 'transition-property', '' )
						.css( 'transition-duration', '' )
						.css( 'transition-timing-function', '' );

					d.resolveWith( $node );
				} );
			} else {
				d.resolveWith( $node );
			}

			return d.promise();
		}
	};

	/**
	 * Helper object that abstracts use of the browser's fullscreen APIs.
	 * @singleton
	 * @private
	 */
	UI.Fullscreen = {
		/**
		 * @property {string}
		 * A space separated string listing the various standard and vendor prefixed names that the
		 * 'fullscreenchange' event goes by. This is used when we register and unregister fullscreen
		 * events to ensure we don't miss support for any browser.
		 * @readonly
		 */
		events: 'fullscreenchange mozfullscreenchange webkitfullscreenchange',

		/**
		 * Register an event handler that'll be called when fullscreen is entered or exited.
		 * @param {Function} handler The callback that will be run.
		 */
		on: function( handler ) {
			$( document ).on( UI.Fullscreen.events, handler );
		},

		/**
		 * De-register an event handler registered with .on().
		 * @param {Function} handler The callback function that was registered.
		 */
		off: function( handler ) {
			$( document ).off( UI.Fullscreen.events, handler );
		},

		/**
		 * Check to see if this browser supports the fullscreen API.
		 * @return {boolean}
		 */
		supported: function() {
			return 'fullscreenElement' in document
				|| 'mozFullScreenElement' in document
				|| 'webkitFullscreenElement' in document;
		},

		/**
		 * Check to see if the document is currently fullscreen.
		 * @return {boolean}
		 */
		check: function() {
			// @todo Test the performer in a context with another thing using the fullscreen API.
			//       See if we need to verify that the fullscreen element is our performer root to avoid bugs.
			return document.fullscreenElement
				|| document.mozFullScreenElement
				|| document.webkitFullscreenElement
				|| false;
		},

		/**
		 * Try to enable fullscreen on the element.
		 * @param {HTMLElement} elem The element to fullscreen.
		 */
		request: function( elem ) {
			if ( elem.requestFullscreen ) {
				elem.requestFullscreen();
			} else if ( elem.mozRequestFullScreen ) {
				elem.mozRequestFullScreen();
			} else if ( elem.webkitRequestFullscreen ) {
				elem.webkitRequestFullscreen( Element.ALLOW_KEYBOARD_INPUT );
			}
		},

		/**
		 * Exit fullscreen if in fullscreen mode.
		 */
		cancel: function() {
			if ( document.cancelFullScreen ) {
				document.cancelFullScreen();
			} else if ( document.mozCancelFullScreen ) {
				document.mozCancelFullScreen();
			} else if ( document.webkitCancelFullScreen ) {
				document.webkitCancelFullScreen();
			}
		}
	};

	/**
	 * Controller for scheduling the auto-hide capabilities of a UI.
	 * @param {Object} [o] The options.
	 * @param {number} [o.duration=1000] Number of milliseconds to keep the UI visible.
	 * @param {Function} [o.show] A callback to run when the UI should become visible.
	 * @param {Function} [o.hide] A callback to run when the UI should be hidden.
	 * @abstract
	 */
	UI.AutoHide = function( o ) {
		var AH = this;
		AH.options = $.extend( {
			duration: 1000
		}, o || {} );

		AH.visible = true;
		AH.timerLocked = false;
		AH.visibilityPing();

		if ( Supports.pageVisibility ) {
			var oldPageHidden = document[Supports.pageVisibility.hidden];
			$( document ).on( Supports.pageVisibility.visibilitychange, function( e ) {
				var pageHidden = document[Supports.pageVisibility.hidden];
				if ( !pageHidden && oldPageHidden ) {
					// Show the UI when the page changes from hidden -> visible
					AH.visibilityPing();
				}
				oldPageHidden = pageHidden;
			} );
		}
	};

	/**
	 * Internal abstraction for hiding the UI.
	 * @private
	 */
	UI.AutoHide.prototype._hide = function() {
		if ( !this.visible || this.timerLocked ) { return; }
		this.visible = false;
		if ( _.isFunction( this.options.hide ) ) {
			this.options.hide.call( undefined );
		}
	};

	/**
	 * Internal abstraction for showing the UI.
	 * @private
	 */
	UI.AutoHide.prototype._show = function() {
		if ( this.visible ) { return; }
		this.visible = true;
		if ( _.isFunction( this.options.show ) ) {
			this.options.show.call( undefined );
		}
	};

	/**
	 * Perform a "ping" to visibility. If the UI is hidden it will
	 * become visible. The timer will also be reset, delaying the
	 * automatic hide event.
	 */
	UI.AutoHide.prototype.visibilityPing = function() {
		if ( this.timerLocked ) { return; }
		this._show();
		this.timer = clearTimeout( this.timer );
		this.timer = setTimeout( _.bind( this._hide, this ), this.options.duration );
	};

	/**
	 * Hide the UI immediately, bypassing the timer.
	 */
	UI.AutoHide.prototype.forceHide = function() {
		if ( this.timerLocked ) { return; }
		this._hide();
		this.timer = clearTimeout( this.timer );
	};

	/**
	 * Show the UI without allowing the timer to hide the UI.
	 */
	UI.AutoHide.prototype.forceShow = function() {
		if ( this.timerLocked ) { return; }
		this._show();
		this.timer = clearTimeout( this.timer );
	};

	/**
	 * Show the UI and lock the visibility so the UI cannot be hidden
	 * until the visibility has been unlocked.
	 */
	UI.AutoHide.prototype.lockVisible = function() {
		if ( this.timerLocked ) { return; }

		this.timerLocked = true;
		this._show();
		this.timer = clearTimeout( this.timer );
	};

	/**
	 * Unlock the visibility so the UI can be hidden again.
	 */
	UI.AutoHide.prototype.unlockVisible = function() {
		if ( !this.timerLocked ) { return; }

		this.timerLocked = false;
		this.visibilityPing();
	};

	/**
	 * Setup a DOM node as a "surface" for the AutoHide controller.
	 * Surfaces are generally large areas with primarily display
	 * purposes. Auto hide listens to mouse move and touch tap
	 * events on them to trigger show and hide events.
	 * @param {jQuery} $surface The surface as a jQuery node.
	 */
	UI.AutoHide.prototype.addSurface = function( $surface ) {
		var AH = this;
		$surface
			.on( 'mousemove', _.throttle( function() {
				AH.visibilityPing();
			}, 500 ) )
			.hammer()
				.on( 'tap', function( e ) {
					if ( e.gesture.pointerType === 'mouse' ) { return; }

					if ( AH.visible ) {
						AH.forceHide();
					} else {
						AH.visibilityPing();
					}
				} );
	};

	/**
	 * Setup a DOM node as an "interactive region" for the
	 * AutoHide controller. Interactive regions are structures
	 * containing interactive parts of the UI, typically this is
	 * the UI to be hidden itself. Auto hide listens to mouseenter
	 * and mouseleave events and forces the UI to remain visible
	 * while the mouse is over the interactive region.
	 */
	UI.AutoHide.prototype.addInteractiveRegion = function( $interactiveRegion ) {
		var AH = this;
		$interactiveRegion
			.on( 'mouseenter', function() {
				AH.lockVisible();
			} )
			.on( 'mouseleave', function() {
				AH.unlockVisible();
			} );
	};

	/**
	 * Base constructor for all UI components.
	 * @param {UI.Interface} interfaceObj The interface the component belongs to.
	 * @param {Object} o Options for the component.
	 * @param {string} o.name The component's name.
	 * @param {string[]} [o.refreshOn=[]] An array of refreshFor event names
	 *                                 the component should refresh on.
	 * @param {string[]} [o.uses] An array of keys within the interface's state
	 *                            which this component makes use of.
	 */
	UI.Component = function( interfaceObj, o ) {
		/**
		 * @property {UI.Interface} interface
		 * The interface this component instance belongs to.
		 * @readonly
		 */
		this.interface = interfaceObj;

		/**
		 * @property {string} name
		 * The name of the component.
		 * @readonly
		 */
		this.name = o.name;

		/**
		 * @property {string[]} refreshOn
		 * The refreshFor event names this component should refresh on.
		 * @readonly
		 */
		this.refreshOn = (o.refresh || "").split( /\s+/ );

		/**
		 * @property {string[]} uses
		 * The interface state keys this component makes use of.
		 * The interface will make sure this component is refreshed
		 * whenever one of the state keys it uses is modified.
		 * @readonly
		 */
		this.uses = o.uses || [];

		/**
		 * @property {Object} agent
		 * The agent for the component.
		 * 
		 * An agent is a plain object that inherits from the object set as the
		 * agent property on this component and as a single property set on it
		 * named component with this component instance as it's value.
		 * The agent is usually returned when a component is first created as
		 * a method of setting up anything which cannot be setup as arguments.
		 * @readonly
		 */
		this.agent = create( this.constructor.agent || {} );
		this.agent.component = this;

		/**
		 * @property {boolean} visible
		 * The visibility of the component.
		 * @readonly
		 */
		this.visible = true;
	};

	UI.Component.implementations = {};

	/**
	 * Helper function that implements a new UI.Component subclass.
	 * @param {string} name The name of the component.
	 * @param {Function|Object} implementation A function to run as the constructor or an object containing the constructor
	 *        function as a property named 'constructor' and other properties with methods to implement on
	 *        the prototype of the new component.
	 * @return {Function} A constructor function with a prototype that inherits from UI.Component's prototype.
	 */
	UI.Component.create = function( name, implementation ) {
		var constructor;
		if ( !_.isString( name ) ) {
			throw new TypeError( "name must be a string" );
		}
		if ( _.isFunction( implementation ) ) {
			constructor = implementation;
			implementation = {};
		} else if ( _.isObject( implementation ) ) {
			constructor = implementation.constructor;
			delete implementation.constructor;
			if ( !_.isFunction( constructor ) ) {
				throw new TypeError( "There is no constructor for the " + name + " component." );
			}
		} else {
			throw new TypeError( "implementation for " + name + " must be a function or object containing .constructor" );
		}

		var Component = function( interfaceObj, o ) {
			UI.Component.call( this, interfaceObj, o );
			constructor.call( this, o );
		};
		Component.prototype = create( UI.Component.prototype );
		Component.prototype.constructor = Component;

		var staticProperties = [ 'setupEvents', 'agent' ];
		_.each( implementation, function( value, name ) {
			if ( _.contains( staticProperties, name ) ) {
				// Add static methods and properties from implementation to the constructor.
				Component[name] = value;
			} else {
				// Add instance methods from implementation to the prototype.
				Component.prototype[name] = value;
			}
		} );

		UI.Component.implementations[name] = Component;
		Component.prototype.componentName = name;
		return Component;
	};

	/**
	 * Call the setupEvents method for all component types to setup the delegated events that each UI.Component
	 * type needs on an ancestor in order for the component type node to function.
	 * @param {jQuery} $node The root node to setup delegated events on.
	 */
	UI.Component.setupAllEvents = function( $node ) {
		_.each( UI.Component.implementations, function( Component, name ) {
			if ( _.isFunction( Component.setupEvents ) ) {
				Component.setupEvents( $node );
			}
		} );
	};

	/**
	 * Create the DOM node for the component root.
	 * @param {string} html The html for the node.
	 */
	UI.Component.prototype.createRoot = function( html ) {
		if ( this.$component ) {
			throw new Error( "component root already exists" );
		}

		this.$component = $( $.parseHTML( html ) )
			.attr( 'data-ui-component', this.componentName )
			.data( 'mangaperformer-component', this );

		return this.$component;
	};

	/**
	 * Return a jQuery instance for a DOM node that is part of the component.
	 * With a selector it will use find to return a descendant of the component's root node.
	 * Without a selector it will return the component's root node itself.
	 *
	 * If the component's root node does not exist yet it will implicitly be created as a div.
	 * This makes the function useful for the initialization of the component node.
	 *
	 * @param {string} [selector] A selector targeting a descendant of the component's root node.
	 */
	UI.Component.prototype.$ = function( selector ) {
		if ( !this.$component ) {
			this.createRoot( '<div></div>' );
		}

		return selector
			? this.$component.find( selector )
			: this.$component;
	};

	/**
	 * Method to return the component's DOM.
	 * @return {jQuery} The DOM node as a jQuery object.
	 */
	UI.Component.prototype.getDOM = function() {
		return this.$component;
	};

	/**
	 * Trigger a special component event. This event will first bubble internally through
	 * UI.Component instances by walking up the DOM and calling any relevant intercept
	 * handler on a parent component. Following that it will trigger a native DOM event
	 * where the type is prefixed with "mangaperformer-". At any point a handler may stop
	 * the propagation of the event.
	 *
	 * @param {string} type The name of the event's type. Should be short such as 'activate',
	 *                      *not* prefixed with "mangaperformer-".
	 * @param {Object} [eventData] Provide and extra set of data that should be passed along
	 *                             inside the event object.
	 */
	UI.Component.prototype.trigger = function( type, eventData ) {
		eventData = $.extend( { component: this }, eventData || {} );
		var event = $.Event( 'mangaperformer-' + type, eventData ),
			node = this.$().parent().closest( '[data-ui-component]' ),
			component;

		while ( node && node.length ) {
			if ( event.isPropagationStopped() ) {
				// Break out of the intercepts if propagation was halted.
				break;
			}

			component = node.data( 'mangaperformer-component' );
			if ( component && component.intercept && component.intercept[type] ) {
				component.intercept[type].call( component, event );
			}

			node = node.parent().closest( '[data-ui-component]' );
		}

		// Trigger the DOM event. jQuery will already take care of checking if stopPropagation was called.
		this.$().trigger( event );

		// Return the event just in case the caller wishes to implement some sort of 'native' behavior.
		return event;
	};

	/**
	 * Show a hidden component.
	 */
	UI.Component.prototype.show = function() {
		if ( this.visible ) { return; }
		this.visible = true;
		// This may be triggered before the button is actually inserted into the DOM
		// so defer it.
		_.defer( _.bind( function() {
			this.$()
				.attr( 'aria-hidden', 'false' )
				.css( 'visibility', '' )
				.css( 'display', '' );

			this.trigger( 'show' );
		}, this ) );
	};

	/**
	 * Hide a visible component.
	 */
	UI.Component.prototype.hide = function() {
		if ( !this.visible ) { return; }
		this.visible = false;
		// This may be triggered before the button is actually inserted into the DOM
		// so defer it.
		_.defer( _.bind( function() {
			this.$()
				.attr( 'aria-hidden', 'true' )
				.css( 'visibility', 'collapse' )
				.css( 'display', 'none' );

			this.trigger( 'hide' );
		}, this ) );
	};

	/**
	 * Set the visibility of a component, showing or hiding it.
	 * @param {boolean} visibility Should the component be visible?
	 */
	UI.Component.prototype.setVisibility = function( visibility ) {
		this[visibility ? 'show' : 'hide']();
	};

	/**
	 * Refresh the component, if supported.
	 */
	UI.Component.prototype.refresh = function() {};

	/**
	 * An interface component that simply groups a series of buttons together.
	 * This component is primarily visual/layout in structure so interfaces should
	 * not use it directly. It's intended to be used by the layout when constructing
	 * the layout.
	 * @private
	 */
	UI.ButtonGroup = UI.Component.create( 'buttongroup', {
		constructor: function() {
			this.buttons = [];

			this.$()
				.addClass( 'mangaperformer-buttongroup' );
		},

		/**
		 * Add a new button to the button group.
		 * @param {UI.Button} button The button to add.
		 * @private
		 */
		_add: function( button ) {
			this.buttons.push( button );
			this.$().append( button.getDOM() );
		},

		intercept: {
			hide: function( e ) {
				// Capture the button's hide event, parent elements only need to hear a hide event
				// if this entire element is hidden.
				e.stopPropagation();

				// Calculate visibility based on whether any of the buttons are visible
				var visible = _( this.buttons ).chain().pick( 'visible' ).any().value();
				this.setVisibility( visible );
			},

			show: function( e ) {
				// Capture the button's show event, parent elements only need to hear a show event
				// if this component emits it (ie: if calling show here does in fact unhide the component).
				e.stopPropagation();

				// If any of the buttons inside this component have been unhidden make sure this component
				// is not hidden.
				this.show();
			}
		},

		/**
		 * @property {Object} agent
		 * The base object for the component's agent.
		 * @return {Object}
		 */
		agent: {
			/**
			 * Create a button in the button group.
			 * @param {string} name The button's names.
			 * @param {Object} o Options for the button.
			 * @chainable
			 */
			create: function( name, o ) {
				var button = this.component.interface.button( name, o );
				return this.add( button );
			},

			/**
			 * Add a button to the button group.
			 * @param {UI.Button} button The button.
			 * @chainable
			 */
			add: function( button ) {
				this.component._add( button );
				return this;
			}
		}
	} );

	/**
	 * An interface component that groups a series of buttons intended to represent
	 * multiple possible values of one state.
	 * @param {Object} o Options
	 * @param {string} [o.state=name] The name of the state the buttons switch through.
	 * @private
	 */
	UI.StateSet = UI.Component.create( 'stateset', {
		constructor: function( o ) {
			this.stateButtons = [];
			this.states = {};
			this.stateName = o.state || this.name;

			// Make the DOM
			this.$()
				.attr( 'data-state', this.stateName );
		},

		/**
		 * Add a new button to the state set.
		 * @param {UI.Button} button The button to add.
		 * @private
		 */
		_add: function( button ) {
			this.stateButtons.push( button );
			// this.states[...] = button; @todo Store a state value -> button map
			this.$().append( button.getDOM() );
		},

		intercept: {
			activate: function( e ) {
				if ( !( e.source === 'button' && e.component instanceof UI.Button ) ) { return; }

				// e.button.
				this.trigger( 'changestate', {
					state: {
						name: this.stateName,
						value: e.component.extra.state
					}
				} );

				e.stopPropagation();
			},

			hide: function( e ) {
				// Capture the button's hide event, parent elements only need to hear a hide event
				// if this entire element is hidden.
				e.stopPropagation();

				// Calculate visibility based on whether any of the buttons are visible
				var visible = _( this.stateButtons ).chain().pick( 'visible' ).any().value();
				this.setVisibility( visible );
			},

			show: function( e ) {
				// Capture the button's show event, parent elements only need to hear a show event
				// if this component emits it (ie: if calling show here does in fact unhide the component).
				e.stopPropagation();

				// If any of the buttons inside this component have been unhidden make sure this component
				// is not hidden.
				this.show();
			}
		},

		/**
		 * @property {Object} agent
		 * The base object for the component's agent.
		 * @return {Object}
		 */
		agent: {
			/**
			 * Create a button covering one state of the state set.
			 * @param {string} name The button's names.
			 * @param {Object} o Options for the button.
			 * @param {Object} o.state The value for the state this button covers.
			 * @chainable
			 */
			state: function( name, o ) {
				var button = this.component.interface.button( name, o );
				this.component._add( button );
				return this;
			}
		}
	} );

	/**
	 * An interface component that groups a pair of prev/next buttons together.
	 * @param {Object} o Options
	 * @private
	 */
	UI.NavButtons = UI.Component.create( 'navbuttons', {
		constructor: function( o ) {
			this.prev = undefined;
			this.next = undefined;

			this.$();
		},

		/**
		 * Register the prev or next button for the nav buttons component.
		 * @param {"prev"|"next"} direction The direction of the button being registered.
		 * @param {UI.Button} button The button to add.
		 * @private
		 */
		_register: function( direction, button ) {
			if ( direction !== 'prev' && direction !== 'next' ) {
				throw new Error( "Direction must be one of 'prev' or 'next'." );
			}

			this[direction] = button;

			this.$('> *').detach();
			this.$().append( _( [ this.prev, this.next ] ).compact().invoke( 'getDOM' ).value() );
		},

		intercept: {
			activate: function( e ) {
				if ( !( e.source === 'button' && e.component instanceof UI.Button ) ) { return; }

				// e.button.
				this.trigger( 'navigate', {
					navName: this.name,
					direction: e.component.extra.direction
				} );

				e.stopPropagation();
			},

			hide: function( e ) {
				// Capture the button's hide event, parent elements only need to hear a hide event
				// if this entire element is hidden.
				e.stopPropagation();

				// Calculate visibility based on whether either of the buttons are visible
				var visible = ( this.prev && this.prev.visible ) || ( this.next && this.next.visible );
				this.setVisibility( visible );
			},

			show: function( e ) {
				// Capture the button's show event, parent elements only need to hear a show event
				// if this component emits it (ie: if calling show here does in fact unhide the component).
				e.stopPropagation();

				// If any of the buttons inside this component have been unhidden make sure this component
				// is not hidden.
				this.show();
			}
		},

		agent: new function() {
			// The function used to register both prev and next is almost entirely the same
			// so use a function factory to make the registration functions.
			var navRegisterFunction = function( direction ) {
				return function( name, o ) {
					o = $.extend( { direction: direction }, o || {} );
					var button = this.component.interface.button( name, o );
					this.component._register( direction, button );
					return this;
				};
			};

			// Setup a helper that'll allow the .next and .prev to be registered by the caller
			/**
			 * Register the prev button for the nav buttons component.
			 * @param {string} name The name of the button being created.
			 * @param {Object} o Options to be passed to the UI.Button instance being created.
			 */
			this.prev = navRegisterFunction( 'prev' );

			/**
			 * Register the name button for the nav buttons component.
			 * @param {string} name The name of the button being created.
			 * @param {Object} o Options to be passed to the UI.Button instance being created.
			 */
			this.next = navRegisterFunction( 'next' );
		}
	} );

	/**
	 * An interface component that displays a title.
	 * @param {Object} [o] The options.
	 * @param {string} [o.class] A CSS class for the node.
	 * @private
	 */
	UI.Title = UI.Component.create( 'title', {
		constructor: function( o ) {
			this.$()
				.addClass( o['class'] );

			this.refresh();
		},

		refresh: function() {
			var title = this.interface.state.get( 'title' );

			this.$().text( title || "" );
			this.setVisibility( !!title );
		}
	} );

	/**
	 * Create a button with an icon.
	 * @param {Object} o The options for the button.
	 * @param {string} [o.name] The button name.
	 * @param {number} [o.size=34] The pixel size of the button.
	 * @param {string} [o.label] The label for the button.
	 * @param {string} [o.icon] The name of the icon for the button.
	 * @return {jQuery}
	 */
	UI.Button = UI.Component.create( 'button', {
		constructor: function( o ) {
			o = $.extend( {
				size: 34
			}, o );

			this.createRoot( '<button type="button" class="mangaperformer-button"></button>' );
			if ( o.name ) {
				this.$()
					.attr( 'data-ui-button-name', o.name )
					.addClass( 'mangaperformer-button-' + o.name );
			}

			$( '<img />' )
				.attr( 'width', o.size )
				.attr( 'height', o.size )
				.appendTo( this.$() );

			this.name = o.name;
			this.extra = _.omit( o, [ 'name', 'size', 'label', 'icon', 'refreshOn', 'uses' ] );
			this.label = _.isFunction( o.label )
				? o.label
				: function() { return o.label || ""; };
			this.icon = _.isFunction( o.icon )
				? o.icon
				: function() { return o.icon || ""; };
			this.support = _.isFunction( o.support )
				? o.support
				: function() { return true; };

			this.refresh();
		},

		/**
		 * Refresh the icon and label for a button.
		 */
		refresh: function() {
			// We use pick to only pass state keys the button explicitly states
			// that it makes use of to ensure that the uses key – which is used
			// to properly deal out refreshes of buttons when a state key is
			// changed – is properly set when the button is registered.
			var state = this.interface.state.pick( this.uses ),
				label = this.label( state ),
				icon = this.icon( state ),
				support = this.support( state );

			this.$( 'img' ).attr( 'alt', label );
			this.$().attr( 'aria-label', label );

			// All browsers that support SVG images also support data: URIs
			var src = Supports.svg
				? MANGAPERFORMER_ICONS[icon]
				: MangaPerformer.BASE + '/icons/' + icon + ".png";
			this.$( 'img' ).attr( 'src', src );

			// Hide/show based on support test
			this.setVisibility( support );
		},

		/**
		 * "Activate" a button running whatever action the button is in charge of.
		 * This is called whenever a click, tap, or keyboard activation is done on the button.
		 */
		activate: function() {
			this.trigger( 'activate', {
				source: 'button',
				buttonName: this.name
			} );
		},

		/**
		 * Setup the delegated events needed on some root node which is an ancestor of
		 * any UI.Button nodes in order for the UI.Button nodes to function.
		 * @param {jQuery} $node The root node to setup delegated events on.
		 */
		setupEvents: function( $node ) {
			function activate( $button ) {
				var button = $button.data( 'mangaperformer-component' );
				if ( button ) {
					button.activate();
				}
			}

			$node
				// Special fallback for non-mouse non-clicks that trigger click.
				// Such as activating a focused button with a keyboard.
				.on( 'click', '[data-ui-component="button"]', function( e ) {
					var $button = $( this );
					if ( $button.data( 'noclick' ) ) {
						$button.data( 'noclick', false );
						return;
					}

					activate( $button );
				} )
				.hammer()
					// Tap gesture, handles mice, touches, pointers, etc...
					.on( 'tap', function( ev ) {
						var $button = $( ev.target ).closest( '[data-ui-component="button"]', this );
						if ( !$button.length ) { return; }

						// Kill a click happening after the tap
						$button.data( 'noclick', true );

						activate( $button );

						// When the button is focused as a result of pointer/touch interactions blur it when finished.
						$button[0].blur();
					} );
		}
	} );

	UI.buttonTooltipSetup = function( $root ) {
		var tip = {
			delay: 500,
			retain: 800,
			hold: 50,

			$tip: $( '<div class="mangaperformer-tooltip"></div>' ).appendTo( Performer.$root ),
			timer: undefined,
			open: false,
			state: undefined,

			show: function( button, o ) {
				o = $.extend( {
					// Wait a period of time before displaying tip
					delay: false,
					// Allow mouse out to close the tip
					mouse: true
				}, o );

				if ( tip.open === true || tip.open >= now() - tip.retain ) {
					o.delay = false;
				}

				if ( o.delay > 0 ) {
					clearTimeout( tip.timer );
					tip.timer = _.delay( tip.show, o.delay, button, $.extend( {}, o, { delay: false } ) );
					return;
				} else {
					tip.timer = undefined;
				}

				tip.$tip.text( button.getAttribute( 'aria-label' ) );

				var offset = $( button ).offset();
				offset.top -= $( button ).height();
				offset.top -= 5;
				offset.left -= tip.$tip.width() / 2;
				tip.$tip.css( offset );

				tip.$tip.css( 'opacity', 1 );
				tip.open = true;
				tip.state = o;
			},
			hide: function( o ) {
				o = $.extend( {
					source: 'manual'
				}, o );

				// Ignore mouse triggered hides if the open options specified that mouse was not permitted
				if ( o.source === 'mouse' && tip.state && !tip.state.mouse ) {
					return;
				}

				clearTimeout( tip.timer );
				tip.open = now();
				tip.state = undefined;

				tip.$tip.css( 'opacity', 0 );
			}
		};

		$root
			.on( 'mouseover mouseout', function( e ) {
				var button = $( e.target ).closest( '.mangaperformer-button', this )[0],
					relatedButton = $( e.relatedTarget ).closest( '.mangaperformer-button', this )[0];
				
				// Ignore mouse moves between elements within the same button
				if ( button == relatedButton ) {
					return;
				}

				if ( e.type === 'mouseover' ) {
					if ( button ) {
						tip.show( button, { delay: tip.delay } );
					}
				} else {
					tip.hide( { source: 'mouse' } );
				}
			} )
			.on( 'touchend', function( e ) {
				// Cancel the touchend to stop touch devices from triggering a fake mouseover after
				// a tap which would undesirably trigger a mouse based tooltip to open.
				e.preventDefault();
			} )
			/* jshint -W106 */
			.hammer( { hold_timeout: tip.hold } )
			/* jshint +W106 */
				.on( 'tap', '.mangaperformer-button', function( e ) {
					// Defer so we don't get an early value of tip.open
					_.defer( function() {
						// Reset the retain feature on successful tap (ie: successful button press) if
						// the tip is closed after tap.
						// If the tip is no longer open then there is no mouse hovering over the
						// button keeping the tip open so it was likely a real tap.
						// We do this to avoid having the retain feature keep flashing the tip open
						// if the user repeatedly taps the next/prev buttons shortly after having
						// done a hold that opens the tooltip once.
						if ( tip.open !== true ) {
							tip.open = false;
						}
					} );
				} )
				.on( 'hold', '.mangaperformer-button', function( e ) {
					if ( e.gesture.pointerType === "mouse" ) { return; }

					tip.show( this, { delay: tip.delay, mouse: false } );
				} )
				.on( 'release', '.mangaperformer-button', function( e ) {
					if ( e.gesture.pointerType === "mouse" ) { return; }

					tip.hide( { source: e.gesture.pointerType });
				} );
	};

	/**
	 * A slider UI element. Represents a bar with loading indicator and handle
	 * @extends Events
	 * @private
	 */
	UI.Slider = UI.Component.create( 'slider', function( o ) {
		var S = this;

		S.rtl = false;

		/**
		 * @property {number} size
		 * The total number of items within the slider.
		 * @readonly
		 */
		S.size = 0;

		/**
		 * @property {number} index
		 * The current index in the list represented by the slider.
		 * @readonly
		 */
		S.index = undefined;

		/**
		 * @property {number} handleIndex
		 * The current index of the handle within the slider.
		 * This differs from the slider.index when 
		 * @readonly
		 */
		S.handleIndex = undefined;

		/**
		 * @property {jQuery} $slider
		 * The node wrapping the whole slider bar and page indicator.
		 * @readonly
		 */
		S.$slider = $( '<div class="mangaperformer-slider"></div>' );

		/**
		 * @property {jQuery} $bar
		 * The node containing the slider bar.
		 * @readonly
		 */
		S.$bar = $( '<div class="mangaperformer-slider-bar"></div>' );
		S.$bar.appendTo( S.$slider );

		/**
		 * @property {jQuery} $loadedBar
		 * The node containing the slider bar's preloaded meter.
		 * @readonly
		 */
		S.$loadedBar = $( '<div class="mangaperformer-slider-loadedbar"></div>' );
		S.$loadedBar.appendTo( S.$bar );

		/**
		 * @property {jQuery} $handle
		 * The node containing the slider bar's handle.
		 * @readonly
		 */
		S.$handle = $( '<div class="mangaperformer-slider-handle" tabindex="0"></div>' )
			.css( 'transform', 'translate3d(0,0,0)' );
		S.$handle.appendTo( S.$bar );

		// Attach events
		S.$handle
			.on( 'keydown', function( ev ) {
				var special = $.hotkeys.specialKeys[ev.keyCode];
				// Ignore keypresses with modifiers
				if ( ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey ) { return; }

				if ( special === 'space' || special === 'return' ) {

				} else if ( special === 'left' || special === 'right' ) {
					console.log( special );
					ev.stopPropagation();
				}
			} )
			.hammer()
				.on( 'dragstart', function( ev ) {
					// Start the drag
					var data = ev.gesture.startEvent.mangaPerformerData = {};
					data.sizeX = S.$handle.width();

					/**
					 * @event userstart
					 * Fired when the user has started manipulating the slider.
					 */
					S.emit( 'userstart' );
				} )
				.on( 'dragleft dragright dragend', function( ev ) {
					// if ( !P.manga || !P.pane ) { return; }
					if ( !S.size ) { return; }

					// Custom data added in dragstart
					var data = ev.gesture.startEvent.mangaPerformerData;

					// Calculate number of panes to offset from the current one
					var paneOffset = Math.round( ev.gesture.deltaX / data.sizeX );

					// If the slider's directionality is rtl then the offset
					// works in the opposite direction.
					if ( S.rtl ) {
						paneOffset = paneOffset * -1;
					}

					// var newPane = P.pane.list.getConstrained( P.pane.idx + paneOffset );
					var newIndex = Math.max( 0, Math.min( S.size, S.index + paneOffset ) );

					if ( ev.type === 'dragend' ) {
						// End the drag
						S.commit();

						/**
						 * @event userend
						 * Fired when the user has stopped manipulating the slider.
						 * @param {Object} e
						 * @param {number} e.index The item index within the slider.
						 */
						S.emit( 'userend', { index: S.index } );

						// When the handle is focused as a result of pointer/touch interactions blur it when finished.
						ev.target.blur();
					} else {
						// Drag in progress
						S.setIndex( newIndex );
					}

					ev.gesture.preventDefault();
				} );

		// Initial state
		S.setLoaded( 1 );
	} );

	Events.mixin( UI.Slider.prototype );

	UI.Slider.prototype.getDOM = function() {
		return this.$slider;
	};

	/**
	 * Proxy for jQuery's appendTo on the main element.
	 *
	 * @param {jQuery|Element} Element to append to.
	 */
	UI.Slider.prototype.appendTo = function() {
		this.$slider.appendTo.apply( this.$slider, arguments );
	};

	/**
	 * Update the state of the loaded bar.
	 *
	 * @param {number} loaded A number from 0 (0%) to 1 (100%) indicating how much has been loaded.
	 * @chainable
	 */
	UI.Slider.prototype.setLoaded = function( loaded ) {
		var S = this,
			percent = Math.max( 0, Math.min( 1, loaded ) ) * 100;

		S.$loadedBar.css( 'width', percent + '%' );
		return S;
	};

	/**
	 * Set the direction of the slider bar.
	 *
	 * @param {"ltr"|"rtl"} dir The directionality of the slider.
	 * @chainable
	 */
	UI.Slider.prototype.setDirection = function( dir ) {
		var S = this;

		S.rtl = ( dir === 'rtl' );
		return S;
	};


	/**
	 * Set the total number of items within the slider.
	 *
	 * @param {number} size The number of items
	 * @chainable
	 */
	UI.Slider.prototype.setSize = function( size ) {
		var S = this;
		S.size = size;

		var width = ( ( 1 / S.size ) * 100 ) + '%';
		S.$handle.css( 'width', width );
		return S;
	};

	/**
	 * Set the current index of the handle within the slider.
	 *
	 * @param {number} idx The index.
	 * @chainable
	 */
	UI.Slider.prototype.setIndex = function( idx ) {
		var S = this,
			oldIndex = S.handleIndex;
		S.handleIndex = Math.max( 0, Math.min( S.size, idx ) );

		// @todo Using left/right for the final offsets of this is fine. But when doing animation
		//   we should consider temporarily replacing left/right offset with a left/right of 0 and
		//   a css3 translate where available.
		var start = ( Math.min( 1, ( S.handleIndex || 0 ) / S.size ) * 100 ) + '%';
		S.$handle
			.css( S.rtl ? 'left' : 'right', '' )
			.css( S.rtl ? 'right' : 'left', start );

		if ( S.handleIndex !== oldIndex ) {
			/**
			 * @event handlechanged
			 * Fired when a user interaction has changed the item index the handle visually points to.
			 * @param {Object} e
			 * @param {number} e.index The handle index within the slider.
			 */
			S.emit( 'handlechanged', { index: S.handleIndex } );
		}
		return S;
	};


	/**
	 * Apply any changes on the handle index to the slider's canonical index without generating any events.
	 * This is used to update the slider when something outside the slider changes the index of the item
	 * that the slider represents.
	 *
	 * @chainable
	 */
	UI.Slider.prototype.flush = function() {
		var S = this;
		S.index = S.handleIndex;

		return S;
	};

	/**
	 * Commit any changes on the handle index to the slider's canonical index and emit relevent events.
	 * This is used when user interactions on the slider change the index to finish up and update whatever
	 * the slider represents when the user interaction is over.
	 *
	 * @chainable
	 */
	UI.Slider.prototype.commit = function() {
		var S = this,
			changed = S.handleIndex !== S.index;

		S.flush();

		/**
		 * @event commit
		 * Fired whenever a user interaction triggers a commit.
		 */
		S.emit( 'commit' );

		if ( changed ) {
			/**
			 * @event indexchanged
			 * Fired when a user interaction has changed the index of the item the slider represents.
			 * @param {Object} e
			 * @param {number} e.index The item index within the slider.
			 */
			S.emit( 'indexchanged', { index: S.index } );
		}

		return S;
	};

	/**
	 * A slider type extending from UI.Slider that implements a pane preview.
	 * @extends UI.Slider
	 */
	UI.PaneSlider = function() {
		UI.Slider.apply( this, arguments );
		var S = this;

		/**
		 * @property {jQuery} $panePreview
		 * The node containing the pane thumb preview.
		 * @readonly
		 */
		S.$panePreview = $( '<div class="mangaperformer-panepreview"></div>' )
			.attr( 'aria-hidden', 'true' )
			.css( 'opacity', 0 )
			.css( 'transform', 'translate3d(0,0,0)' )
			.appendTo( S.$bar );
	};

	// @fixme Now that UI.Slider is a UI.Component we should find a better way to do subcomponents.
	UI.PaneSlider.prototype = create( UI.Slider.prototype );
	UI.PaneSlider.prototype.constructor = UI.PaneSlider;

	/**
	 * Set the pane preview on display above the slider.
	 *
	 * @param {Page|PagePair|false} The pane or false to display nothing.
	 * @chainable
	 */
	UI.PaneSlider.prototype.setPreview = function( pane ) {
		var S = this;
		if ( !pane ) {
			S.$panePreview
				.attr( 'aria-hidden', 'true' )
				.css( 'opacity', 0 );
			return;
		}

		var pages;
		if ( pane instanceof Page ) {
			pages = [pane];
		} else if ( pane instanceof PagePair ) {
			pages = pane;
		} else {
			throw new TypeError( "Performer.setPreview must be called with a Page, PagePair, or false." );
		}

		var manga = pane.list.manga,
			preloader = manga.getPreloader(),
			images = $.map( pages, function( page ) {
				return preloader.getThumb( page, manga.thumbHeight );
			} );

		if ( _.every( images, _.isUndefined ) ) {
			S.$panePreview
				.attr( 'aria-hidden', 'true' )
				.css( 'opacity', 0 );
			return;
		}

		S.$panePreview
			.empty()
			.append( images )
			.css( S.rtl ? 'left' : 'right', '' )
			.css( S.rtl ? 'right' : 'left', ( ( ( pane.idx + 0.5 ) / pane.list.length ) * 100 ) + '%' )
			.attr( 'aria-hidden', 'false' )
			.css( 'opacity', 1 );

		Preloader.readyPromise( images )
			.always( function() {
				var width = 0;
				$( images ).each( function() {
					width += Math.ceil( this.naturalWidth / ( this.naturalHeight / manga.thumbHeight ) );
				} );
				S.$panePreview
					.css( S.rtl ? 'margin-left' : 'margin-right', '' )
					.css( S.rtl ? 'margin-right' : 'margin-left', -( width / 2 ) );
			} );
		
		return S;
	};

	/**
	 * Abstract class base for classes in charge of taking an interface and laying out the buttons,
	 * sliders, viewports, and other UI components.
	 * @abstract
	 * @private
	 */
	UI.Layout = function() {
		this.interface = undefined;
	};

	/**
	 * Setup various delegated DOM events on a node to handle UI components nested inside of that element.
	 * @param {jQuery} $node The node to setup the events on.
	 */
	UI.Layout.prototype.setupEvents = function( $node ) {
		var L = this,
			I = this.interface;

		// Setup events needed to support tooltips under this node.
		UI.buttonTooltipSetup( $node );

		// Setup events needed to support the various UI components under this node
		UI.Component.setupAllEvents( $node );

		$node
			.on( 'mangaperformer-activate', function( e ) {
				var name = e.component.name;
				if ( I.on && I.on.activate && I.on.activate[name] ) {
					I.on.activate[name].call( I );
				}
			} )
			.on( 'mangaperformer-changestate', function( e ) {
				var name = e.state.name;
				if ( I.on && I.on.state && I.on.state[name] ) {
					I.on.state[name].call( I, e.state.value );
				}
			} )
			.on( 'mangaperformer-navigate', function( e ) {
				var name = e.navName;
				if ( I.on && I.on.nav && I.on.nav[name] ) {
					I.on.nav[name].call( I, e.direction );
				}
			} );
	};

	/**
	 * Build the interface DOM and attach it to a DOM node.
	 * @param {jQuery} $root The root DOM node (as a jQuery object) to apply the interface to.
	 * @abstract
	 */
	UI.Layout.prototype.applyTo = function( $root ) {};

	/**
	 * Abstract base class for classes that define a layout for the reader interface implemented by UI.ReaderInterface.
	 * @extends UI.Layout
	 * @abstract
	 * @private
	 */
	UI.ReaderLayout = function() {
		UI.Layout.apply( this, arguments );
	};

	UI.ReaderLayout.prototype = create( UI.Layout.prototype );

	/**
	 * Layout for the reader interface that presents the interface in a floating UI box.
	 * @extends UI.ReaderLayout
	 * @private
	 */
	UI.FloatingReaderLayout = function() {
		UI.ReaderLayout.apply( this, arguments );
		var L = this;
	};

	UI.FloatingReaderLayout.prototype = create( UI.ReaderLayout.prototype );

	/**
	 * @inheritdoc
	 */
	UI.FloatingReaderLayout.prototype.applyTo = function( $root ) {
		var L = this,
			I = L.interface,
			R = {};

		L.autoHideController = new UI.AutoHide( {
			duration: 3000,
			show: function() {
				UI.visibility( R.$ui, { visible: true } );
				UI.transition( R.$ui, { opacity: 1, duration: '0.35s', timing: 'ease-out', exclusive: true } );
			},
			hide: function() {
				UI.transition( R.$ui, { opacity: 0, duration: '0.35s', timing: 'ease-out', exclusive: true } )
					.done( function() {
						UI.visibility( this, { visible: false } );
					} );
			}
		} );

		I.getDOM( 'viewport' ).appendTo( $root );
		L.autoHideController.addSurface( I.getDOM( 'viewport' ) );

		/**
		 * The UI node containing the buttons, slider, and other interface elements.
		 */
		R.$ui = $( '<div class="mangaperformer-ui"></div>' );
		L.autoHideController.addInteractiveRegion( R.$ui );

		/**
		 * The node containing the hierarchy of button elements.
		 */
		R.$buttons = $( '<div class="mangaperformer-buttons"></div>' );

		(function() {
			function region( name, cb ) {
				var $region = $( '<div class="mangaperformer-buttonregion"></div>' )
					.addClass( 'mangaperformer-buttonregion-' + name );

				cb( $region );

				$region.appendTo( R.$buttons );
			}

			region( 'left', function( $region ) {
				_.each( [ 'pagespread', 'view-mode' ], function( name ) {
					I.getDOM( name )
						.addClass( 'mangaperformer-buttongroup' )
						.appendTo( $region );
				} );
			} );

			region( 'nav', function( $region ) {
				I.getDOM( 'nav' )
					.addClass( 'mangaperformer-buttongroup' )
					.appendTo( $region )
					// Update sizes
					.find( '[data-ui-component="button"] img' )
						.attr( 'width', 40 )
						.attr( 'height', 40 );
			} );

			region( 'right', function( $region ) {
				_.each( [ 'overview', 'fullscreen' ], function( name ) {
					I.buttonGroup( false )
						.add( I.get( name ) )
						.component
							.getDOM().appendTo( $region );
				} );
			} );
		})();

		R.$buttons.appendTo( R.$ui );

		this.setupEvents( R.$ui );

		I.getDOM( 'slider' ).appendTo( R.$ui );

		I.getDOM( 'title' ).appendTo( R.$ui );

		R.$ui.appendTo( $root );
	};

	/**
	 * Layout for the reader interface that presents the interface sandwich shape with the UI elements in
	 * both a header and footer above and below the viewport.
	 * @extends UI.ReaderLayout
	 * @private
	 */
	UI.SandwichReaderLayout = function() {
		UI.ReaderLayout.apply( this, arguments );
	};

	UI.SandwichReaderLayout.prototype = create( UI.ReaderLayout.prototype );

	/**
	 * A state object used by the interface.
	 * @param {UI.Interface} interfaceObj The interface instance this belongs to.
	 * @param {Object} [state] Initial state data.
	 */
	function StateObject( interfaceObj, state ) {
		this.interface = interfaceObj;
		this.state = state;
	}

	/**
	 * Return the value associated with a key in the state.
	 * @param {string} key The state key.
	 * @return {Mixed} The data.
	 */
	StateObject.prototype.get = function( key ) {
		return this.state[key];
	};

	/**
	 * Update the value associated with a key in the state.
	 * This method must be used instead of directly modifying
	 * the state as this method is responsible for refreshing
	 * the UI components that watch for changes in the state.
	 * @param {string} key The state key.
	 * @param {Mixed} value The data.
	 */
	StateObject.prototype.set = function( key, value ) {
		this.state[key] = value;

		// Refresh any button that uses this key
		this.interface.refreshWhere( function( button ) {
			return _.contains( button.uses, key );
		} );
	};

	/**
	 * Return an object copy of the state, filtered to only have values for the whitelisted keys.
	 * @param {string[]} keys The state keys that should be returned.
	 */
	StateObject.prototype.pick = function( keys ) {
		return _.pick( this.state, keys );
	};

	/**
	 * ...
	 * @param {Object} o The options
	 * @param {UI.Layout} o.layout The layout interface in charge of laying out the interface.
	 * @param {Object} [o.state={}] Initial data for the state tracking object used by the interface.
	 * @param {Object} [o.on] A structure of objects defining high-level handlers for events/actions
	 *                        taken by components within the interface.
	 * @param {Object} [o.on.activate] Activate event handlers mapping name to handler.
	 * @param {Object} [o.on.state] State change event handlers mapping name to handler.
	 * @param {Object} [o.on.nav] Navigation event handlers mapping name to handler.
	 * @private
	 */
	UI.Interface = function( o ) {
		this.layout = o.layout;
		this.components = {};
		this.state = new StateObject( this, o.state || {} );
		this.on = o.on || {};
	};

	/**
	 * Return a registered interface component.
	 * @param {string} name The name of the component to return.
	 */
	UI.Interface.prototype.get = function( name ) {
		if ( !_.has( this.components, name ) ) {
			throw new Error( "There is no component by the name " + name );
		}
		return this.components[name];
	};

	/**
	 * Return the DOM node for a registered interface component.
	 * This is basically a shortcut for `.get( name ).getDOM();`
	 * @param {string} name The name of the component.
	 * @return {jQuery} The DOM node wrapped in jQuery.
	 */
	UI.Interface.prototype.getDOM = function( name ) {
		return this.get( name ).getDOM();
	};

	/**
	 * Register a component with the interface.
	 * @param {string} name The name of the component.
	 * @param {Object} obj The component instance.
	 */
	UI.Interface.prototype.registerComponent = function( name, obj ) {
		if ( _.has( this.components, name ) ) {
			throw new Error( "There is already a component named " + name );
		}
		if ( !(obj instanceof UI.Component ) && !( obj instanceof Viewport ) ) { // @fixme Adding Viewport here is a temporary hack.
			throw new TypeError( "Tried to register something other than an UI.Component instance as the component named " + name );
		}

		this.components[name] = obj;
	};

	/**
	 * Create and then register a component with the interface.
	 * @param {string|false} name The name of the component. This may be false if a layout is
	 *                            creating a component that is not supposed to be registered.
	 * @param {function} Component A constructor for the UI.Component type to create.
	 * @param {Object} o The options to use while constructing the component.
	 * @return {Object} The component's agent.
	 */
	UI.Interface.prototype.createComponent = function( name, Component, o ) {
		o = $.extend( { name: name }, o || {} );
		var component = new Component( this, o );
		if ( name ) {
			this.registerComponent( name, component );
		}
		return component.agent;
	};

	UI.Interface.prototype.buttonGroup = function( name, o ) {
		return this.createComponent( name, UI.ButtonGroup, o );
	};

	UI.Interface.prototype.stateSet = function( name, o ) {
		return this.createComponent( name, UI.StateSet, o );
	};

	UI.Interface.prototype.navButtons = function( name, o ) {
		return this.createComponent( name, UI.NavButtons, o );
	};

	UI.Interface.prototype.button = function( name, o ) {
		return this.createComponent( name, UI.Button, o ).component;
	};

	/**
	 * Low level method for refreshing components within the interface.
	 * Accepts a callback which will be called with each component
	 * and expects a boolean indicating whether the component should
	 * be refreshed or not.
	 * @param {Function} filter The callback filter function.
	 * @param {UI.component} filter.component The component to filter.
	 */
	UI.Interface.prototype.refreshWhere = function( filter ) {
		var I = this;
		_.each( I.components, function( component ) {
			if ( !( component instanceof UI.Component ) ) { return; }
			if ( filter.call( I, component ) ) {
				component.refresh();
			}
		} );
	};

	/**
	 * Refresh every component within the interface. Used when a large
	 * scale change is made. Such as the i18n language changing.
	 */
	UI.Interface.prototype.refreshAll = function() {
		this.refreshWhere( function() { return true; } );
	};

	/**
	 * Refresh components that are setup to listen for a specific
	 * refresh event name.
	 * @param {string} eventName The event name.
	 */
	UI.Interface.prototype.refreshFor = function( eventName ) {
		this.refreshWhere( function( component ) {
			return _.contains( component.refreshOn, eventName );
		} );
	};

	/**
	 * Build the interface DOM and attach it to a DOM node.
	 * @param {jQuery} $root The root DOM node (as a jQuery object) to apply the interface to.
	 */
	UI.Interface.prototype.applyTo = function( $root ) {
		this.layout.interface = this;
		this.layout.applyTo( $root );
	};

	/**
	 * @extends UI.Interface
	 */
	UI.ReaderInterface = function( o ) {
		UI.Interface.call( this, o );
		var U = this;

		U.stateSet( 'pagespread' )
			.state( 'pagespread-1', {
				state: 1,
				icon: "1-page-spread",
				label: __.f( "button.spread.1" )
			} )
			.state( 'pagespread-2', {
				state: 2,
				icon: "2-page-spread",
				label: __.f( "button.spread.2" )
			} );

		U.stateSet( 'view-mode' )
			.state( 'view-pagefit', {
				state: Performer.ViewMode.PAGEFIT,
				icon: "fullpage-view",
				label: __.f( "button.view.page" )
			} )
			.state( 'view-pagewidth', {
				state: Performer.ViewMode.PAGEWIDTH,
				icon: "pagewidth-view",
				label: __.f( "button.view.width" )
			} )
			.state( 'view-panel', {
				state: Performer.ViewMode.PANEL,
				icon: "panel-view",
				label: __.f( "button.view.panel" )
			} );

		U.navButtons( 'nav' )
			.prev( 'prev', {
				uses: [ 'manga', 'viewMode' ],
				icon: function( s ) {
					return s.manga && s.manga.rtl
						? "nav-right"
						: "nav-left";
				},
				label: function( s ) {
					return s.viewMode === Performer.ViewMode.PANEL
						? __.t( "button.panel.prev" )
						: __.t( "button.page.prev" );
				}
			} )
			.next( 'next', {
				uses: [ 'manga', 'viewMode' ],
				icon: function( s ) {
					return s.manga && s.manga.rtl
						? "nav-left"
						: "nav-right";
				},
				label: function( s ) {
					return s.viewMode === Performer.ViewMode.PANEL
						? __.t( "button.panel.next" )
						: __.t( "button.page.next" );
				}
			} );

		U.button( 'overview', {
			icon: "page-overview",
			label: __.f( "button.overview.open" )
		} );

		U.button( 'fullscreen', {
			refresh: 'fullscreenchange',
			icon: function() {
				return UI.Fullscreen.check()
					? "undo-fullscreen"
					: "do-fullscreen";
			},
			label: function() {
				return UI.Fullscreen.check()
					? __.t( "button.fullscreen.exit" )
					: __.t( "button.fullscreen.enter" );
			},
			support: function() {
				return UI.Fullscreen.supported();
			}
		} );

		U.createComponent( 'slider', UI.PaneSlider );

		U.createComponent( 'title', UI.Title, { 'class': 'mangaperformer-title' } );
	};

	UI.ReaderInterface.prototype = create( UI.Interface.prototype );

	/**
	 * Class handling performer viewports. These viewports handle displaying of the images in
	 * a manga/comic, zooming, image pans, and transitions moving pages in and out of the viewport.
	 * @abstract
	 * @private
	 * @uses Pane
	 */
	function Viewport() {
		this.init();
	}

	/**
	 * Return a new instance of a Viewport subclass. This method picks the best implementation
	 * available based on what the browser supports.
	 *
	 * @return {Viewport}
	 * @static
	 */
	Viewport.getBestViewport = function() {
		if ( Supports.transform ) {
			return new ViewportTransform;
		}

		return new ViewportCSS21;
	};

	/**
	 * Setup the viewport.
	 */
	Viewport.prototype.init = function() {
		var V = this;

		/**
		 * @property {jQuery} $viewport
		 * The node containing the viewport.
		 */
		V.$viewport = $( '<div class="mangaperformer-viewport"></div>' );
	};

	/**
	 * Method to return the viewport DOM. Allows the viewport to be treated like a UI component.
	 * @return {jQuery} The DOM node
	 */
	Viewport.prototype.getDOM = function() {
		return this.$viewport;
	};

	/**
	 * Add a new pane to the viewport. Sets the new pane as the current pane.
	 *
	 * @param {HTMLImageElement[]} images The image(s) to display in the viewport.
	 * @param {Object} pos The starting position for the viewport.
	 * @return {Pane} The pane instance that was created.
	 */
	Viewport.prototype.addPane = function( images, pos ) {
		var V = this;
		var pane = new Pane( V, images );
		pane.setPosition( pos );
		V.pane = pane;
		return pane;
	};

	/**
	 * Refresh the viewport positioning css for a viewport pane.
	 *
	 * @param {Pane} pane The pane instance to refresh css for.
	 * @abstract
	 */
	Viewport.prototype.refreshPosition = function( pane ) {
		throw new Error( "This method must be overridden." );
	};

	/**
	 * Viewport implementation using only CSS 2.1 properties, for browsers that don't implement
	 * CSS3's 2D or 3D transformations.
	 *
	 * @extends Viewport
	 * @private
	 */
	function ViewportCSS21() {
		Viewport.apply( this, arguments );
	}
	ViewportCSS21.prototype = create( Viewport.prototype );

	/**
	 * Viewport implementation using CSS3 transforms.
	 *
	 * Using transform for viewport handling eliminates pixel snapping in animations (which degrades)
	 * the animation and eliminates the need for the browser to do repaints of the element improving
	 * the viewport's performance.
	 *
	 * A 3D transform is added to the transform where supported to force some browsers to enable
	 * hardware acceleration making transitions much more efficient.
	 *
	 * @extends Viewport
	 * @private
	 */
	function ViewportTransform() {
		Viewport.apply( this, arguments );

		/**
		 * @property {boolean}
		 * Indicates whether the Transform Viewport should add a 3D transformation to the end of
		 * the transform stack to trigger hardware acceleration.
		 * Automatically set to the value of Supports.transform3D.
		 */
		this.use3D = Supports.transform3D;
	}
	ViewportTransform.prototype = create( Viewport.prototype );

	/**
	 * @inheritdoc
	 */
	ViewportTransform.prototype.refreshPosition = function( pane ) {
		var Vw = this.$viewport.width(),
			Vh = this.$viewport.height(),
			Pw = pane.width,
			Ph = pane.height;

		// Determine the scale
		var scales = [];
		if ( _.isNumber( pane.position.horizontal ) ) {
			scales.push( ( Vw / Pw ) * pane.position.horizontal );
		}
		if ( _.isNumber( pane.position.vertical ) ) {
			scales.push( ( Vh / Ph ) * pane.position.vertical );
		}

		var scale = _.min( scales );

		// Virtual Pane dimensions for the pane at the new scale
		var vPw = Pw * scale,
			vPh = Ph * scale;

		// Build the transformation
		var transform = [];

		// Translate the pane to the center of the viewport
		var translateX = Vw / 2 - vPw / 2;
		transform.push( 'translate(' + translateX.toFixed(20) + 'px, ' + 0 + 'px)' );

		// Scale the pane to fit
		transform.push( 'scale(' + scale.toFixed(20) + ')' );

		// Finish string
		transform = transform.join( ' ' );

		if ( this.use3D ) {
			// Force hardware acceleration where supported
			transform += " translate3d(0,0,0)";
		}

		// Set the CSS
		pane.$pane
			.css( 'position', 'absolute' )
			.css( 'transform', transform )
			.css( 'transform-origin', '0 0' );
	};

	// @fixme 3D should transform set something like -webkit-backface-visibility: hidden; -webkit-perspective: 1000;
	//   to deal with any potential flickering?
	// or this? http://stackoverflow.com/a/7912696

	/**
	 * A viewport pane that can contain the image of a single page or the pair of images of a page
	 * pair and display it on the performer's viewport.
	 * @private
	 */
	function Pane( viewport, images ) {
		var V = this.viewport = viewport;
		var $pane = this.$pane = $( '<div class="mangaperformer-pane"></div>' );
		$( images ).appendTo( $pane );
		$pane.appendTo( V.$viewport );

		this.ready( function() {
			// Refresh the position when the images have loaded enough data to declare their size
			this.refreshPosition();
		} );
	}

	Pane.prototype.destroy = function() {
		this.$pane.find( 'img' )
			.appendTo( Preloader.getNode() );
		this.$pane.remove();
	};

	Pane.prototype.remove = function() {
		// @todo Animation etc...
		this.destroy();
	};

	/**
	 * Change the position of the pane.
	 *
	 * @param {Object} pos The new position of the pane.
	 * @param {number} [pos.horizontal]
	 * @param {number} [pos.vertical]
	 */
	Pane.prototype.setPosition = function( pos ) {
		this.position = pos;
		this.refreshPosition();
	};

	/**
	 * Refresh the position of the pane. Updating the width, height,
	 * and positional css.
	 */
	Pane.prototype.refreshPosition = function() {
		// Just hide the pane if no real position has been set
		if ( !this.position ) {
			this.$pane.css( 'display', 'none' );
			return;
		}

		var width = 0,
			height = 0;

		this.$pane.find( 'img' ).each( function() {
			width += this.naturalWidth;
			height = Math.max( height, this.naturalHeight );
		} );
		this.width = width;
		this.height = height;

		this.$pane.css({
			width: width,
			height: height,
			display: ''
		});
		this.viewport.refreshPosition( this );
	};

	/**
	 * Return a jQuery.Deferred promise that'll be resolved/rejected
	 * when the images inside the pane have downloaded enough data that
	 * the browser knows their native size. Pane#ready is simpler to use
	 * when actually calling.
	 *
	 * @return {jQuery.Deferred}
	 */
	Pane.prototype.readyPromise = function() {
		var pane = this;
		if ( !this._readyPromise ) {
			var p = $.Deferred();
			Preloader.readyPromise( this.$pane.find( 'img' ) )
				.done( function() {
					p.resolveWith( pane );
				})
				.fail( function() {
					p.rejectWith( pane );
				});
			this._readyPromise = p.promise();
		}
		return this._readyPromise;
	};

	/**
	 * Run a callback when the images inside the pane have downloaded
	 * enough data that the browser knows their native size.
	 *
	 * @param {Function} callback The function to call.
	 * @param {Pane} callback.pane This pane instance.
	 */
	Pane.prototype.ready = function( callback ) {
		this.readyPromise().always( $.proxy( callback, this ) );
	};

	/**
	 * A class that renders an overview of all the pages in the manga/comic.
	 * @param {Manga} The manga for this page overview.
	 * @extends Events
	 * @private
	 */
	function PageOverview( manga ) {
		if ( !( manga instanceof Manga ) ) {
			throw new TypeError( "PageOverview constructor requires an Manga instance to be passed to it." );
		}

		/**
		 * @property {Manga} manga
		 * The manga to render an overview for.
		 * @readonly
		 */
		this.manga = manga;
	}

	// Events.mixin( PageOverview.prototype );
	Events.mixin( PageOverview );

	/**
	 * Shortcut to construct an open an overview at the same time.
	 * @param {Manga} The manga to open an overview for.
	 * @return {PageOverview} The overview
	 * @static
	 */
	PageOverview.open = function( manga ) {
		var overview = new PageOverview( manga );
		overview.open();
		return overview;
	};

	/**
	 * Private function to setup the basic DOM used by all page overviews.
	 * @private
	 * @static
	 */
	PageOverview.setup = function() {
		var O = PageOverview;

		/**
		 * @property {PageOverview|undefined} live
		 * The currently rendering PageOverview instance if any.
		 * @readonly
		 */
		O.live = undefined;

		/**
		 * @property {Manga|undefined} manga
		 * The Manga instance currently being output into the page overview even if closed.
		 * @readonly
		 */
		O.manga = undefined;

		/**
		 * @property {jQuery} $root
		 * The root node for the whole page overview.
		 * @readonly
		 */
		O.$root = $( '<div class="mangaperformer-pageoverview-root"></div>' )
			.attr( 'aria-hidden', 'true' )
			.css( 'visibility', 'collapse' )
			.css( 'display', 'none' );

		/**
		 * @property {jQuery} $header
		 * The header node containing the page overview's title, navigation, etc...
		 * @readonly
		 */
		O.$header = $( '<div class="mangaperformer-pageoverview-header"></div>' );

		/**
		 * @property {jQuery} $title
		 * The title node containing the manga/comic title displayed on the page overview.
		 * @readonly
		 */
		O.$title = $( '<div class="mangaperformer-pageoverview-title"></div>' )
			.appendTo( O.$header );

		/**
		 * @property {jQuery} $nav
		 * The nav node containing the page overview's next/prev page navigation.
		 * @readonly
		 */
		O.$nav = $( '<div class="mangaperformer-pageoverview-nav"></div>' );

		/**
		 * @property {jQuery} $prevPage
		 * The button node that navigates to the previous page of the page overview.
		 * @readonly
		 */
		// O.$prevPage = UI.button( { size: 30, label: __.f( "button.overview.page.prev" ), icon: 'nav-up' } )
		// 	.addClass( 'mangaperformer-pageoverview-navbutton mangaperformer-pageoverview-prevpage' )
		// 	.appendTo( O.$nav );

		/**
		 * @property {jQuery} $nextPage
		 * The button node that navigates to the next page of the page overview.
		 * @readonly
		 */
		// O.$nextPage = UI.button( { size: 30, label: __.f( "button.overview.page.next" ), icon: 'nav-down' } )
		// 	.addClass( 'mangaperformer-pageoverview-navbutton mangaperformer-pageoverview-nextpage' )
		// 	.appendTo( O.$nav );

		O.$nav.appendTo( O.$header );

		O.$header.appendTo( O.$root );

		/**
		 * @property {jQuery} $pageContainer
		 * The pageContainer node containing the page pairs to display in the overview.
		 * @readonly
		 */
		O.$pageContainer = $( '<div class="mangaperformer-pageoverview-pagecontainer"></div>' )
			.appendTo( O.$root );

		/**
		 * @property {undefined|jQuery[]} pagePairs
		 * An array of page pair div nodes containing the thumbs for the manga.
		 */
		O.pagePairs = undefined;

		// We put this inside the performer instead of the body as otherwise fullscreen will be broken in WebKit.
		O.$root.appendTo( Performer.$root );

		// Event handling
		i18n.on( 'languagechanged', function() {
			// @todo Update language of Next/Prev page buttons
		} );

		O.$pageContainer
			// .on( 'click', '.mangaperformer-pageimage', function( e ) {
			// 	// Special fallback for non-mouse non-clicks that trigger click.
			// 	// Such as activating a focused button with a keyboard.
			// 	var $page = $( this );
			// 	if ( $page.data( 'noclick' ) ) {
			// 		$page.data( 'noclick', false );
			// 		return;
			// 	}

			// } )
			.hammer()
				// Tap gesture, handles mice, touches, pointers, etc...
				.on( 'tap', function( ev ) {
					var P = Performer,
						$page = $( ev.target ).closest( '.mangaperformer-pageimage', this );
					if ( !$page.length ) { return; }

					// Kill a click happening after the tap
					$page.data( 'noclick', true );

					var idx = parseInt( $page.attr( 'data-page-index' ), 10 );
					if ( !( O.live instanceof PageOverview ) ) { return; }

					var page = O.live.manga.pages[idx];
					if ( !( page instanceof Page ) ) {
						throw new Error( "Reader error: Failed to acquire page instance using page index from tapped image." );
					}
					
					var pane = P.pageSpread === 2
						? page.pair
						: page;
					P.setPane( pane, {} );

					PageOverview.close();
				} );

		// Don't re-run the setup
		O.setup = function() {};
	};

	/**
	 * Private method to turn on the page overview taking over the document.
	 * @param {PageOverview} The page overview to render.
	 * @private
	 * @static
	 */
	PageOverview.enable = function( overview ) {
		var O = PageOverview;

		if ( !( overview instanceof PageOverview ) ) {
			throw new TypeError( "First argument to PageOverview.enable must be an instance of PageOverview." );
		}
		if ( !( overview.manga instanceof Manga ) ) {
			throw new TypeError( "The page overview's manga is not defined." );
		}

		O.setup();

		if ( O.live ) {
			if ( O.live === overview ) {
				return;
			}
			// @todo Handling for when an overview is already open?
		}

		O.live = overview;

		/**
		 * @event open
		 * Fired when a page overview is being opened/about to be displayed.
		 * @param {Object} e
		 * @param {PageOverview} e.overview The PageOverview being opened.
		 */
		O.emit( 'open', { overview: overview } );

		// Make the root visible.
		// This must be done here before we change the manga otherwise row width calculations will be broken.
		O.$root
			.attr( 'aria-hidden', 'false' )
			.css( 'visibility', '' )
			.css( 'display', '' );

		if ( O.manga !== overview.manga ) {
			O.manga = overview.manga;
			/**
			 * @event mangachanged
			 * Fired when the manga attached to the page overview dom has changed.
			 * @param {Object} e
			 * @param {Manga} e.manga The new manga/comic.
			 */
			O.emit( 'mangachanged', { manga: overview.manga } );
		}

		var manga = overview.manga;

		// $( 'body' ).addClass( 'mangaperformer-pageoverview-on' );
	};

	/**
	 * Method to close the currently displaying page overview.
	 * @static
	 */
	PageOverview.close = function() {
		var O = PageOverview;

		if ( !O.$root || !O.live ) { return; }

		O.$root
			.attr( 'aria-hidden', 'true' )
			.css( 'visibility', 'collapse' )
			.css( 'display', 'none' );

		O.live = undefined;
	};

	PageOverview.events = {
		mangachanged: function( e ) {
			var O = PageOverview;

			// Update title
			O.$title.text( e.manga.title || "" );

			// Update icon for prev/next buttons
			// UI.updateButton( O.$prevPage, { icon: manga.rtl ? 'nav-right' : 'nav-left' } );
			// UI.updateButton( O.$nextPage, { icon: manga.rtl ? 'nav-left' : 'nav-right' } );

			/** Setup pages */

			// Events may actually be the best way to handle this page stuff.
			// - Handle updating the list of pages in an event, only fire it when the manga used is changed.
			// - Handle pagination recalculation in an event, fire it when the pages are updated, on resizes, etc...
			// - Handle reflows of the grid in an event, ...
			// - ...

			// Empty the page container before filling it up.
			O.$pageContainer.empty();

			var preloader = O.manga.getPreloader();

			O.pagePairs = _.map( O.manga.pagePairs, function( pair ) {
				var $pair = $( '<div class="mangaperformer-pageoverview-pair"></div>' );
				var images = $.map( pair, function( page ) {
					return preloader.getThumb( page, O.manga.thumbHeight );
				} );
				$pair.append( images );
				$pair.appendTo( O.$pageContainer ); // @fixme Can we drop this without breaking the readyPromise?

				Preloader.readyPromise( images )
					.always( function() {
						var width = 0;
						$( images ).each( function() {
							width += Math.ceil( this.naturalWidth / ( this.naturalHeight / O.manga.thumbHeight ) );
						} );
						$pair.css( 'width', width );

						// @todo re-render the grid
					} );

				return $pair;
			} );

			O.emit( 'refreshrows' );
		},

		refreshrows: function() {
			var O = PageOverview;

			// Calculate rows
			var $pairs = O.$pageContainer.find( '.mangaperformer-pageoverview-pair' ),
				rowCounts = [];

			var overviewWidth = O.$pageContainer.width(),
				start = 0, count = 1;

			var escape = 10;

			while ( start + count < O.pagePairs.length + 1 ) {
				var rowPairs = O.pagePairs.slice( start, start + count ),
					maxWidth = 0,
					rowWidth = 0;
				$.each( rowPairs, function() {
					maxWidth = Math.max( maxWidth, $( this ).width() );
				} );
				rowWidth = ( 25 * rowPairs.length ) + ( maxWidth * rowPairs.length );

				if ( rowWidth < overviewWidth && start + count < O.pagePairs.length ) {
					// We still haven't passed the rendering area width. Add a count to this row and try again.
					count++;
				} else {
					// Either we've finished this row or run out of pages.
					// However make sure that we do not change a count of 1 to 0 resulting in an infinite loop.
					if ( rowWidth >= overviewWidth && count > 1 ) {
						// Row width is now over rendering area width row count should be one less
						// than the count that went over.
						count--;
					}

					// The box count is a measure of how many maxWidth boxes (plus min spacing) could fit in this
					// row. It often matches the row count except on a last row in which the row is not full.
					var boxLimit = Math.max( 1, Math.floor( overviewWidth / ( 25 + maxWidth ) ) );

					rowCounts.push( { start: start, count: count, boxWidth: maxWidth, boxLimit: boxLimit } );

					var $row = $( '<div class="mangaperformer-pageoverview-row"></div>' )
						.attr( 'data-row', rowCounts.length - 1 )
						.attr( 'data-row-start', start )
						.attr( 'data-row-count', count )
						.attr( 'data-row-boxwidth', maxWidth )
						.attr( 'data-row-boxlimit', boxLimit )
						.append( O.pagePairs.slice( start, start + count ) )
						.appendTo( O.$pageContainer )
						.children()
							.each( function( i ) {
								$( this ).attr( 'data-row-col', i );
							} );

					start += count;
					count = 1;
				}
			}

			// @todo Instead of 50 make the vertical gap a range between 10-50.

			O.emit( 'refreshpages' );
		},

		refreshpages: function() {
			var O = PageOverview;

			var overviewHeight = O.$pageContainer.height(),
				rowLimit = Math.max( 1, Math.floor( overviewHeight / ( O.manga.thumbHeight + 10 ) ) );

			var $page;
			O.$pageContainer.find( '.mangaperformer-pageoverview-row' )
				.each( function() {
					var $row = $( this ),
						rowIndex = parseInt( $row.attr( 'data-row' ), 10 );
					if ( rowIndex % rowLimit === 0 ) {
						$page = $( '<div class="mangaperformer-pageoverview-page"></div>' )
							.attr( 'data-page', Math.floor( rowIndex / rowLimit ) )
							.attr( 'data-page-rowlimit', rowLimit )
							.appendTo( O.$pageContainer );
					}

					$row.appendTo( $page );
				} );

			O.emit( 'reflowpagegrid' );
		},

		reflowpagegrid: function() {
			var O = PageOverview;

			var overviewWidth = O.$pageContainer.width();

			O.$pageContainer.find( '.mangaperformer-pageoverview-page' )
				.each( function() {
					var $page = $( this ),
						pageIndex = parseInt( $page.attr( 'data-page-index' ), 10 );

					$page.css( {
						position: 'absolute',
						width: '100%', height: '100%',
						left: 0, right: 0,
						top: (100 * pageIndex) + '%'
					} );

					$page.find( '.mangaperformer-pageoverview-row' )
						.each( function() {
							var $row = $( this ),
								rowIndex = parseInt( $row.attr( 'data-row' ), 10 ),
								boxWidth = parseInt( $row.attr( 'data-row-boxwidth' ), 10 ),
								boxLimit = parseInt( $row.attr( 'data-row-boxlimit' ), 10 ),
								gap = ( overviewWidth - ( boxWidth * boxLimit ) ) / boxLimit;

							$row.css( {
								position: 'absolute',
								top: 50 * ( rowIndex + 0.5 ) + O.manga.thumbHeight * rowIndex,
								left: 0, right: 0
							} );
							console.log( 50 * ( rowIndex+0.5 ) + O.manga.thumbHeight * rowIndex );
							console.log( "50 * (%s+0.5) + %s * %s", rowIndex, O.manga.thumbHeight, rowIndex );

							$page.find( '.mangaperformer-pageoverview-pair' )
								.each( function() {
									var $pair = $( this ),
										col = parseInt( $pair.attr( 'data-row-col' ), 10 );

									$pair.css( {
										position: 'absolute',
										// top: 50 * ( rowIndex + 0.5 ) + O.manga.thumbHeight * rowIndex,
										top: 0,
										left: ( gap / 2 ) + ( col * boxWidth ) + ( gap * col )
									} );
								} );
						} );
				} );

			// This code is unfinished (was being converted into the above unfinished block) so for now we're
			// just going to add a little hack to stop linters from considering stuff in here to be errors.
			var rowCounts, $pairs;

			var index = 0;
			_.each( rowCounts, function( o, row ) {
				var gap = ( overviewWidth - ( o.boxWidth * o.boxLimit ) ) / o.boxLimit,
					col = 0;

				_.times( o.count, function() {
					var $pair = $pairs.eq(index);

					$pair.css( {
						position: 'absolute',
						top: 50 * ( row + 0.5 ) + O.manga.thumbHeight * row,
						left: ( gap / 2 ) + ( col * o.boxWidth ) + ( gap * col )
					} );

					if ( index === 0 ) {
						// The first pair should be right aligned in case it's the cover of a 2-page spread
						$pair.css( 'margin-left', o.boxWidth - $pair.width() );
					} else if ( index === $pairs.length - 1 ) {
						// The last page should be left aligned in case it's a trailing page
						$pair.css( 'margin-left', 0 );
					} else {
						// Pages in the middle of the book should be center aligned
						$pair.css( 'margin-left', ( o.boxWidth - $pair.width() ) / 2 );
					}

					index++;
					col++;
				} );
			} );
		}
	};

	_.each( PageOverview.events, function( handler, eventName ) {
		var O = PageOverview;
		O.on( eventName, handler );
	} );

	/**
	 * Open the page overview rendering it and displaying it on the screen.
	 */
	PageOverview.prototype.open = function() {
		// @fixme Handle already open page overviews
		PageOverview.enable( this );
	};

	/**
	 * Object in charge of rendering and performing a manga/comic.
	 * @extends Events
	 * @singleton
	 * @private
	 */
	var Performer = {
		/**
		 * @property {Performer.ViewMode} [viewMode=Performer.ViewMode.PAGEFIT]
		 * The current view mode of the performer.
		 * @readonly
		 */
		viewMode: 'pagefit',

		/**
		 * @property {1|2} [pageSpread=1]
		 * The number of pages in this page spread. 1-page or 2-page spread.
		 * @readonly
		 */
		pageSpread: 1,

		/**
		 * Internal method to setup the performer DOM.
		 */
		setup: function() {
			var P = Performer;

			$( '<style></style>' )
				.append( MANGAPERFORMER_CSS )
				.prependTo( 'head' );

			/**
			 * @property {jQuery} $root
			 * The root node for the whole performer.
			 * @readonly
			 */
			P.$root = $( '<div class="mangaperformer-root"></div>' )
				.attr( 'aria-hidden', 'true' )
				.css( 'visibility', 'collapse' )
				.css( 'display', 'none' );

			/**
			 * @property {Viewport} viewport
			 * The viewport on the performer.
			 * @readonly
			 */
			P.viewport = Viewport.getBestViewport();

			/**
			 * @property {UI.ReaderInterface} ui
			 * The UI element containing the buttons, slider, and other interface elements.
			 * @readonly
			 */
			P.ui = new UI.ReaderInterface( {
				layout: new UI.FloatingReaderLayout(),
				on: {
					state: {
						pagespread: function( spread ) {
							P.setPageSpread( spread );
						},
						'view-mode': function( viewMode ) {
							P.setViewMode( viewMode );
						}
					},
					nav: {
						nav: function( direction ) {
							if ( direction === 'prev' ) {
								P.prevPane();
							} else {
								P.nextPane();
							}
						}
					},
					activate: {
						overview: function() {
							// @fixme This could probably be a bit cleaner
							PageOverview.open( P.manga );
						},
						fullscreen: function() {
							if ( UI.Fullscreen.check() ) {
								UI.Fullscreen.cancel();
							} else {
								UI.Fullscreen.request( P.$root[0] );
							}
						}
					}
				}
			} );
			P.ui.registerComponent( 'viewport', P.viewport );

			P.ui.applyTo( P.$root );

			P.$root.appendTo( $( 'body' ) );

			// Event handling
			i18n.on( 'languagechanged', function() {
				P.ui.refreshAll();
			} );

			// @fixme These events should probably only be bound when the performer is enabled
			$( window ).resize( function() {
				if ( P.viewport.pane ) {
					// Refresh the positioning css when the window is resized
					P.viewport.pane.refreshPosition();
				}
			} );

			UI.Fullscreen.on( function() {
				/**
				* @event fullscreenchange
				* Fired when the browser's native fullscreenchange event has fired indicating the browser
				* has entered or exited fullscreen.
				* Duplicated into the Performer's event system for easy refresing of the fullscreen button.
				*/
				P.emit( 'fullscreenchange' );
				P.ui.refreshFor( 'fullscreenchange' );
			} );

			// @fixme Document or root?
			// @todo Implement pageup/pagedown keys when I can actually test them.
			var hotkeys = {
				'left': function() {
					if ( !P.manga ) { return; }

					if ( P.manga.rtl ) {
						P.nextPane();
					} else {
						P.prevPane();
					}
				},
				'right': function() {
					if ( !P.manga ) { return; }

					if ( P.manga.rtl ) {
						P.prevPane();
					} else {
						P.nextPane();
					}
				},
				'f': function() {
					if ( !UI.Fullscreen.supported() ) {
						return true;
					}

					if ( UI.Fullscreen.check() ) {
						UI.Fullscreen.cancel();
					} else {
						UI.Fullscreen.request( P.$root[0] );
					}
				},
				'1': function() {
					if ( !P.manga ) { return; }

					P.setPageSpread( 1 );
				},
				'2': function() {
					if ( !P.manga ) { return; }

					P.setPageSpread( 2 );
				}
			};
			$.each( hotkeys, function( keycombo, handler ) {
				// Arrow keys don't generate keypress events in Chrome/WebKit
				$( document ).on( /up|right|down|left/.test( keycombo ) ? 'keydown' : 'keypress', null, keycombo, handler );
			} );

			P.viewport.$viewport
				.hammer()
					.on( 'tap', function( ev ) {
					} );


			P.ui.get( 'slider' )
				.on( 'userstart', function() {
					this.previewOn = true;
				} )
				.on( 'handlechanged', function( e ) {
					if ( !this.previewOn ) { return; }
					var newPane = P.pane.list.getConstrained( e.index );
					this.setPreview( newPane );
				} )
				.on( 'userend', function() {
					this.previewOn = false;
					this.setPreview( false );
				} )
				.on( 'indexchanged', function( e ) {
					var newPane = P.pane.list.getConstrained( e.index );
					P.setPane( newPane, {
						animate: true
					} );
				} );

			// Auto-detect the language on first setup
			i18n.detectLanguage();

			// Don't re-run the setup
			P.setup = function() {};
		},

		/**
		 * Special method to refresh the label, icon, etc... of a button.
		 *
		 * @param {jQuery} $button A jQuery object containing the button.
		 */
		refreshButton: function( $button ) {
			var button = $button.data( 'button' );

			// @todo Handle page/panel label changes
			var label = _.isFunction( button.label )
				? button.label()
				: button.label;

			// @todo Handle manga/directionality changes
			var icon = _.isFunction( button.icon )
				? button.icon()
				: typeof button.icon === 'object'
				? button.icon.ltr
				: button.icon;

			UI.updateButton( $button, {
				label: label || "",
				icon: icon
			} );
		},

		/**
		 * Internal method to turn on the performer taking over the document.
		 */
		enable: function() {
			// @todo Add an optional open animation (with a 'from' point). Do this by creating a
			//   black box with the same BG color as the performer root. Transitioning it to fill
			//   the screen with the top left set at the scroll{Top,Left}. Then once it's covered
			//   the screen applying the scroll and viewport takeover and relocating the fake box
			//   to the top/left. Then fading the real performer root in over top of the fake box.
			// @todo Finish handling scrollbars by saving the scroll position and then
			//   setting it to 0/0 and using overflow: hidden; on the body.
			//   Then we can restore the state when we disable the performer.
			var P = Performer;

			P.disabledState = {};

			P.$root
				.attr( 'aria-hidden', 'false' )
				.css( 'visibility', '' )
				.css( 'display', '' );
			$( 'body' ).addClass( 'mangaperformer-on' );

			P.disabledState.title = document.title;

			P.disabledState.viewport = $( 'meta[name="viewport"]' ).detach();
			$( '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no" />' ).appendTo( 'head' );
		},

		/**
		 * Method used to start playing a manga/comic.
		 *
		 * @param {Manga} manga
		 */
		play: function( manga ) {
			var P = Performer;
			if ( !$.isReady ) {
				$( function() {
					Performer.play( manga );
				} );
				return;
			}
			P.setup();

			// @todo Handle things like exiting currently playing manga/comics
			P.enable();

			P.ui.get( 'slider' ).setLoaded( 0 );
			var preloader = manga.getPreloader();
			preloader.on( 'progress', function( e ) {
				P.ui.get( 'slider' ).setLoaded( e.progress );
			} );
			preloader.preload();

			// P.once( 'disable', function() {
				// @todo Remove the preloader.on we registered
				// preloader.stop();
			// } );

			P.setManga( manga );
			P.setPane( P.pageSpread === 2
				? manga.pagePairs[0]
				: manga.pages[0] );
		},

		/**
		 * Set the manga that'll now be displayed by the reader.
		 *
		 * Does stuff like setting the Performer.manga property, setting up titles,
		 * and firing an event indicating a change in manga.
		 *
		 * @param {Manga} The manga.
		 * @fires mangachanged
		 */
		setManga: function( manga ) {
			var P = Performer;

			/**
			 * @property {Manga}
			 * The current manga being performed.
			 * @readonly
			 */
			P.manga = manga;

			if ( manga.title ) {
				// After enabling, if manga has title set the page title to it
				document.title = manga.title;
				P.ui.state.set( 'title', manga.title );
			} else {
				P.ui.state.set( 'title', false );
			}

			/**
			 * @event mangachanged
			 * Fired when the manga/comic being performed by the performer has changed.
			 * @param {Object} e
			 * @param {Manga} e.manga The new manga/comic being performed.
			 */
			P.emit( 'mangachanged', { manga: manga } );
			P.ui.state.set( 'manga', manga );
		},

		/**
		 * Set the pane to display in the viewport.
		 *
		 * @param {Page|PagePair} pane The page or page pair to display in the pane.
		 * @param {Object} [options] The options for the pane change.
		 * @param {boolean} [options.animate=false] Animate the pane change.
		 */
		setPane: function( pane, options ) {
			var P = Performer;
			options = $.extend( {
				animate: false
			}, options || {} );

			if ( !( P.manga instanceof Manga ) ) {
				throw new Error( "The manga has not been set." );
			}

			var pages;
			if ( pane instanceof Page ) {
				pages = [pane];
			} else if ( pane instanceof PagePair ) {
				pages = pane;
			} else {
				throw new TypeError( "Performer.setPane must be called with either a Page or a PagePair." );
			}

			/**
			 * @property {Page|PagePair}
			 * The current page or page pair being displayed as the pane.
			 * @readonly
			 */
			P.pane = pane;

			var preloader = P.manga.getPreloader();
			var images = $.map( pages, function( page ) {
				return preloader.getImage( page );
			} );

			if ( P.viewport.pane ) {
				P.viewport.pane.remove();
				// @todo Do a removal animation for this pane.
			}
			P.viewport.addPane( images );
			// @fixme This only adds a pane. It doesn't remove the old one or do any transitions.
			P.setViewMode( P.viewMode );

			P.ui.get( 'slider' )
				.setDirection( P.manga.rtl ? 'rtl' : 'ltr' )
				.setSize( pane.list.length )
				.setIndex( pane.idx )
				.flush();
		},

		/**
		 * Switch to the previous pane in the current page, pair, or panel list.
		 *
		 * @param {Object} [options] The options for the pane change.
		 * @param {boolean} [options.animate=true] Animate the pane change.
		 */
		prevPane: function( options ) {
			var P = Performer;
			options = $.extend( {
				animate: true
			}, options || {} );
			if ( P.pane && P.pane.prev ) {
				P.setPane( P.pane.prev, options );
			}
		},

		/**
		 * Switch to the next pane in the current page, pair, or panel list.
		 *
		 * @param {Object} [options] The options for the pane change.
		 * @param {boolean} [options.animate=true] Animate the pane change.
		 */
		nextPane: function( options ) {
			var P = Performer;
			options = $.extend( {
				animate: true
			}, options || {} );
			if ( P.pane && P.pane.next ) {
				P.setPane( P.pane.next, options );
			}
		},

		/**
		 * Set the view mode being displayed in the viewport.
		 * Will emit a viewmodechanged event if the mode is different
		 * from the current event. The zoom/transformation of the pane
		 * can be reset by calling this method with the current view mode.
		 *
		 * @param {Performer.ViewMode} The mode to switch to.
		 * @return {Performer.ViewMode} The old view mode.
		 * @fires viewmodechanged
		 */
		setViewMode: function( mode ) {
			var P = Performer,
				oldMode = P.viewMode;

			if ( mode === P.ViewMode.PAGEFIT ) {
				P.viewMode = mode;
				P.viewport.pane.setPosition( {
					horizontal: 1,
					vertical: 1
				} );
			} else if ( mode === P.ViewMode.PAGEWIDTH ) {
				P.viewMode = mode;
				P.viewport.pane.setPosition( {
					horizontal: 1
				} );
			} else if ( mode === P.ViewMode.PANEL ) {
				P.viewMode = mode;
				// @todo This needs a lot of special handling
			} else {
				throw new Error( "View mode must be one of pagefit, pagewidth, or panel." );
			}

			if ( P.viewMode !== oldMode ) {
				/**
				 * @event viewmodechanged
				 * Fired when the view mode is changed.
				 * @param {Object} e
				 * @param {Performer.ViewMode} e.viewMode The new view mode.
				 */
				P.emit( 'viewmodechanged', { viewMode: P.viewMode } );
				P.ui.state.set( 'viewMode', P.viewMode );
			}
			return oldMode;
		},

		/**
		 * Change the page spread, between 1 or 2 page spread.
		 *
		 * @param {1|2} spread The page spread to switch to.
		 * @return {1|2} The old page spread.
		 * @fires pagespreadchanged
		 */
		setPageSpread: function( spread ) {
			var P = Performer,
				oldSpread = P.pageSpread;

			if ( spread === 1 ) {
				P.pageSpread = spread;
				if ( P.pane instanceof PagePair ) {
					// Change the pane to the first page in the current pair
					P.setPane( P.pane[0] );
				}
			} else if ( spread === 2 ) {
				P.pageSpread = spread;
				if ( P.pane instanceof Page ) {
					// Change the pane to the pair this page belongs to.
					P.setPane( P.pane.pair );
				}
			} else {
				throw new Error( "Page spread must be one of 1 or 2.");
			}

			if ( P.pageSpread !== oldSpread ) {
				/**
				 * @event viewmodechanged
				 * Fired when the view mode is changed.
				 * @param {Object} e
				 * @param {Performer.ViewMode} e.viewMode The new view mode.
				 */
				P.emit( 'pagespreadchanged', { pageSpread: P.pageSpread } );
			}
			return oldSpread;
		}
	};

	Events.mixin( Performer );

	/**
	 * @enum {string} Performer.ViewMode
	 * A performer view mode.
	 * @alternateClassName ViewMode
	 * @private
	 */
	Performer.ViewMode = {
		/**
		 * Fit the whole page into the viewport.
		 */
		PAGEFIT: 'pagefit',

		/**
		 * Fit the page width into the viewport but crop vertically.
		 */
		PAGEWIDTH: 'pagewidth',

		/**
		 * Focus the viewport on individual panels (when that data is provided).
		 */
		PANEL: 'panel'
	};

	// Valid language codes
	i18n.languages = [
		"en",
		"en-x-test"
	];

	// Language fingerprints
	i18n.languageFingerprints = {
		"en-x-test": "c28b9980"
	};

	// Canonical English message texts
	i18n.messages.en = {
		"language": "English",
		"button.page.prev": "Previous page",
		"button.page.next": "Next page",
		"button.panel.prev": "Previous panel",
		"button.panel.next": "Next panel",
		"button.spread.1": "One page spread",
		"button.spread.2": "2-page spread",
		"button.view.page": "Fit page view",
		"button.view.width": "Fit width view",
		"button.view.panel": "Panel view",
		"button.fullscreen.exit": "Exit full screen",
		"button.fullscreen.enter": "Full screen",
		"button.overview.open": "Page overview",
		"button.overview.page.prev": "Previous page",
		"button.overview.page.next": "Next page"
	};

	// src/mangaperformer.less
	var MANGAPERFORMER_CSS = "/*!\n * Manga Performer CSS\n *\n * This CSS is embedded within mangaperformer.js see\n * that file for copyright, licensing, and other details.\n */\n\nbody.mangaperformer-on {\n  overflow: hidden;\n}\n\n.mangaperformer-root,\n.mangaperformer-fauxbox {\n  background-color: #171717;\n}\n\n.mangaperformer-root {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1000;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  font-family: \"Lucida Grande\", \"Lucida Sans Unicode\", \"Lucida Sans\", Geneva, Verdana, sans-serif;\n  font-size: 14px;\n  font-weight: 400;\n}\n\n.mangaperformer-viewport {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 10;\n  width: 100%;\n  height: 100%;\n}\n\n.mangaperformer-ui {\n  position: absolute;\n  right: 10%;\n  bottom: 10%;\n  left: 10%;\n  z-index: 100;\n  padding: 1.5em;\n  color: #fff;\n  pointer-events: none;\n  background-color: rgba(0, 0, 0, 0.25);\n  -webkit-border-radius: 15px;\n     -moz-border-radius: 15px;\n          border-radius: 15px;\n}\n\n.mangaperformer-buttons {\n  position: relative;\n  z-index: 1;\n  height: 40px;\n}\n\n.mangaperformer-buttonregion {\n  position: absolute;\n  z-index: 2;\n  height: 40px;\n}\n\n.mangaperformer-buttonregion-left {\n  left: 0;\n  text-align: left;\n}\n\n.mangaperformer-buttonregion-right {\n  right: 0;\n  text-align: right;\n}\n\n.mangaperformer-buttonregion-nav {\n  right: 0;\n  left: 0;\n  z-index: 1;\n  text-align: center;\n}\n\n.mangaperformer-buttonregion-left .mangaperformer-buttongroup {\n  float: left;\n  margin-right: 1.5em;\n}\n\n.mangaperformer-buttonregion-right .mangaperformer-buttongroup {\n  float: left;\n  margin-left: 1.5em;\n}\n\n/* @todo Add selectors to switch button direction when lang directionality is different. */\n\n.mangaperformer-button {\n  padding: 0;\n  margin: 0;\n  color: #fff;\n  vertical-align: middle;\n  pointer-events: auto;\n  cursor: pointer;\n  background: transparent;\n  border: none;\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n}\n\n.mangaperformer-button img {\n  border: none;\n}\n\n.mangaperformer-slider {\n  margin-top: 1em;\n}\n\n.mangaperformer-slider-bar {\n  position: relative;\n  height: 15px;\n  border: 1px solid transparent;\n  border: 1px solid rgba(119, 119, 119, 0.35);\n  -webkit-border-radius: 10px;\n     -moz-border-radius: 10px;\n          border-radius: 10px;\n}\n\n.mangaperformer-slider-loadedbar,\n.mangaperformer-slider-handle {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  height: 100%;\n  -webkit-border-radius: 10px;\n     -moz-border-radius: 10px;\n          border-radius: 10px;\n}\n\n.mangaperformer-slider-loadedbar {\n  background: #353535;\n  background-color: rgba(119, 119, 119, 0.35);\n}\n\n.mangaperformer-slider-handle {\n  pointer-events: auto;\n  cursor: pointer;\n  background-color: #fff;\n  background-color: rgba(255, 255, 255, 0.5);\n}\n\n.mangaperformer-panepreview {\n  position: absolute;\n  bottom: 20px;\n  z-index: 150;\n  padding: 5px;\n  pointer-events: none;\n  background-color: #fff;\n  -webkit-border-radius: 5px;\n     -moz-border-radius: 5px;\n          border-radius: 5px;\n  -webkit-transition: opacity 0.2s ease;\n     -moz-transition: opacity 0.2s ease;\n       -o-transition: opacity 0.2s ease;\n          transition: opacity 0.2s ease;\n}\n\n.mangaperformer-title {\n  margin-top: 1em;\n  text-align: center;\n  text-shadow: 0 0 5px #000, 0 0 5px #000;\n}\n\n/** Tooltip */\n\n.mangaperformer-tooltip {\n  position: absolute;\n  z-index: 500;\n  padding: 0.5em 1em;\n  color: #000;\n  pointer-events: none;\n  background-color: #000;\n  background-color: rgba(238, 238, 238, 0.8);\n  -webkit-border-radius: 7px;\n     -moz-border-radius: 7px;\n          border-radius: 7px;\n  opacity: 0;\n  -webkit-transition: opacity 0.2s ease;\n     -moz-transition: opacity 0.2s ease;\n       -o-transition: opacity 0.2s ease;\n          transition: opacity 0.2s ease;\n}\n\n.mangaperformer-tooltip:after {\n  position: absolute;\n  bottom: -6px;\n  left: 50%;\n  z-index: 1;\n  margin-left: -3px;\n  border: 6px solid transparent;\n  border-top-color: rgba(238, 238, 238, 0.8);\n  border-bottom-width: 0;\n  content: \"\";\n}\n\n/** Page Overview */\n\n.mangaperformer-pageoverview-root {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  z-index: 1010;\n  width: 100%;\n  height: 100%;\n  overflow: hidden;\n  background-color: #171717;\n  opacity: 0.975;\n}\n\n.mangaperformer-pageoverview-header {\n  position: absolute;\n  top: 0;\n  right: 0;\n  left: 0;\n  height: 40px;\n  line-height: 40px;\n  background-color: #000;\n  background-color: rgba(0, 0, 0, 0.75);\n  -webkit-box-shadow: 0 0 2px #000000;\n     -moz-box-shadow: 0 0 2px #000000;\n          box-shadow: 0 0 2px #000000;\n}\n\n.mangaperformer-pageoverview-title {\n  position: absolute;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  padding: 0 15px;\n  overflow: hidden;\n  font-size: 1.35em;\n  color: #fff;\n  -o-text-overflow: ellipsis;\n     text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.mangaperformer-pageoverview-nav {\n  position: absolute;\n  top: 0;\n  right: 0;\n  bottom: 0;\n}\n\n.mangaperformer-pageoverview-navbutton {\n  -webkit-appearance: none;\n     -moz-appearance: none;\n          appearance: none;\n}\n\n.mangaperformer-pageoverview-pagecontainer {\n  position: absolute;\n  top: 40px;\n  right: 0;\n  bottom: 0;\n  left: 0;\n}\n\n.mangaperformer-pageoverview-pair {\n  background-color: #fff;\n  -webkit-box-shadow: 0 0 5px 5px #ffffff;\n     -moz-box-shadow: 0 0 5px 5px #ffffff;\n          box-shadow: 0 0 5px 5px #ffffff;\n}";

	// Cleaned up SVG icons from icons/
	var MANGAPERFORMER_ICONS = {
		"1-page-spread": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHJlY3Qgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbC1vcGFjaXR5PSIwIiByeD0iMiIgcnk9IjIiIGhlaWdodD0iMzQiIHdpZHRoPSIxOCIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHk9IjEwMTUuNCIgeD0iMTEiIHN0cm9rZS13aWR0aD0iMiIvPgogPC9nPgo8L3N2Zz4K",
		"2-page-spread": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIC0xMDEyLjQpIj4KICA8cmVjdCByeD0iMiIgaGVpZ2h0PSIzNCIgd2lkdGg9IjE2IiB5PSIxMDE1LjQiIHg9IjIxIi8+CiAgPHJlY3Qgcng9IjIiIGhlaWdodD0iMzQiIHdpZHRoPSIxNiIgeT0iMTAxNS40IiB4PSIzIi8+CiA8L2c+Cjwvc3ZnPgo=",
		"close": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iMzAiIHdpZHRoPSIzMCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgLTEwMjIuNCkiIGZpbGw9Im5vbmUiPgogIDxwYXRoIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im0zMCAxNWExNSAxNSAwIDEgMSAtMzAgMCAxNSAxNSAwIDEgMSAzMCAweiIgdHJhbnNmb3JtPSJtYXRyaXgoLjkzMzMzIDAgMCAuOTMzMzMgMSAxMDIzLjQpIiBzdHJva2Utd2lkdGg9IjIuMTQyOSIvPgogIDxwYXRoIGQ9Im04IDggMTQgMTQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMTAyMi40KSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz4KICA8cGF0aCBkPSJtMjIgMTAzMC40LTE0IDE0IiBzdHJva2Utd2lkdGg9IjIuNSIvPgogPC9nPgo8L3N2Zz4K",
		"do-fullscreen": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJzcXVhcmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2ZmZiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHBhdGggc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTcgMTAzMS40IDE0IDE0aC0xNHoiLz4KICA8cGF0aCBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTkgMTAxOS40aDE0djE0eiIvPgogIDxwYXRoIGQ9Im0yMCAxMDI4LjEgNC4yNDI3LTQuMjQyNyA0LjI0MjYgNC4yNDI3LTQuMjQyNyA0LjI0MjZ6bTAgOC40ODUzLTQuMjQyNiA0LjI0MjYtNC4yNDI2LTQuMjQyNyA0LjI0MjYtNC4yNDI2eiIvPgogPC9nPgo8L3N2Zz4K",
		"fullpage-view": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGwtb3BhY2l0eT0iMCIgc3Ryb2tlLXdpZHRoPSIyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIC0xMDEyLjQpIj4KICA8cmVjdCBoZWlnaHQ9IjI2IiB3aWR0aD0iMTgiIHk9IjEwMTkuNCIgeD0iMTEiLz4KICA8cmVjdCBzdHJva2UtZGFzaGFycmF5PSI0LCA0IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEwMTIuNCkiIGhlaWdodD0iMzQiIHdpZHRoPSIzNCIgeT0iMyIgeD0iMyIvPgogPC9nPgo8L3N2Zz4K",
		"nav-down": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHBhdGggc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTMgMTAxOS40aDM0bC0xNyAyMHoiIGZpbGwtcnVsZT0iZXZlbm9kZCIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iI2ZmZiIvPgogPC9nPgo8L3N2Zz4K",
		"nav-left": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHBhdGggc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTMzIDEwMTUuNHYzNGwtMjAtMTd6IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmZmYiLz4KIDwvZz4KPC9zdmc+Cg==",
		"nav-right": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHBhdGggc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTcgMTAxNS40djM0bDIwLTE3eiIgZmlsbC1ydWxlPSJldmVub2RkIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSIjZmZmIi8+CiA8L2c+Cjwvc3ZnPgo=",
		"nav-up": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHBhdGggc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTM3IDEwNDUuNGgtMzRsMTctMjB6IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmZmYiLz4KIDwvZz4KPC9zdmc+Cg==",
		"page-overview": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSIgc3Ryb2tlPSIjZmZmIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSI+CiAgPHJlY3QgaGVpZ2h0PSIxNCIgd2lkdGg9IjYiIHk9IjEwMTUuNCIgeD0iMTEiLz4KICA8cmVjdCBoZWlnaHQ9IjE0IiB3aWR0aD0iNiIgeT0iMTAxNS40IiB4PSIyMSIvPgogIDxyZWN0IGhlaWdodD0iMTQiIHdpZHRoPSI2IiB5PSIxMDE1LjQiIHg9IjI5Ii8+CiAgPHJlY3QgaGVpZ2h0PSIxNCIgd2lkdGg9IjYiIHk9IjEwMzUuNCIgeD0iMyIvPgogIDxyZWN0IGhlaWdodD0iMTQiIHdpZHRoPSI2IiB5PSIxMDM1LjQiIHg9IjExIi8+CiAgPHJlY3QgaGVpZ2h0PSIxNCIgd2lkdGg9IjYiIHk9IjEwMzUuNCIgeD0iMjEiLz4KIDwvZz4KPC9zdmc+Cg==",
		"pagewidth-view": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiIHN0cm9rZS13aWR0aD0iMiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHBhdGggZD0ibTcgMTA0Ny40di0yOGgyNnYyOCIgc3Ryb2tlLWxpbmVjYXA9InNxdWFyZSIvPgogIDxyZWN0IHN0cm9rZS1kYXNoYXJyYXk9IjQsIDQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMTAxMi40KSIgaGVpZ2h0PSIzNCIgd2lkdGg9IjM0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHk9IjMiIHg9IjMiLz4KIDwvZz4KPC9zdmc+Cg==",
		"panel-view": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiIHN0cm9rZS13aWR0aD0iMiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHJlY3Qgc3Ryb2tlLWRhc2hhcnJheT0iNCwgNCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAxMDEyLjQpIiBoZWlnaHQ9IjM0IiB3aWR0aD0iMzQiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgeT0iMyIgeD0iMyIvPgogIDxwYXRoIGQ9Im03IDExaDIybC0xMCAxOGgtMTJ6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEwMTIuNCkiIHN0cm9rZS1saW5lY2FwPSJzcXVhcmUiLz4KICA8cGF0aCBkPSJtMzUgMTFoLTJsLTEwIDE4aDEyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwIDEwMTIuNCkiIHN0cm9rZS1saW5lY2FwPSJzcXVhcmUiLz4KIDwvZz4KPC9zdmc+Cg==",
		"undo-fullscreen": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGhlaWdodD0iNDAiIHdpZHRoPSI0MCIgdmVyc2lvbj0iMS4xIiB4bWxuczpjYz0iaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iPgogPGcgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1saW5lY2FwPSJzcXVhcmUiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbD0iI2ZmZiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCAtMTAxMi40KSI+CiAgPHBhdGggc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0ibTcgMTAzMS40aDE0djE0eiIvPgogIDxwYXRoIGQ9Im04IDEwNDAuMSA0LjI0MjctNC4yNDI3IDQuMjQyNiA0LjI0MjctNC4yNDI3IDQuMjQyNnoiLz4KICA8cGF0aCBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTkgMTAxOS40IDE0IDE0aC0xNHoiLz4KICA8cGF0aCBkPSJtMzIgMTAyNC42LTQuMjQyNiA0LjI0MjYtNC4yNDI2LTQuMjQyNyA0LjI0MjYtNC4yNDI2eiIvPgogPC9nPgo8L3N2Zz4K"
	};

	// Exports
	MangaPerformer.Events = Events;
	MangaPerformer.i18n = i18n;
	MangaPerformer.registerDataExtractor = registerDataExtractor;
	MangaPerformer.Page = Page;
	MangaPerformer.PageList = PageList;
	MangaPerformer.PagePair = PagePair;
	MangaPerformer.PagePairList = PagePairList;
	MangaPerformer.Manga = Manga;

	window.MangaPerformer = MangaPerformer;

})( window, jQuery, _ );
