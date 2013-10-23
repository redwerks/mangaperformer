
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
		P.viewport.$viewport.appendTo( P.$root );

		/**
		 * @property {jQuery} $ui
		 * The UI node containing the buttons, slider, and other interface elements.
		 * @readonly
		 */
		P.$ui = $( '<div class="mangaperformer-ui"></div>' );

		/**
		 * @property {jQuery} $buttons
		 * The node containing the hierarchy of button elements.
		 * @readonly
		 */
		P.$buttons = $( '<div class="mangaperformer-buttons"></div>' );
		$.each( [ 'left', 'nav', 'right' ], function( i, key ) {
			// Each button region
			var $region = $( '<div class="mangaperformer-buttonregion"></div>' )
				.addClass( 'mangaperformer-buttonregion-' + key );
			$.each( P.buttons[key], function( i, group ) {
				// Button groupings
				if ( !$.isArray( group ) ) {
					group = [ group ];
				}
				var $group = $( '<div class="mangaperformer-buttongroup"></div>' );
				$.each( group, function( i, button ) {
					if ( _.isFunction( button.support ) ) {
						if ( !button.support() ) {
							// Skip this button if it's declared no support in this browser
							return;
						}
					}

					// Each button
					var $button = UI.button( { size: key === 'nav' ? 40 : 34 } )
						.addClass( 'mangaperformer-button-' + button.name )
						.data( 'button', button );

					if ( button.refresh ) {
						P.on( button.refresh, function() {
							P.refreshButton( $button );
						} );
					}

					P.refreshButton( $button );

					$button.appendTo( $group );
				} );
				$group.appendTo( $region );
			} );
			$region.appendTo( P.$buttons );
		} );

		P.$buttons.appendTo( P.$ui );

		/**
		 * @property {UI.PaneSlider} slider
		 * A UI.PaneSlider instance used for the slider and pane preview in the ui.
		 * @readonly
		 */
		P.slider = new UI.PaneSlider();
		P.slider.appendTo( P.$ui );

		/**
		 * @property {jQuery} $title
		 * The node containing the title text for the manga/comic.
		 * @readonly
		 */
		P.$title = $( '<div class="mangaperformer-title"></div>' );
		P.$title.appendTo( P.$ui );

		P.$ui.appendTo( P.$root );

		P.$root.appendTo( $( 'body' ) );

		// Event handling
		i18n.on( 'languagechanged', function() {
			P.$buttons.find( '.mangaperformer-button' )
				.each( function() {
					P.refreshButton( $( this ) );
				} );
		} );

		// @fixme These events should probably only be bound when the performer is enabled
		$( window ).resize( function() {
			if ( P.viewport.pane ) {
				// Refresh the positioning css when the window is resized
				P.viewport.pane.refreshPosition();
			}
		} );

		$( document ).on( 'fullscreenchange mozfullscreenchange webkitfullscreenchange', function() {
			/**
			 * @event fullscreenchange
			 * Fired when the browser's native fullscreenchange event has fired indicating the browser
			 * has entered or exited fullscreen.
			 * Duplicated into the Performer's event system for easy refresing of the fullscreen button.
			 */
			P.emit( 'fullscreenchange' );
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
				if ( !P.supportsFullscreen() ) {
					return true;
				}

				if ( P.isFullscreen() ) {
					P.cancelFullscreen();
				} else {
					P.requestFullscreen( P.$root[0] );
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

		P.$buttons
			.on( 'click', 'button.mangaperformer-button', function( e ) {
				// Special fallback for non-mouse non-clicks that trigger click.
				// Such as activating a focused button with a keyboard.
				var $button = $( this );
				if ( $button.data( 'noclick' ) ) {
					$button.data( 'noclick', false );
					return;
				}

				var button = $button.data( 'button' );
				if ( _.isFunction( button.activate ) ) {
					button.activate.call( $button[0] );
				}
			} )
			.hammer()
				// Tap gesture, handles mice, touches, pointers, etc...
				.on( 'tap', function( ev ) {
					var $button = $( ev.target ).closest( 'button.mangaperformer-button', this );
					if ( !$button.length ) { return; }

					// Kill a click happening after the tap
					$button.data( 'noclick', true );

					var button = $button.data( 'button' );
					if ( _.isFunction( button.activate ) ) {
						button.activate.call( $button[0] );
					}

					// When the button is focused as a result of pointer/touch interactions blur it when finished.
					$button[0].blur();
				} );

		P.slider
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

		P.slider.setLoaded( 0 );
		var preloader = manga.getPreloader();
		preloader.on( 'progress', function( e ) {
			P.slider.setLoaded( e.progress );
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
			P.$title
				.text( manga.title )
				.attr( 'aria-hidden', 'false' )
				.css( 'visibility', '' )
				.css( 'display', '' );
		} else {
			P.$title
				.attr( 'aria-hidden', 'true' )
				.css( 'visibility', 'collapse' )
				.css( 'display', 'none' );
		}

		/**
		 * @event mangachanged
		 * Fired when the manga/comic being performed by the performer has changed.
		 * @param {Object} e
		 * @param {Manga} e.manga The new manga/comic being performed.
		 */
		P.emit( 'mangachanged', { manga: manga } );
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

		P.slider
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
	},

	/**
	 * Check to see if this browser supports the fullscreen API.
	 * @return {boolean}
	 */
	supportsFullscreen: function() {
		return 'fullscreenElement' in document
			|| 'mozFullScreenElement' in document
			|| 'webkitFullscreenElement' in document;
	},

	/**
	 * Check to see if the document is currently fullscreen.
	 * @return {boolean}
	 */
	isFullscreen: function() {
		return document.fullscreenElement
			|| document.mozFullScreenElement
			|| document.webkitFullscreenElement
			|| false;
	},

	/**
	 * Try to enable fullscreen on the element.
	 * @param {HTMLElement} elem The element to fullscreen.
	 */
	requestFullscreen: function( elem ) {
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
	cancelFullscreen: function() {
		if ( document.cancelFullScreen ) {
			document.cancelFullScreen();
		} else if ( document.mozCancelFullScreen ) {
			document.mozCancelFullScreen();
		} else if ( document.webkitCancelFullScreen ) {
			document.webkitCancelFullScreen();
		}
	},

	buttons: {
		left: [
			[
				{
					name: "pagespread-1",
					icon: "1-page-spread",
					label: __.f( "button.spread.1" ),
					activate: function() {
						var P = Performer;
						P.setPageSpread( 1 );
					}
				},
				{
					name: "pagespread-2",
					icon: "2-page-spread",
					label: __.f( "button.spread.2" ),
					activate: function() {
						var P = Performer;
						P.setPageSpread( 2 );
					}
				}
			],
			[
				{
					name: "view-pagefit",
					icon: "fullpage-view",
					label: __.f( "button.view.page" ),
					activate: function() {
						var P = Performer;
						P.setViewMode( P.ViewMode.PAGEFIT );
					}
				},
				{
					name: "view-pagewidth",
					icon: "pagewidth-view",
					label: __.f( "button.view.width" ),
					activate: function() {
						var P = Performer;
						P.setViewMode( P.ViewMode.PAGEWIDTH );
					}
				},
				{
					name: "view-panel",
					icon: "panel-view",
					label: __.f( "button.view.panel" ),
					activate: function() {}
				}
			]
		],
		nav: [[
			{
				name: "prev",
				refresh: 'mangachanged viewmodechanged',
				icon: function() {
					var P = Performer;
					return P.manga && P.manga.rtl
						? "nav-right"
						: "nav-left";
				},
				label: function() {
					var P = Performer;
					return P.viewMode === P.ViewMode.PANEL
						? __.t( "button.panel.prev" )
						: __.t( "button.page.prev" );
				},
				activate: function() {
					var P = Performer;
					P.prevPane();
				}
			},
			{
				name: "next",
				refresh: 'mangachanged viewmodechanged',
				icon: function() {
					var P = Performer;
					return P.manga && P.manga.rtl
						? "nav-left"
						: "nav-right";
				},
				label: function() {
					var P = Performer;
					return P.viewMode === P.ViewMode.PANEL
						? __.t( "button.panel.next" )
						: __.t( "button.page.next" );
				},
				activate: function() {
					var P = Performer;
					P.nextPane();
				}
			}
		]],
		right: [
			{
				name: "overview",
				icon: "page-overview",
				label: __.f( "button.overview.open" ),
				activate: function() {
					// @fixme This could probably be a bit cleaner
					var P = Performer;
					PageOverview.open( P.manga );
				}
			},
			{
				name: "fullscreen",
				refresh: 'fullscreenchange',
				icon: function() {
					var P = Performer;
					return P.isFullscreen()
						? "undo-fullscreen"
						: "do-fullscreen";
				},
				label: function() {
					var P = Performer;
					return P.isFullscreen()
						? __.t( "button.fullscreen.exit" )
						: __.t( "button.fullscreen.enter" );
				},
				support: function() {
					var P = Performer;
					return P.supportsFullscreen();
				},
				activate: function() {
					var P = Performer;
					if ( P.isFullscreen() ) {
						P.cancelFullscreen();
					} else {
						P.requestFullscreen( P.$root[0] );
					}
				}
			}
		]
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
