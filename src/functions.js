
var create = Object.create || function ( prototype ) {
		function Type() {}
		Type.prototype = prototype;
		return new Type;
	},
	freeze = Object.freeze || function() {},
	ArrayPush = [].push,
	supportsSVG = document.implementation.hasFeature( "http://www.w3.org/TR/SVG11/feature#Image", "1.1" );

function warn( msg ) {
	if ( window.console && console.warn ) {
		console.warn( msg );
	}
}

function now() {
	return +new Date;
}
