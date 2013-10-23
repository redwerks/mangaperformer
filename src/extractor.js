
var extractors = {};

/**
 * @member MangaPerformer
 * @method registerDataExtractor
 * Register an extractor to fill a {@link Manga} object with metadata and pages.
 *
 * The callback will accept the Manga object as the `this` and is expected to construct
 * the proper {@link Page} and {@link PagePair} instances and add them to the object.
 *
 * The callback can vary in what kind of data it works with. The extractor could take a
 * simple JSON object with all the page data and build the comic/manga from that. Or it
 * could take a selector pointing to a location in a DOM where all the pages of the
 * comic/manga happen to be output. In some format such as a list of linked images or
 * some other format like RDFa then build the comfig/manga from that.
 *
 * @param {string} format The name of the extractor to register.
 * @param {Function} callback The callback function to register for the extractor.
 * @param {Object} callback.data The extractor data passed to Manga#extractMangaData.
 */
export function registerDataExtractor( format, callback ) {
	if ( !$.isFunction( callback ) ) {
		throw new TypeError( "Data extractor callback must be a function." );
	}
	extractors[format] = callback;
}
