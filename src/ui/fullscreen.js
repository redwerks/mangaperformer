"use strict";

/**
 * Helper object that abstracts use of the browser's fullscreen APIs.
 * @singleton
 * @private
 */
UI.Fullscreen = {
	/**
	 * @property {string}
	 * A space separated string listing the various standard and vendor prefixed names that the
	 * 'fullscreenchange' event goes by. This is used when we register and unregister fullscreen
	 * events to ensure we don't miss support for any browser.
	 * @readonly
	 */
	events: 'fullscreenchange mozfullscreenchange webkitfullscreenchange',

	/**
	 * Register an event handler that'll be called when fullscreen is entered or exited.
	 * @param {Function} handler The callback that will be run.
	 */
	on: function( handler ) {
		$( document ).on( UI.Fullscreen.events, handler );
	},

	/**
	 * De-register an event handler registered with .on().
	 * @param {Function} handler The callback function that was registered.
	 */
	off: function( handler ) {
		$( document ).off( UI.Fullscreen.events, handler );
	},

	/**
	 * Check to see if this browser supports the fullscreen API.
	 * @return {boolean}
	 */
	supported: function() {
		return 'fullscreenElement' in document
			|| 'mozFullScreenElement' in document
			|| 'webkitFullscreenElement' in document;
	},

	/**
	 * Check to see if the document is currently fullscreen.
	 * @return {boolean}
	 */
	check: function() {
		// @todo Test the performer in a context with another thing using the fullscreen API.
		//       See if we need to verify that the fullscreen element is our performer root to avoid bugs.
		return document.fullscreenElement
			|| document.mozFullScreenElement
			|| document.webkitFullscreenElement
			|| false;
	},

	/**
	 * Try to enable fullscreen on the element.
	 * @param {HTMLElement} elem The element to fullscreen.
	 */
	request: function( elem ) {
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
	cancel: function() {
		if ( document.cancelFullScreen ) {
			document.cancelFullScreen();
		} else if ( document.mozCancelFullScreen ) {
			document.mozCancelFullScreen();
		} else if ( document.webkitCancelFullScreen ) {
			document.webkitCancelFullScreen();
		}
	}
};
