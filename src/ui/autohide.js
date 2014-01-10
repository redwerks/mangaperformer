"use strict";

/**
 * Controller for scheduling the auto-hide capabilities of a UI.
 * @param {Object} [o] The options.
 * @param {number} [o.duration=1000] Number of milliseconds to keep the UI visible.
 * @param {Function} [o.show] A callback to run when the UI should become visible.
 * @param {Function} [o.hide] A callback to run when the UI should be hidden.
 * @abstract
 */
UI.AutoHide = function( o ) {
	var AH = this;
	AH.options = $.extend( {
		duration: 1000
	}, o || {} );

	AH.visible = true;
	AH.timerLocked = false;
	AH.visibilityPing();

	if ( Supports.pageVisibility ) {
		var oldPageHidden = document[Supports.pageVisibility.hidden];
		$( document ).on( Supports.pageVisibility.visibilitychange, function( e ) {
			var pageHidden = document[Supports.pageVisibility.hidden];
			if ( !pageHidden && oldPageHidden ) {
				// Show the UI when the page changes from hidden -> visible
				AH.visibilityPing();
			}
			oldPageHidden = pageHidden;
		} );
	}
};

/**
 * Internal abstraction for hiding the UI.
 * @private
 */
UI.AutoHide.prototype._hide = function() {
	if ( !this.visible || this.timerLocked ) { return; }
	this.visible = false;
	if ( _.isFunction( this.options.hide ) ) {
		this.options.hide.call( undefined );
	}
};

/**
 * Internal abstraction for showing the UI.
 * @private
 */
UI.AutoHide.prototype._show = function() {
	if ( this.visible ) { return; }
	this.visible = true;
	if ( _.isFunction( this.options.show ) ) {
		this.options.show.call( undefined );
	}
};

/**
 * Perform a "ping" to visibility. If the UI is hidden it will
 * become visible. The timer will also be reset, delaying the
 * automatic hide event.
 */
UI.AutoHide.prototype.visibilityPing = function() {
	if ( this.timerLocked ) { return; }
	this._show();
	this.timer = clearTimeout( this.timer );
	this.timer = setTimeout( _.bind( this._hide, this ), this.options.duration );
};

/**
 * Hide the UI immediately, bypassing the timer.
 */
UI.AutoHide.prototype.forceHide = function() {
	if ( this.timerLocked ) { return; }
	this._hide();
	this.timer = clearTimeout( this.timer );
};

/**
 * Show the UI without allowing the timer to hide the UI.
 */
UI.AutoHide.prototype.forceShow = function() {
	if ( this.timerLocked ) { return; }
	this._show();
	this.timer = clearTimeout( this.timer );
};

/**
 * Show the UI and lock the visibility so the UI cannot be hidden
 * until the visibility has been unlocked.
 */
UI.AutoHide.prototype.lockVisible = function() {
	if ( this.timerLocked ) { return; }

	this.timerLocked = true;
	this._show();
	this.timer = clearTimeout( this.timer );
};

/**
 * Unlock the visibility so the UI can be hidden again.
 */
UI.AutoHide.prototype.unlockVisible = function() {
	if ( !this.timerLocked ) { return; }

	this.timerLocked = false;
	this.visibilityPing();
};

/**
 * Setup a DOM node as a "surface" for the AutoHide controller.
 * Surfaces are generally large areas with primarily display
 * purposes. Auto hide listens to mouse move and touch tap
 * events on them to trigger show and hide events.
 * @param {jQuery} $surface The surface as a jQuery node.
 */
UI.AutoHide.prototype.addSurface = function( $surface ) {
	var AH = this;
	$surface
		.on( 'mousemove', _.throttle( function() {
			AH.visibilityPing();
		}, 500 ) )
		.hammer()
			.on( 'tap', function( e ) {
				if ( e.gesture.pointerType === 'mouse' ) { return; }

				if ( AH.visible ) {
					AH.forceHide();
				} else {
					AH.visibilityPing();
				}
			} );
};

/**
 * Setup a DOM node as an "interactive region" for the
 * AutoHide controller. Interactive regions are structures
 * containing interactive parts of the UI, typically this is
 * the UI to be hidden itself. Auto hide listens to mouseenter
 * and mouseleave events and forces the UI to remain visible
 * while the mouse is over the interactive region.
 */
UI.AutoHide.prototype.addInteractiveRegion = function( $interactiveRegion ) {
	var AH = this;
	$interactiveRegion
		.on( 'mouseenter', function() {
			AH.lockVisible();
		} )
		.on( 'mouseleave', function() {
			AH.unlockVisible();
		} );
};
