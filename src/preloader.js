
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
