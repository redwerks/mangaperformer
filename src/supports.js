"use strict";

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
		}
	}

})();
