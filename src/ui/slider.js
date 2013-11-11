"use strict";

/**
 * A slider UI element. Represents a bar with loading indicator and handle
 * @extends Events
 * @private
 */
UI.Slider = function() {
	var S = this;

	S.rtl = false;

	/**
	 * @property {number} size
	 * The total number of items within the slider.
	 * @readonly
	 */
	S.size = 0;

	/**
	 * @property {number} index
	 * The current index in the list represented by the slider.
	 * @readonly
	 */
	S.index = undefined;

	/**
	 * @property {number} handleIndex
	 * The current index of the handle within the slider.
	 * This differs from the slider.index when 
	 * @readonly
	 */
	S.handleIndex = undefined;

	/**
	 * @property {jQuery} $slider
	 * The node wrapping the whole slider bar and page indicator.
	 * @readonly
	 */
	S.$slider = $( '<div class="mangaperformer-slider"></div>' );

	/**
	 * @property {jQuery} $bar
	 * The node containing the slider bar.
	 * @readonly
	 */
	S.$bar = $( '<div class="mangaperformer-slider-bar"></div>' );
	S.$bar.appendTo( S.$slider );

	/**
	 * @property {jQuery} $loadedBar
	 * The node containing the slider bar's preloaded meter.
	 * @readonly
	 */
	S.$loadedBar = $( '<div class="mangaperformer-slider-loadedbar"></div>' );
	S.$loadedBar.appendTo( S.$bar );

	/**
	 * @property {jQuery} $handle
	 * The node containing the slider bar's handle.
	 * @readonly
	 */
	S.$handle = $( '<div class="mangaperformer-slider-handle" tabindex="0"></div>' )
		.css( 'transform', 'translate3d(0,0,0)' );
	S.$handle.appendTo( S.$bar );

	// Attach events
	S.$handle
		.on( 'keydown', function( ev ) {
			var special = $.hotkeys.specialKeys[ev.keyCode];
			// Ignore keypresses with modifiers
			if ( ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey ) { return; }

			if ( special === 'space' || special === 'return' ) {

			} else if ( special === 'left' || special === 'right' ) {
				console.log( special );
				ev.stopPropagation();
			}
		} )
		.hammer()
			.on( 'dragstart', function( ev ) {
				// Start the drag
				var data = ev.gesture.startEvent.mangaPerformerData = {};
				data.sizeX = S.$handle.width();

				/**
				 * @event userstart
				 * Fired when the user has started manipulating the slider.
				 */
				S.emit( 'userstart' );
			} )
			.on( 'dragleft dragright dragend', function( ev ) {
				// if ( !P.manga || !P.pane ) { return; }
				if ( !S.size ) { return; }

				// Custom data added in dragstart
				var data = ev.gesture.startEvent.mangaPerformerData;

				// Calculate number of panes to offset from the current one
				var paneOffset = Math.round( ev.gesture.deltaX / data.sizeX );

				// If the slider's directionality is rtl then the offset
				// works in the opposite direction.
				if ( S.rtl ) {
					paneOffset = paneOffset * -1;
				}

				// var newPane = P.pane.list.getConstrained( P.pane.idx + paneOffset );
				var newIndex = Math.max( 0, Math.min( S.size, S.index + paneOffset ) );

				if ( ev.type === 'dragend' ) {
					// End the drag
					S.commit();

					/**
					 * @event userend
					 * Fired when the user has stopped manipulating the slider.
					 * @param {Object} e
					 * @param {number} e.index The item index within the slider.
					 */
					S.emit( 'userend', { index: S.index } );

					// When the handle is focused as a result of pointer/touch interactions blur it when finished.
					ev.target.blur();
				} else {
					// Drag in progress
					S.setIndex( newIndex );
				}

				ev.gesture.preventDefault();
			} );

	// Initial state
	S.setLoaded( 1 );
};

Events.mixin( UI.Slider.prototype );

/**
 * Proxy for jQuery's appendTo on the main element.
 *
 * @param {jQuery|Element} Element to append to.
 */
UI.Slider.prototype.appendTo = function() {
	this.$slider.appendTo.apply( this.$slider, arguments );
};

/**
 * Update the state of the loaded bar.
 *
 * @param {number} loaded A number from 0 (0%) to 1 (100%) indicating how much has been loaded.
 * @chainable
 */
UI.Slider.prototype.setLoaded = function( loaded ) {
	var S = this,
		percent = Math.max( 0, Math.min( 1, loaded ) ) * 100;

	S.$loadedBar.css( 'width', percent + '%' );
	return S;
};

/**
 * Set the direction of the slider bar.
 *
 * @param {"ltr"|"rtl"} dir The directionality of the slider.
 * @chainable
 */
UI.Slider.prototype.setDirection = function( dir ) {
	var S = this;

	S.rtl = ( dir === 'rtl' );
	return S;
};


/**
 * Set the total number of items within the slider.
 *
 * @param {number} size The number of items
 * @chainable
 */
UI.Slider.prototype.setSize = function( size ) {
	var S = this;
	S.size = size;

	var width = ( ( 1 / S.size ) * 100 ) + '%';
	S.$handle.css( 'width', width );
	return S;
};

/**
 * Set the current index of the handle within the slider.
 *
 * @param {number} idx The index.
 * @chainable
 */
UI.Slider.prototype.setIndex = function( idx ) {
	var S = this,
		oldIndex = S.handleIndex;
	S.handleIndex = Math.max( 0, Math.min( S.size, idx ) );

	// @todo Using left/right for the final offsets of this is fine. But when doing animation
	//   we should consider temporarily replacing left/right offset with a left/right of 0 and
	//   a css3 translate where available.
	var start = ( Math.min( 1, ( S.handleIndex || 0 ) / S.size ) * 100 ) + '%';
	S.$handle
		.css( S.rtl ? 'left' : 'right', '' )
		.css( S.rtl ? 'right' : 'left', start );

	if ( S.handleIndex !== oldIndex ) {
		/**
		 * @event handlechanged
		 * Fired when a user interaction has changed the item index the handle visually points to.
		 * @param {Object} e
		 * @param {number} e.index The handle index within the slider.
		 */
		S.emit( 'handlechanged', { index: S.handleIndex } );
	}
	return S;
};


/**
 * Apply any changes on the handle index to the slider's canonical index without generating any events.
 * This is used to update the slider when something outside the slider changes the index of the item
 * that the slider represents.
 *
 * @chainable
 */
UI.Slider.prototype.flush = function() {
	var S = this;
	S.index = S.handleIndex;

	return S;
};

/**
 * Commit any changes on the handle index to the slider's canonical index and emit relevent events.
 * This is used when user interactions on the slider change the index to finish up and update whatever
 * the slider represents when the user interaction is over.
 *
 * @chainable
 */
UI.Slider.prototype.commit = function() {
	var S = this,
		changed = S.handleIndex !== S.index;

	S.flush();

	/**
	 * @event commit
	 * Fired whenever a user interaction triggers a commit.
	 */
	S.emit( 'commit' );

	if ( changed ) {
		/**
		 * @event indexchanged
		 * Fired when a user interaction has changed the index of the item the slider represents.
		 * @param {Object} e
		 * @param {number} e.index The item index within the slider.
		 */
		S.emit( 'indexchanged', { index: S.index } );
	}

	return S;
};
