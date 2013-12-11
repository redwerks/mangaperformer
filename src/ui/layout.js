"use strict";

/**
 * Abstract class base for classes in charge of taking an interface and laying out the buttons,
 * sliders, viewports, and other UI components.
 * @abstract
 * @private
 */
UI.Layout = function() {
	this.interface = undefined;
};

/**
 * Setup various delegated DOM events on a node to handle UI components nested inside of that element.
 * @param {jQuery} $node The node to setup the events on.
 */
UI.Layout.prototype.setupEvents = function( $node ) {
	var L = this,
		I = this.interface;

	// Setup events needed to support tooltips under this node.
	UI.buttonTooltipSetup( $node );

	// Setup events needed to support the various UI components under this node
	UI.Component.setupAllEvents( $node );

	$node
		.on( 'mangaperformer-activate', function( e ) {
			var name = e.component.name;
			if ( I.on && I.on.activate && I.on.activate[name] ) {
				I.on.activate[name].call( I );
			}
		} )
		.on( 'mangaperformer-changestate', function( e ) {
			var name = e.state.name;
			if ( I.on && I.on.state && I.on.state[name] ) {
				I.on.state[name].call( I, e.state.value );
			}
		} )
		.on( 'mangaperformer-navigate', function( e ) {
			var name = e.navName;
			if ( I.on && I.on.nav && I.on.nav[name] ) {
				I.on.nav[name].call( I, e.direction );
			}
		} );
};

/**
 * Build the interface DOM and attach it to a DOM node.
 * @param {jQuery} $root The root DOM node (as a jQuery object) to apply the interface to.
 * @abstract
 */
UI.Layout.prototype.applyTo = function( $root ) {};

/**
 * Abstract base class for classes that define a layout for the reader interface implemented by UI.ReaderInterface.
 * @extends UI.Layout
 * @abstract
 * @private
 */
UI.ReaderLayout = function() {
	UI.Layout.apply( this, arguments );
};

UI.ReaderLayout.prototype = create( UI.Layout.prototype );

/**
 * Layout for the reader interface that presents the interface in a floating UI box.
 * @extends UI.ReaderLayout
 * @private
 */
UI.FloatingReaderLayout = function() {
	UI.ReaderLayout.apply( this, arguments );
	var L = this;
};

UI.FloatingReaderLayout.prototype = create( UI.ReaderLayout.prototype );

/**
 * @
 */
UI.FloatingReaderLayout.prototype.applyTo = function( $root ) {
	var L = this,
		I = L.interface,
		R = {};

	I.getDOM( 'viewport' ).appendTo( $root );

	/**
	 * The UI node containing the buttons, slider, and other interface elements.
	 */
	R.$ui = $( '<div class="mangaperformer-ui"></div>' );

	/**
	 * The node containing the hierarchy of button elements.
	 */
	R.$buttons = $( '<div class="mangaperformer-buttons"></div>' );

	(function() {
		function region( name, cb ) {
			var $region = $( '<div class="mangaperformer-buttonregion"></div>' )
				.addClass( 'mangaperformer-buttonregion-' + name );

			cb( $region );

			$region.appendTo( R.$buttons );
		}

		region( 'left', function( $region ) {
			_.each( [ 'pagespread', 'view-mode' ], function( name ) {
				I.getDOM( name )
					.addClass( 'mangaperformer-buttongroup' )
					.appendTo( $region );
			} );
		} );

		region( 'nav', function( $region ) {
			I.getDOM( 'nav' )
				.addClass( 'mangaperformer-buttongroup' )
				.appendTo( $region )
				// Update sizes
				.find( '[data-ui-component="button"] img' )
					.attr( 'width', 40 )
					.attr( 'height', 40 );
		} );

		region( 'right', function( $region ) {
			_.each( [ 'overview', 'fullscreen' ], function( name ) {
				I.buttonGroup( false )
					.add( I.get( name ) )
					.component
						.getDOM().appendTo( $region );
			} );
		} );
	})();
	this.setupEvents( R.$ui );
	R.$buttons.appendTo( R.$ui );

	I.getDOM( 'slider' ).appendTo( R.$ui );

	I.getDOM( 'title' ).appendTo( R.$ui );

	R.$ui.appendTo( $root );
};

/**
 * Layout for the reader interface that presents the interface sandwich shape with the UI elements in
 * both a header and footer above and below the viewport.
 * @extends UI.ReaderLayout
 * @private
 */
UI.SandwichReaderLayout = function() {
	UI.ReaderLayout.apply( this, arguments );
};

UI.SandwichReaderLayout.prototype = create( UI.ReaderLayout.prototype );
