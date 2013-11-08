
var create = Object.create || function ( prototype ) {
		function Type() {}
		Type.prototype = prototype;
		return new Type;
	},
	freeze = Object.freeze || function() {},
	ArrayPush = [].push;

function warn( msg ) {
	if ( window.console && console.warn ) {
		console.warn( msg );
	}
}

function now() {
	return +new Date;
}
