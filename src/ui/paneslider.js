"use strict";

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
