"use strict";

/**
 * Class implementing an event emitter that can be applied
 * to any custom object.
 *
 * @class MangaPerformer.Events
 * @alternateClassName Events
 */
export function Events() {
}

/**
 * Binds an event handler to the object for a set of events.
 *
 * @param {string} eventNames Space separated list of event names to bind to.
 * @param {Function} handler The function to bind to the event.
 * @param {boolean} [once=false] Only fire the handler once if true. It's
 *   preferred to use Events#once instead of this param.
 * @chainable
 */
Events.prototype.on = function( eventNames, handler, once ) {
	var self = this;
	_.each( $.trim( eventNames ).split( /\s+/ ), function( eventName ) {
		eventName = '_event_' + eventName;
		self[eventName] = self[eventName] || [];
		self[eventName].push( {
			h: handler,
			once: !!once
		} );
	} );
	return self;
};

/**
 * Binds an event handler to the object for a set of events
 * such that it'll only be executed once.
 *
 * @param {string} eventNames Space separated list of event names to bind to.
 * @param {Function} handler The function to bind to the event.
 * @chainable
 */
Events.prototype.once = function( eventNames, handler ) {
	return this.on( eventNames, handler, true );
};

/**
 * Unbind event handlers for a bunch of events.
 * If handlers is not passed this will remove all handlers for those events.
 *
 * @param {string} eventNames Space separated list of event names.
 * @param {Function|Function[]} handlers The registered handlers to unbind.
 * @chainable
 */
Events.prototype.off = function( eventNames, handlers ) {
	var self = this;
	if ( _.isFunction( handlers ) ) {
		handlers = [handlers];
	}
	_.each( $.trim( eventNames ).split( /\s+/ ), function( evName ) {
		var eventName = '_event_' + evName;
		if ( !_.has( self, eventName ) ) {
			return;
		}

		if ( handlers ) {
			self[eventName] = _.reject( self[eventName], function( ev ) {
				return _.indexOf( handlers, ev.h ) !== -1;
			} );
		} else {
			self[eventName] = [];
		}
	} );
	return self;
};

/**
 * Emit an event calling all event handlers registered for these events on the object.
 *
 * @param {string} eventNames Space separated list of event names to emit.
 * @param {Object|undefined} context The context `this` to call the event handlers with.
 * @param {Array} args The args to call the event handlers with.
 * @chainable
 */
Events.prototype.emitWith = function( eventNames, context, args ) {
	var self = this;
	_.each( $.trim( eventNames ).split( /\s+/ ), function( evName ) {
		var eventName = '_event_' + evName;
		if ( !_.has( self, eventName ) ) {
			return;
		}

		var once = [];
		_.each( self[eventName], function( ev ) {
			ev.h.apply( context, args );
			if ( ev.once ) {
				once.push( ev.h );
			}
		} );

		if ( once.length ) {
			self.off( evName, once );
		}
	} );
	return self;
};

/**
 * Emit an event with an undefined/global `this` context. See Events#emitWith
 * and a single event object argument. The object passed as the first argument
 * will be augmented with a type property identifying the fired event.
 *
 * @param {string} eventNames Space separated list of event names to emit.
 * @param {Object} event The initial "event" argument to call the event handlers with.
 * @param {Mixed...} args The additional args to call the event handlers with.
 * @chainable
 */
// Events.prototype.emit = function( eventNames, event ) {
// 	event = event || {};}
// 	var args = [ eventNames, undefined, _.rest( arguments ) ];
// 	return this.emitWith.apply( this, args );
// };

/**
 * Emit an event. See Events#emitWith.
 * The object this is called on is used as the context.
 *
 * @param {string} eventNames Space separated list of event names to emit.
 * @param {Mixed...} args The args to call the event handlers with.
 * @chainable
 */
Events.prototype.emit = function( eventNames ) {
	var args = [ eventNames, this, _.rest( arguments ) ];
	return this.emitWith.apply( this, args );
};

/**
 * Mix the event emitter into an object. This adds on, once, off, emitWith, and
 * emit methods onto the object. These methods proxy a Events instance on a
 * private property. So a property name not in use by the object must be used.
 * However as a result this means it's possible to mixin to the prototype of
 * a class.
 *
 * @param {Object} The object to mixin to.
 * @param {string} [privateName="_events"] The private name to use on the object.
 * @static
 */
Events.mixin = function( obj, privateName ) {
	privateName = privateName || '_events';
	_.each( [ 'on', 'once', 'off', 'emitWith', 'emit' ], function( method ) {
		obj[method] = function() {
			var self = this;
			self[privateName] = self[privateName] || new Events;
			self[privateName][method].apply( self, arguments );
			return self;
		};
	} );
};
