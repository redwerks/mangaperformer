"use strict";

/**
 * Create a button with an icon.
 * @param {Object} o The options for the button.
 * @param {string} [o.name] The button name.
 * @param {number} [o.size=34] The pixel size of the button.
 * @param {string} [o.label] The label for the button.
 * @param {string} [o.icon] The name of the icon for the button.
 * @return {jQuery}
 */
UI.Button = UI.Component.create( 'button', {
	constructor: function( o ) {
		o = $.extend( {
			size: 34
		}, o );

		this.createRoot( '<button type="button" class="mangaperformer-button"></button>' );
		if ( o.name ) {
			this.$()
				.attr( 'data-ui-button-name', o.name )
				.addClass( 'mangaperformer-button-' + o.name );
		}

		$( '<img />' )
			.attr( 'width', o.size )
			.attr( 'height', o.size )
			.appendTo( this.$() );

		this.name = o.name;
		this.extra = _.omit( o, [ 'name', 'size', 'label', 'icon', 'refreshOn', 'uses' ] );
		this.label = _.isFunction( o.label )
			? o.label
			: function() { return o.label || ""; };
		this.icon = _.isFunction( o.icon )
			? o.icon
			: function() { return o.icon || ""; };
		this.support = _.isFunction( o.support )
			? o.support
			: function() { return true; };

		this.refresh();
	},

	/**
	 * Refresh the icon and label for a button.
	 */
	refresh: function() {
		// We use pick to only pass state keys the button explicitly states
		// that it makes use of to ensure that the uses key – which is used
		// to properly deal out refreshes of buttons when a state key is
		// changed – is properly set when the button is registered.
		var state = this.interface.state.pick( this.uses ),
			label = this.label( state ),
			icon = this.icon( state ),
			support = this.support( state );

		this.$( 'img' ).attr( 'alt', label );
		this.$().attr( 'aria-label', label );

		// All browsers that support SVG images also support data: URIs
		var src = Supports.svg
			? MANGAPERFORMER_ICONS[icon]
			: MangaPerformer.BASE + '/icons/' + icon + ".png";
		this.$( 'img' ).attr( 'src', src );

		// Hide/show based on support test
		this.setVisibility( support );
	},

	/**
	 * "Activate" a button running whatever action the button is in charge of.
	 * This is called whenever a click, tap, or keyboard activation is done on the button.
	 */
	activate: function() {
		this.trigger( 'activate', {
			source: 'button',
			buttonName: this.name
		} );
	},

	/**
	 * Setup the delegated events needed on some root node which is an ancestor of
	 * any UI.Button nodes in order for the UI.Button nodes to function.
	 * @param {jQuery} $node The root node to setup delegated events on.
	 */
	setupEvents: function( $node ) {
		function activate( $button ) {
			var button = $button.data( 'mangaperformer-component' );
			if ( button ) {
				button.activate();
			}
		}

		$node
			// Special fallback for non-mouse non-clicks that trigger click.
			// Such as activating a focused button with a keyboard.
			.on( 'click', '[data-ui-component="button"]', function( e ) {
				var $button = $( this );
				if ( $button.data( 'noclick' ) ) {
					$button.data( 'noclick', false );
					return;
				}

				activate( $button );
			} )
			.hammer()
				// Tap gesture, handles mice, touches, pointers, etc...
				.on( 'tap', function( ev ) {
					var $button = $( ev.target ).closest( '[data-ui-component="button"]', this );
					if ( !$button.length ) { return; }

					// Kill a click happening after the tap
					$button.data( 'noclick', true );

					activate( $button );

					// When the button is focused as a result of pointer/touch interactions blur it when finished.
					$button[0].blur();
				} );
	}
} );
