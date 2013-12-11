"use strict";

/**
 * Base constructor for all UI components.
 * @param {UI.Interface} interfaceObj The interface the component belongs to.
 * @param {Object} o Options for the component.
 * @param {string} o.name The component's name.
 * @param {string[]} [o.refreshOn=[]] An array of refreshFor event names
 *                                 the component should refresh on.
 * @param {string[]} [o.uses] An array of keys within the interface's state
 *                            which this component makes use of.
 */
UI.Component = function( interfaceObj, o ) {
	/**
	 * @property {UI.Interface} interface
	 * The interface this component instance belongs to.
	 * @readonly
	 */
	this.interface = interfaceObj;

	/**
	 * @property {string} name
	 * The name of the component.
	 * @readonly
	 */
	this.name = o.name;

	/**
	 * @property {string[]} refreshOn
	 * The refreshFor event names this component should refresh on.
	 * @readonly
	 */
	this.refreshOn = (o.refresh || "").split( /\s+/ );

	/**
	 * @property {string[]} uses
	 * The interface state keys this component makes use of.
	 * The interface will make sure this component is refreshed
	 * whenever one of the state keys it uses is modified.
	 * @readonly
	 */
	this.uses = o.uses || [];

	/**
	 * @property {Object} agent
	 * The agent for the component.
	 * 
	 * An agent is a plain object that inherits from the object set as the
	 * agent property on this component and as a single property set on it
	 * named component with this component instance as it's value.
	 * The agent is usually returned when a component is first created as
	 * a method of setting up anything which cannot be setup as arguments.
	 * @readonly
	 */
	this.agent = create( this.constructor.agent || {} );
	this.agent.component = this;

	/**
	 * @property {boolean} visible
	 * The visibility of the component.
	 * @readonly
	 */
	this.visible = true;
};

UI.Component.implementations = {};

/**
 * Helper function that implements a new UI.Component subclass.
 * @param {string} name The name of the component.
 * @param {Function|Object} implementation A function to run as the constructor or an object containing the constructor
 *        function as a property named 'constructor' and other properties with methods to implement on
 *        the prototype of the new component.
 * @return {Function} A constructor function with a prototype that inherits from UI.Component's prototype.
 */
UI.Component.create = function( name, implementation ) {
	var constructor;
	if ( !_.isString( name ) ) {
		throw new TypeError( "name must be a string" );
	}
	if ( _.isFunction( implementation ) ) {
		constructor = implementation;
		implementation = {};
	} else if ( _.isObject( implementation ) ) {
		constructor = implementation.constructor;
		delete implementation.constructor;
		if ( !_.isFunction( constructor ) ) {
			throw new TypeError( "There is no constructor for the " + name + " component." );
		}
	} else {
		throw new TypeError( "implementation for " + name + " must be a function or object containing .constructor" );
	}

	var Component = function( interfaceObj, o ) {
		UI.Component.call( this, interfaceObj, o );
		constructor.call( this, o );
	};
	Component.prototype = create( UI.Component.prototype );
	Component.prototype.constructor = Component;

	var staticProperties = [ 'setupEvents', 'agent' ];
	_.each( implementation, function( value, name ) {
		if ( _.contains( staticProperties, name ) ) {
			// Add static methods and properties from implementation to the constructor.
			Component[name] = value;
		} else {
			// Add instance methods from implementation to the prototype.
			Component.prototype[name] = value;
		}
	} );

	UI.Component.implementations[name] = Component;
	Component.prototype.componentName = name;
	return Component;
};

/**
 * Call the setupEvents method for all component types to setup the delegated events that each UI.Component
 * type needs on an ancestor in order for the component type node to function.
 * @param {jQuery} $node The root node to setup delegated events on.
 */
UI.Component.setupAllEvents = function( $node ) {
	_.each( UI.Component.implementations, function( Component, name ) {
		if ( _.isFunction( Component.setupEvents ) ) {
			Component.setupEvents( $node );
		}
	} );
};

/**
 * Create the DOM node for the component root.
 * @param {string} html The html for the node.
 */
UI.Component.prototype.createRoot = function( html ) {
	if ( this.$component ) {
		throw new Error( "component root already exists" );
	}

	this.$component = $( $.parseHTML( html ) )
		.attr( 'data-ui-component', this.componentName )
		.data( 'mangaperformer-component', this );

	return this.$component;
};

/**
 * Return a jQuery instance for a DOM node that is part of the component.
 * With a selector it will use find to return a descendant of the component's root node.
 * Without a selector it will return the component's root node itself.
 *
 * If the component's root node does not exist yet it will implicitly be created as a div.
 * This makes the function useful for the initialization of the component node.
 *
 * @param {string} [selector] A selector targeting a descendant of the component's root node.
 */
UI.Component.prototype.$ = function( selector ) {
	if ( !this.$component ) {
		this.createRoot( '<div></div>' );
	}

	return selector
		? this.$component.find( selector )
		: this.$component;
};

/**
 * Method to return the component's DOM.
 * @return {jQuery} The DOM node as a jQuery object.
 */
UI.Component.prototype.getDOM = function() {
	return this.$component;
};

/**
 * Trigger a special component event. This event will first bubble internally through
 * UI.Component instances by walking up the DOM and calling any relevant intercept
 * handler on a parent component. Following that it will trigger a native DOM event
 * where the type is prefixed with "mangaperformer-". At any point a handler may stop
 * the propagation of the event.
 *
 * @param {string} type The name of the event's type. Should be short such as 'activate',
 *                      *not* prefixed with "mangaperformer-".
 * @param {Object} [eventData] Provide and extra set of data that should be passed along
 *                             inside the event object.
 */
UI.Component.prototype.trigger = function( type, eventData ) {
	eventData = $.extend( { component: this }, eventData || {} );
	var event = $.Event( 'mangaperformer-' + type, eventData ),
		node = this.$().parent().closest( '[data-ui-component]' ),
		component;

	while ( node && node.length ) {
		if ( event.isPropagationStopped() ) {
			// Break out of the intercepts if propagation was halted.
			break;
		}

		component = node.data( 'mangaperformer-component' );
		if ( component && component.intercept && component.intercept[type] ) {
			component.intercept[type].call( component, event );
		}

		node = node.parent().closest( '[data-ui-component]' );
	}

	// Trigger the DOM event. jQuery will already take care of checking if stopPropagation was called.
	this.$().trigger( event );

	// Return the event just in case the caller wishes to implement some sort of 'native' behavior.
	return event;
};

/**
 * Show a hidden component.
 */
UI.Component.prototype.show = function() {
	if ( this.visible ) { return; }
	this.visible = true;
	// This may be triggered before the button is actually inserted into the DOM
	// so defer it.
	_.defer( _.bind( function() {
		this.$()
			.attr( 'aria-hidden', 'false' )
			.css( 'visibility', '' )
			.css( 'display', '' );

		this.trigger( 'show' );
	}, this ) );
};

/**
 * Hide a visible component.
 */
UI.Component.prototype.hide = function() {
	if ( !this.visible ) { return; }
	this.visible = false;
	// This may be triggered before the button is actually inserted into the DOM
	// so defer it.
	_.defer( _.bind( function() {
		this.$()
			.attr( 'aria-hidden', 'true' )
			.css( 'visibility', 'collapse' )
			.css( 'display', 'none' );

		this.trigger( 'hide' );
	}, this ) );
};

/**
 * Set the visibility of a component, showing or hiding it.
 * @param {boolean} visibility Should the component be visible?
 */
UI.Component.prototype.setVisibility = function( visibility ) {
	this[visibility ? 'show' : 'hide']();
};

/**
 * Refresh the component, if supported.
 */
UI.Component.prototype.refresh = function() {};

/**
 * An interface component that simply groups a series of buttons together.
 * This component is primarily visual/layout in structure so interfaces should
 * not use it directly. It's intended to be used by the layout when constructing
 * the layout.
 * @private
 */
UI.ButtonGroup = UI.Component.create( 'buttongroup', {
	constructor: function() {
		this.buttons = [];

		this.$()
			.addClass( 'mangaperformer-buttongroup' );
	},

	/**
	 * Add a new button to the button group.
	 * @param {UI.Button} button The button to add.
	 * @private
	 */
	_add: function( button ) {
		this.buttons.push( button );
		this.$().append( button.getDOM() );
	},

	intercept: {
		hide: function( e ) {
			// Capture the button's hide event, parent elements only need to hear a hide event
			// if this entire element is hidden.
			e.stopPropagation();

			// Calculate visibility based on whether any of the buttons are visible
			var visible = _( this.buttons ).chain().pick( 'visible' ).any().value();
			this.setVisibility( visible );
		},

		show: function( e ) {
			// Capture the button's show event, parent elements only need to hear a show event
			// if this component emits it (ie: if calling show here does in fact unhide the component).
			e.stopPropagation();

			// If any of the buttons inside this component have been unhidden make sure this component
			// is not hidden.
			this.show();
		}
	},

	/**
	 * @property {Object} agent
	 * The base object for the component's agent.
	 * @return {Object}
	 */
	agent: {
		/**
		 * Create a button in the button group.
		 * @param {string} name The button's names.
		 * @param {Object} o Options for the button.
		 * @chainable
		 */
		create: function( name, o ) {
			var button = this.component.interface.button( name, o );
			return this.add( button );
		},

		/**
		 * Add a button to the button group.
		 * @param {UI.Button} button The button.
		 * @chainable
		 */
		add: function( button ) {
			this.component._add( button );
			return this;
		}
	}
} );

/**
 * An interface component that groups a series of buttons intended to represent
 * multiple possible values of one state.
 * @param {Object} o Options
 * @param {string} [o.state=name] The name of the state the buttons switch through.
 * @private
 */
UI.StateSet = UI.Component.create( 'stateset', {
	constructor: function( o ) {
		this.stateButtons = [];
		this.states = {};
		this.stateName = o.state || this.name;

		// Make the DOM
		this.$()
			.attr( 'data-state', this.stateName );
	},

	/**
	 * Add a new button to the state set.
	 * @param {UI.Button} button The button to add.
	 * @private
	 */
	_add: function( button ) {
		this.stateButtons.push( button );
		// this.states[...] = button; @todo Store a state value -> button map
		this.$().append( button.getDOM() );
	},

	intercept: {
		activate: function( e ) {
			if ( !( e.source === 'button' && e.component instanceof UI.Button ) ) { return; }

			// e.button.
			this.trigger( 'changestate', {
				state: {
					name: this.stateName,
					value: e.component.extra.state
				}
			} );

			e.stopPropagation();
		},

		hide: function( e ) {
			// Capture the button's hide event, parent elements only need to hear a hide event
			// if this entire element is hidden.
			e.stopPropagation();

			// Calculate visibility based on whether any of the buttons are visible
			var visible = _( this.stateButtons ).chain().pick( 'visible' ).any().value();
			this.setVisibility( visible );
		},

		show: function( e ) {
			// Capture the button's show event, parent elements only need to hear a show event
			// if this component emits it (ie: if calling show here does in fact unhide the component).
			e.stopPropagation();

			// If any of the buttons inside this component have been unhidden make sure this component
			// is not hidden.
			this.show();
		}
	},

	/**
	 * @property {Object} agent
	 * The base object for the component's agent.
	 * @return {Object}
	 */
	agent: {
		/**
		 * Create a button covering one state of the state set.
		 * @param {string} name The button's names.
		 * @param {Object} o Options for the button.
		 * @param {Object} o.state The value for the state this button covers.
		 * @chainable
		 */
		state: function( name, o ) {
			var button = this.component.interface.button( name, o );
			this.component._add( button );
			return this;
		}
	}
} );

/**
 * An interface component that groups a pair of prev/next buttons together.
 * @param {Object} o Options
 * @private
 */
UI.NavButtons = UI.Component.create( 'navbuttons', {
	constructor: function( o ) {
		this.prev = undefined;
		this.next = undefined;

		this.$();
	},

	/**
	 * Register the prev or next button for the nav buttons component.
	 * @param {"prev"|"next"} direction The direction of the button being registered.
	 * @param {UI.Button} button The button to add.
	 * @private
	 */
	_register: function( direction, button ) {
		if ( direction !== 'prev' && direction !== 'next' ) {
			throw new Error( "Direction must be one of 'prev' or 'next'." );
		}

		this[direction] = button;

		this.$('> *').detach();
		this.$().append( _( [ this.prev, this.next ] ).compact().invoke( 'getDOM' ).value() );
	},

	intercept: {
		activate: function( e ) {
			if ( !( e.source === 'button' && e.component instanceof UI.Button ) ) { return; }

			// e.button.
			this.trigger( 'navigate', {
				navName: this.name,
				direction: e.component.extra.direction
			} );

			e.stopPropagation();
		},

		hide: function( e ) {
			// Capture the button's hide event, parent elements only need to hear a hide event
			// if this entire element is hidden.
			e.stopPropagation();

			// Calculate visibility based on whether either of the buttons are visible
			var visible = ( this.prev && this.prev.visible ) || ( this.next && this.next.visible );
			this.setVisibility( visible );
		},

		show: function( e ) {
			// Capture the button's show event, parent elements only need to hear a show event
			// if this component emits it (ie: if calling show here does in fact unhide the component).
			e.stopPropagation();

			// If any of the buttons inside this component have been unhidden make sure this component
			// is not hidden.
			this.show();
		}
	},

	agent: new function() {
		// The function used to register both prev and next is almost entirely the same
		// so use a function factory to make the registration functions.
		var navRegisterFunction = function( direction ) {
			return function( name, o ) {
				o = $.extend( { direction: direction }, o || {} );
				var button = this.component.interface.button( name, o );
				this.component._register( direction, button );
				return this;
			};
		};

		// Setup a helper that'll allow the .next and .prev to be registered by the caller
		/**
		 * Register the prev button for the nav buttons component.
		 * @param {string} name The name of the button being created.
		 * @param {Object} o Options to be passed to the UI.Button instance being created.
		 */
		this.prev = navRegisterFunction( 'prev' );

		/**
		 * Register the name button for the nav buttons component.
		 * @param {string} name The name of the button being created.
		 * @param {Object} o Options to be passed to the UI.Button instance being created.
		 */
		this.next = navRegisterFunction( 'next' );
	}
} );

/**
 * An interface component that displays a title.
 * @param {Object} [o] The options.
 * @param {string} [o.class] A CSS class for the node.
 * @private
 */
UI.Title = UI.Component.create( 'title', {
	constructor: function( o ) {
		this.$()
			.addClass( o['class'] );

		this.refresh();
	},

	refresh: function() {
		var title = this.interface.state.get( 'title' );

		this.$().text( title || "" );
		this.setVisibility( !!title );
	}
} );
