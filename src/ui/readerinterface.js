"use strict";

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
