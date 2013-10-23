
/**
 * Object in charge of internationalization text.
 * @class MangaPerformer.i18n
 * @alternateClassName i18n
 * @extends Events
 * @singleton
 */
export var i18n = {
	// @todo Document methods and properties
	/**
	 * @property {string}
	 * The language code of the current language set to output in the UI.
	 * @readonly
	 */
	language: 'en',

	/**
	 * @property {string[]}
	 * An internal list of valid language codes.
	 * Used when picking the automatic language from the document so that lang="en-US"
	 * will result in 'en' being picked when we don't have something specific to en-US.
	 * @private
	 * @readonly
	 */
	languages: ['en'],

	/**
	 * @property {Object}
	 * A map of language codes to promises that will be resolved when the language is available.
	 * @private
	 */
	loadedLanuages: {},
	
	/**
	 * @property {Object}
	 * The object storing loaded message contents for each language.
	 * Stored as i18n.messages[langCode][messageName]
	 * @private
	 */
	messages: {},

	detectLanguage: function() {
		i18n.setLanguage( $( 'body' ).closest( '[lang]' ).attr( 'lang' ) || 'en' );
	},

	setLanguage: function( code ) {
		code = String( code ).toLowerCase() || 'en';
		if ( i18n.language === code ) {
			return;
		}

		i18n.fetchLanguage( code )
			.done( function() {
				i18n.language = code;
				i18n.emit( 'languagechanged' );
			});
	},

	/**
	 * Return the script url for a MangaPerformer language file.
	 * This can be overridden if your environment has special handling like loading all resources through
	 * a specific resource loading script.
	 * @param {string} lang The language code.
	 */
	getLanguageURL: function( lang ) {
		return MangaPerformer.BASE + '/mangaperformer.lang.' + lang.toLowerCase() + '.js';
	},

	// Should this be @private?
	fetchLanguage: function( lang ) {
		lang = lang.toLowerCase();
		if( !_.has( i18n.loadedLanuages, lang ) ) {
			var deferred = $.Deferred();
			if ( _.has( i18n.messages, lang ) ) {
				// If the messages for this language have already been loaded
				// eg: Always for English as it's embedded into the file.
				//     Or the user pre-loaded the language with a script tag.
				deferred.resolve();
			} else {
				$.getScript( i18n.getLanguageURL( lang ), function() {
					deferred.resolve();
				} );
			}
			i18n.loadedLanuages[lang] = deferred.promise();
		}

		return i18n.loadedLanuages[lang];
	},

	// Should this be @private?
	getMessage: function( name, lang ) {
		var m = i18n.messages;
		lang = lang.toLowerCase();
		if ( _.has( m, lang ) && _.has( m[lang], name ) ) {
			return m[lang][name];
		}
		if ( _.has( m.en, name ) ) {
			warn( name + ' not found for ' + lang + ' falling back to English language message.' );
			return m.en[name];
		}
		warn( name + ' not found in ' + lang + ' or English language, outputting {' + name + '}', name, lang, name );
		return '{' + name + '}';
	},
	__: function( name ) {
		return i18n.getMessage( name, i18n.language );
	}
};

Events.mixin( i18n );

var __ = {
	t: function() {
		return i18n.__.apply( this, arguments );
	},
	f: function( name ) {
		return _.partial( __.t, name );
	}
};
