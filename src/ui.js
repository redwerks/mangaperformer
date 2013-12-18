"use strict";

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
	 * @param {string} [p.duration='1s'] The duration for the transition.
	 * @param {string} [p.timing='ease'] The timing function for the transition.
	 * @private
	 */
	transition: function( node, o ) {
		var $node = $( node ),
			defaults = {
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
