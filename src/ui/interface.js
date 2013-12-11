"use strict";

/**
 * A state object used by the interface.
 * @param {UI.Interface} interfaceObj The interface instance this belongs to.
 * @param {Object} [state] Initial state data.
 */
function StateObject( interfaceObj, state ) {
	this.interface = interfaceObj;
	this.state = state;
}

/**
 * Return the value associated with a key in the state.
 * @param {string} key The state key.
 * @return {Mixed} The data.
 */
StateObject.prototype.get = function( key ) {
	return this.state[key];
};

/**
 * Update the value associated with a key in the state.
 * This method must be used instead of directly modifying
 * the state as this method is responsible for refreshing
 * the UI components that watch for changes in the state.
 * @param {string} key The state key.
 * @param {Mixed} value The data.
 */
StateObject.prototype.set = function( key, value ) {
	this.state[key] = value;

	// Refresh any button that uses this key
	this.interface.refreshWhere( function( button ) {
		return _.contains( button.uses, key );
	} );
};

/**
 * Return an object copy of the state, filtered to only have values for the whitelisted keys.
 * @param {string[]} keys The state keys that should be returned.
 */
StateObject.prototype.pick = function( keys ) {
	return _.pick( this.state, keys );
};

/**
 * ...
 * @param {Object} o The options
 * @param {UI.Layout} o.layout The layout interface in charge of laying out the interface.
 * @param {Object} [o.state={}] Initial data for the state tracking object used by the interface.
 * @param {Object} [o.on] A structure of objects defining high-level handlers for events/actions
 *                        taken by components within the interface.
 * @param {Object} [o.on.activate] Activate event handlers mapping name to handler.
 * @param {Object} [o.on.state] State change event handlers mapping name to handler.
 * @param {Object} [o.on.nav] Navigation event handlers mapping name to handler.
 * @private
 */
UI.Interface = function( o ) {
	this.layout = o.layout;
	this.components = {};
	this.state = new StateObject( this, o.state || {} );
	this.on = o.on || {};
};

/**
 * Return a registered interface component.
 * @param {string} name The name of the component to return.
 */
UI.Interface.prototype.get = function( name ) {
	if ( !_.has( this.components, name ) ) {
		throw new Error( "There is no component by the name " + name );
	}
	return this.components[name];
};

/**
 * Return the DOM node for a registered interface component.
 * This is basically a shortcut for `.get( name ).getDOM();`
 * @param {string} name The name of the component.
 * @return {jQuery} The DOM node wrapped in jQuery.
 */
UI.Interface.prototype.getDOM = function( name ) {
	return this.get( name ).getDOM();
};

/**
 * Register a component with the interface.
 * @param {string} name The name of the component.
 * @param {Object} obj The component instance.
 */
UI.Interface.prototype.registerComponent = function( name, obj ) {
	if ( _.has( this.components, name ) ) {
		throw new Error( "There is already a component named " + name );
	}
	if ( !(obj instanceof UI.Component ) && !( obj instanceof Viewport ) ) { // @fixme Adding Viewport here is a temporary hack.
		throw new TypeError( "Tried to register something other than an UI.Component instance as the component named " + name );
	}

	this.components[name] = obj;
};

/**
 * Create and then register a component with the interface.
 * @param {string|false} name The name of the component. This may be false if a layout is
 *                            creating a component that is not supposed to be registered.
 * @param {function} Component A constructor for the UI.Component type to create.
 * @param {Object} o The options to use while constructing the component.
 * @return {Object} The component's agent.
 */
UI.Interface.prototype.createComponent = function( name, Component, o ) {
	o = $.extend( { name: name }, o || {} );
	var component = new Component( this, o );
	if ( name ) {
		this.registerComponent( name, component );
	}
	return component.agent;
};

UI.Interface.prototype.buttonGroup = function( name, o ) {
	return this.createComponent( name, UI.ButtonGroup, o );
};

UI.Interface.prototype.stateSet = function( name, o ) {
	return this.createComponent( name, UI.StateSet, o );
};

UI.Interface.prototype.navButtons = function( name, o ) {
	return this.createComponent( name, UI.NavButtons, o );
};

UI.Interface.prototype.button = function( name, o ) {
	return this.createComponent( name, UI.Button, o ).component;
};

/**
 * Low level method for refreshing components within the interface.
 * Accepts a callback which will be called with each component
 * and expects a boolean indicating whether the component should
 * be refreshed or not.
 * @param {Function} filter The callback filter function.
 * @param {UI.component} filter.component The component to filter.
 */
UI.Interface.prototype.refreshWhere = function( filter ) {
	var I = this;
	_.each( I.components, function( component ) {
		if ( !( component instanceof UI.Component ) ) { return; }
		if ( filter.call( I, component ) ) {
			component.refresh();
		}
	} );
};

/**
 * Refresh every component within the interface. Used when a large
 * scale change is made. Such as the i18n language changing.
 */
UI.Interface.prototype.refreshAll = function() {
	this.refreshWhere( function() { return true; } );
};

/**
 * Refresh components that are setup to listen for a specific
 * refresh event name.
 * @param {string} eventName The event name.
 */
UI.Interface.prototype.refreshFor = function( eventName ) {
	this.refreshWhere( function( component ) {
		return _.contains( component.refreshOn, eventName );
	} );
};

/**
 * Build the interface DOM and attach it to a DOM node.
 * @param {jQuery} $root The root DOM node (as a jQuery object) to apply the interface to.
 */
UI.Interface.prototype.applyTo = function( $root ) {
	this.layout.interface = this;
	this.layout.applyTo( $root );
};
