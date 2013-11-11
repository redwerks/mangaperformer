"use strict";

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
	O.$prevPage = UI.button( { size: 30, label: __.f( "button.overview.page.prev" ), icon: 'nav-up' } )
		.addClass( 'mangaperformer-pageoverview-navbutton mangaperformer-pageoverview-prevpage' )
		.appendTo( O.$nav );

	/**
	 * @property {jQuery} $nextPage
	 * The button node that navigates to the next page of the page overview.
	 * @readonly
	 */
	O.$nextPage = UI.button( { size: 30, label: __.f( "button.overview.page.next" ), icon: 'nav-down' } )
		.addClass( 'mangaperformer-pageoverview-navbutton mangaperformer-pageoverview-nextpage' )
		.appendTo( O.$nav );

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
