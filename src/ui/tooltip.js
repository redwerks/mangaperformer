"use strict";

UI.buttonTooltipSetup = function( $root ) {
	var tip = {
		delay: 500,
		retain: 800,
		hold: 50,

		$tip: $( '<div class="mangaperformer-tooltip"></div>' ).appendTo( Performer.$root ),
		timer: undefined,
		open: false,
		state: undefined,

		show: function( button, o ) {
			o = $.extend( {
				// Wait a period of time before displaying tip
				delay: false,
				// Allow mouse out to close the tip
				mouse: true
			}, o );

			if ( tip.open === true || tip.open >= now() - tip.retain ) {
				o.delay = false;
			}

			if ( o.delay > 0 ) {
				clearTimeout( tip.timer );
				tip.timer = _.delay( tip.show, o.delay, button, $.extend( {}, o, { delay: false } ) );
				return;
			} else {
				tip.timer = undefined;
			}

			tip.$tip.text( button.getAttribute( 'aria-label' ) );

			var offset = $( button ).offset();
			offset.top -= $( button ).height();
			offset.top -= 5;
			offset.left -= tip.$tip.width() / 2;
			tip.$tip.css( offset );

			tip.$tip.css( 'opacity', 1 );
			tip.open = true;
			tip.state = o;
		},
		hide: function( o ) {
			o = $.extend( {
				source: 'manual'
			}, o );

			// Ignore mouse triggered hides if the open options specified that mouse was not permitted
			if ( o.source === 'mouse' && tip.state && !tip.state.mouse ) {
				return;
			}

			clearTimeout( tip.timer );
			tip.open = now();
			tip.state = undefined;

			tip.$tip.css( 'opacity', 0 );
		}
	};

	$root
		.on( 'mouseover mouseout', function( e ) {
			var button = $( e.target ).closest( '.mangaperformer-button', this )[0],
				relatedButton = $( e.relatedTarget ).closest( '.mangaperformer-button', this )[0];
			
			// Ignore mouse moves between elements within the same button
			if ( button == relatedButton ) {
				return;
			}

			if ( e.type === 'mouseover' ) {
				if ( button ) {
					tip.show( button, { delay: tip.delay } );
				}
			} else {
				tip.hide( { source: 'mouse' } );
			}
		} )
		.on( 'touchend', function( e ) {
			// Cancel the touchend to stop touch devices from triggering a fake mouseover after
			// a tap which would undesirably trigger a mouse based tooltip to open.
			e.preventDefault();
		} )
		/* jshint -W106 */
		.hammer( { hold_timeout: tip.hold } )
		/* jshint +W106 */
			.on( 'tap', '.mangaperformer-button', function( e ) {
				// Defer so we don't get an early value of tip.open
				_.defer( function() {
					// Reset the retain feature on successful tap (ie: successful button press) if
					// the tip is closed after tap.
					// If the tip is no longer open then there is no mouse hovering over the
					// button keeping the tip open so it was likely a real tap.
					// We do this to avoid having the retain feature keep flashing the tip open
					// if the user repeatedly taps the next/prev buttons shortly after having
					// done a hold that opens the tooltip once.
					if ( tip.open !== true ) {
						tip.open = false;
					}
				} );
			} )
			.on( 'hold', '.mangaperformer-button', function( e ) {
				if ( e.gesture.pointerType === "mouse" ) { return; }

				tip.show( this, { delay: tip.delay, mouse: false } );
			} )
			.on( 'release', '.mangaperformer-button', function( e ) {
				if ( e.gesture.pointerType === "mouse" ) { return; }

				tip.hide( { source: e.gesture.pointerType });
			} );
};
