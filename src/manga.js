"use strict";

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
export function Manga( cfg ) {
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
