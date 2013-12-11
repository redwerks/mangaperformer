"use strict";

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
