
/**
 * Class handling performer viewports. These viewports handle displaying of the images in
 * a manga/comic, zooming, image pans, and transitions moving pages in and out of the viewport.
 * @abstract
 * @private
 * @uses Pane
 */
function Viewport() {
	this.init();
}

/**
 * Return a new instance of a Viewport subclass. This method picks the best implementation
 * available based on what the browser supports.
 *
 * @return {Viewport}
 * @static
 */
Viewport.getBestViewport = function() {
	if ( Supports.transform ) {
		return new ViewportTransform;
	}

	return new ViewportCSS21;
};

/**
 * Setup the viewport.
 */
Viewport.prototype.init = function() {
	var V = this;

	/**
	 * @property {jQuery} $viewport
	 * The node containing the viewport.
	 */
	V.$viewport = $( '<div class="mangaperformer-viewport"></div>' );
};

/**
 * Add a new pane to the viewport. Sets the new pane as the current pane.
 *
 * @param {HTMLImageElement[]} images The image(s) to display in the viewport.
 * @param {Object} pos The starting position for the viewport.
 * @return {Pane} The pane instance that was created.
 */
Viewport.prototype.addPane = function( images, pos ) {
	var V = this;
	var pane = new Pane( V, images );
	pane.setPosition( pos );
	V.pane = pane;
	return pane;
};

/**
 * Refresh the viewport positioning css for a viewport pane.
 *
 * @param {Pane} pane The pane instance to refresh css for.
 * @abstract
 */
Viewport.prototype.refreshPosition = function( pane ) {
	throw new Error( "This method must be overridden." );
};

/**
 * Viewport implementation using only CSS 2.1 properties, for browsers that don't implement
 * CSS3's 2D or 3D transformations.
 *
 * @extends Viewport
 * @private
 */
function ViewportCSS21() {
	Viewport.apply( this, arguments );
}
ViewportCSS21.prototype = create( Viewport.prototype );

/**
 * Viewport implementation using CSS3 transforms.
 *
 * Using transform for viewport handling eliminates pixel snapping in animations (which degrades)
 * the animation and eliminates the need for the browser to do repaints of the element improving
 * the viewport's performance.
 *
 * A 3D transform is added to the transform where supported to force some browsers to enable
 * hardware acceleration making transitions much more efficient.
 *
 * @extends Viewport
 * @private
 */
function ViewportTransform() {
	Viewport.apply( this, arguments );

	/**
	 * @property {boolean}
	 * Indicates whether the Transform Viewport should add a 3D transformation to the end of
	 * the transform stack to trigger hardware acceleration.
	 * Automatically set to the value of Supports.transform3D.
	 */
	this.use3D = Supports.transform3D;
}
ViewportTransform.prototype = create( Viewport.prototype );

/**
 * @inheritdoc
 */
ViewportTransform.prototype.refreshPosition = function( pane ) {
	var Vw = this.$viewport.width(),
		Vh = this.$viewport.height(),
		Pw = pane.width,
		Ph = pane.height;

	// Determine the scale
	var scales = [];
	if ( _.isNumber( pane.position.horizontal ) ) {
		scales.push( ( Vw / Pw ) * pane.position.horizontal );
	}
	if ( _.isNumber( pane.position.vertical ) ) {
		scales.push( ( Vh / Ph ) * pane.position.vertical );
	}

	var scale = _.min( scales );

	// Virtual Pane dimensions for the pane at the new scale
	var vPw = Pw * scale,
		vPh = Ph * scale;

	// Build the transformation
	var transform = [];

	// Translate the pane to the center of the viewport
	var translateX = Vw / 2 - vPw / 2;
	transform.push( 'translate(' + translateX.toFixed(20) + 'px, ' + 0 + 'px)' );

	// Scale the pane to fit
	transform.push( 'scale(' + scale.toFixed(20) + ')' );

	// Finish string
	transform = transform.join( ' ' );

	if ( this.use3D ) {
		// Force hardware acceleration where supported
		transform += " translate3d(0,0,0)";
	}

	// Set the CSS
	pane.$pane
		.css( 'position', 'absolute' )
		.css( 'transform', transform )
		.css( 'transform-origin', '0 0' );
};

// @fixme 3D should transform set something like -webkit-backface-visibility: hidden; -webkit-perspective: 1000;
//   to deal with any potential flickering?
// or this? http://stackoverflow.com/a/7912696

/**
 * A viewport pane that can contain the image of a single page or the pair of images of a page
 * pair and display it on the performer's viewport.
 * @private
 */
function Pane( viewport, images ) {
	var V = this.viewport = viewport;
	var $pane = this.$pane = $( '<div class="mangaperformer-pane"></div>' );
	$( images ).appendTo( $pane );
	$pane.appendTo( V.$viewport );

	this.ready( function() {
		// Refresh the position when the images have loaded enough data to declare their size
		this.refreshPosition();
	} );
}

Pane.prototype.destroy = function() {
	this.$pane.find( 'img' )
		.appendTo( Preloader.getNode() );
	this.$pane.remove();
};

Pane.prototype.remove = function() {
	// @todo Animation etc...
	this.destroy();
};

/**
 * Change the position of the pane.
 *
 * @param {Object} pos The new position of the pane.
 * @param {number} [pos.horizontal]
 * @param {number} [pos.vertical]
 */
Pane.prototype.setPosition = function( pos ) {
	this.position = pos;
	this.refreshPosition();
};

/**
 * Refresh the position of the pane. Updating the width, height,
 * and positional css.
 */ 
Pane.prototype.refreshPosition = function() {
	// Just hide the pane if no real position has been set
	if ( !this.position ) {
		this.$pane.css( 'display', 'none' );
		return;
	}

	var width = 0,
		height = 0;

	this.$pane.find( 'img' ).each( function() {
		width += this.naturalWidth;
		height = Math.max( height, this.naturalHeight );
	} );
	this.width = width;
	this.height = height;

	this.$pane.css({
		width: width,
		height: height,
		display: ''
	});
	this.viewport.refreshPosition( this );
};

/**
 * Return a jQuery.Deferred promise that'll be resolved/rejected
 * when the images inside the pane have downloaded enough data that
 * the browser knows their native size. Pane#ready is simpler to use
 * when actually calling.
 *
 * @return {jQuery.Deferred}
 */
Pane.prototype.readyPromise = function() {
	var pane = this;
	if ( !this._readyPromise ) {
		var p = $.Deferred();
		Preloader.readyPromise( this.$pane.find( 'img' ) )
			.done( function() {
				p.resolveWith( pane );
			})
			.fail( function() {
				p.rejectWith( pane );
			});
		this._readyPromise = p.promise();
	}
	return this._readyPromise;
};

/**
 * Run a callback when the images inside the pane have downloaded
 * enough data that the browser knows their native size.
 *
 * @param {Function} callback The function to call.
 * @param {Pane} callback.pane This pane instance.
 */
Pane.prototype.ready = function( callback ) {
	this.readyPromise().always( $.proxy( callback, this ) );
};
