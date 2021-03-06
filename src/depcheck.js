"use strict";

(function() {
	var ok = true,
		has = {
			_: true,
			$: true
		};

	function err( msg ) {
		if ( window.console && console.error ) {
			console.error( msg );
		}
		ok = false;
	}

	if ( typeof _ !== 'function'
		|| typeof _.each !== 'function' ) {
		err( "One of either Underscore.js or Lo-Dash is not loaded." );
		has._ = false;
	}

	if ( typeof $ !== 'function'
		|| typeof $.fn !== 'object'
		|| typeof $.fn.jquery !== 'string' ) {
		err( "jQuery is not loaded." );
		has.$ = false;
	} else {
		// We don't use parseHTML. However we do use jQuery's automatic handling of vendor
		// prefixes. Both of these were introduced in 1.8. We can't feature test vendor prefix
		// handling so we'll have to feature test parseHTML instead.
		if ( !$.Deferred || !$.fn.on || !$.parseHTML ) {
			err( "jQuery is too old, need at least 1.8." );
			has.$ = false;
		}
	}

	if ( typeof $.hotkeys !== 'object' ) {
		err( "jQuery Hotkeys Plugin is not loaded." );
	}

	if ( typeof window.Hammer !== 'function' ) {
		err( "Hammer.js is not loaded." );
	}

	if ( has.$ && typeof $.fn.hammer !== 'function' ) {
		err( "jquery.hammer.js is not loaded." );
	}

	if ( !ok ) {
		throw new Error( "One of MangaPerformer's dependencies was not present." );
	}
})();
