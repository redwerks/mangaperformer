"use strict";

/**
 * Create a button with an icon.
 * @param {Object} o The options for the button.
 * @param {number} [o.size=32] The pixel size of the button.
 * @param {string} [o.label] The label for the button.
 * @param {string} [o.icon] The name of the icon for the button.
 * @return {jQuery}
 */
UI.button = function( o ) {
	o = $.extend( {
		size: 32
	}, o );
	var $button = $( '<button type="button" class="mangaperformer-button"></button>' );

	var $img = $( '<img />' )
		.attr( 'width', o.size )
		.attr( 'height', o.size )
		.appendTo( $button );

	// Pass through to updateButton in case the options contain a label or icon
	UI.updateButton( $button, o );

	return $button;
};

/**
 * Update the icon and label for a button.
 * @param {Object} o The options for the button.
 * @param {string|function} [o.label] The label for the button.
 * @param {string} [o.icon] The name of the icon for the button.
 * @return {jQuery}
 */
UI.updateButton = function( $button, o ) {
	if ( !o.label ) {
		o.label = $button.data( 'button-label-fn' );
	}

	if ( o.label ) {
		if ( $.isFunction( o.label ) ) {
			$button.data( 'button-label-fn', o.label );
			o.label = o.label.call( undefined );
		}
		$button.find( 'img' ).attr( 'alt', o.label );
		$button.attr( 'aria-label', o.label );
	}

	if ( o.icon ) {
		// All browsers that support SVG images also support data: URIs
		var src = Supports.svg
			? MANGAPERFORMER_ICONS[o.icon]
			: MangaPerformer.BASE + '/icons/' + o.icon + ".png";
		$button.find( 'img' ).attr( 'src', src );
	}
};
