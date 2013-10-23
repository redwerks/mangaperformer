
/**
 * Common implementation of getConstrained that'll be used
 * by both PageList and PagePairList.
 * @ignore
 */
function getConstrained( idx ) {
	if ( idx < 0 ) {
		return this[0];
	}
	if ( idx >= this.length ) {
		return this[this.length-1];
	}
	return this[idx];
}

/**
 * Class representing a single page in a manga/comic.
 * @class MangaPerformer.Page
 * @alternateClassName Page
 */
export function Page() {
	/**
	 * @property {String|undefined}
	 * The URL of the full image for the page.
	 */
	this.src = undefined;

	/**
	 * @property {String|undefined}
	 * The URL of the thumbnail image for the page.
	 */
	this.thumb = undefined;

	/**
	 * @property {Number|undefined}
	 * The page number for the page.
	 * Leave undefined for some special pages like the cover.
	 */
	this.num = undefined;

	/**
	 * @property {PageList}
	 * The list of pages.
	 * @readonly
	 */
	this.pages = undefined;

	/**
	 * @property {PageList}
	 * Alias of Page#pages.
	 * @readonly
	 */
	this.list = undefined;

	/**
	 * @property {number}
	 * The page's index within the list of pages.
	 * @readonly
	 */
	this.idx = undefined;

	/**
	 * @property {PagePair}
	 * The page pair this page belongs to.
	 * @readonly
	 */
	this.pair = undefined;

	/**
	 * @property {Page|undefined}
	 * The previous page if any.
	 * @readonly
	 */
	this.prev = undefined;

	/**
	 * @property {Page|undefined}
	 * The next page if any.
	 * @readonly
	 */
	this.next = undefined;
}

/**
 * Class representing a list of all the pages in a manga/comic.
 * @class MangaPerformer.PageList
 * @alternateClassName PageList
 * @uses Page
 */
export function PageList( manga ) {
	/**
	 * @property {number}
	 * The length of the list.
	 * @readonly
	 */
	this.length = 0;

	/**
	 * @property {Manga}
	 * The manga/comic these pages belong to.
	 * @readonly
	 */
	this.manga = manga;
}

/**
 * Add a new page to the page list.
 *
 * @param {Page} page The page.
 */
PageList.prototype.add = function( page ) {
	ArrayPush.call( this, page );
};

/**
 * Return the page at an index but do so constraining the index
 * such that an index below 0 returns the first page and an
 * index after the end of the list returns the last page.
 *
 * @param {number} idx The index.
 * @return {Page}
 */
PageList.prototype.getConstrained = getConstrained;

/**
 * Class representing a pair of one or two pages in a 2-page spread.
 * @class MangaPerformer.PagePair
 * @alternateClassName PagePair
 * @uses Page
 */
export function PagePair() {
	/**
	 * @property {number}
	 * The length of the list.
	 * @readonly
	 */
	this.length = 0;

	/**
	 * @property {PagePairList}
	 * The list of page pairs.
	 * @readonly
	 */
	this.pairs = undefined;

	/**
	 * @property {PagePairList}
	 * Alias of PagePair#pairs.
	 * @readonly
	 */
	this.list = undefined;

	/**
	 * @property {number}
	 * The pair's index within the list of page pairs.
	 * @readonly
	 */
	this.idx = undefined;

	/**
	 * @property {Page|undefined}
	 * The previous page pair if any.
	 * @readonly
	 */
	this.prev = undefined;

	/**
	 * @property {Page|undefined}
	 * The next page pair if any.
	 * @readonly
	 */
	this.next = undefined;
}

/**
 * Add page to the page pair.
 *
 * @param {Page} page The page.
 * @throws {Error} When there are already 2 pages in the pair.
 */
PagePair.prototype.add = function( page ) {
	if ( this.length >= 2 ) {
		throw new Error( "Only two pages are permitted in a page pair." );
	}
	ArrayPush.call( this, page );
};

/**
 * Class representing a list of all 2-page spread page pairs in a manga/comic.
 * @class MangaPerformer.PagePairList
 * @alternateClassName PagePairList
 * @uses PagePair
 */
export function PagePairList( manga ) {
	/**
	 * @property {number}
	 * The length of the list.
	 * @readonly
	 */
	this.length = 0;

	/**
	 * @property {Manga}
	 * The manga/comic these page pairs belong to.
	 * @readonly
	 */
	this.manga = manga;
}

/**
 * Add a new page pair to the page pair list.
 *
 * @param {PagePair} pair The page pair.
 */
PagePairList.prototype.add = function( pair ) {
	ArrayPush.call( this, pair );
};

/**
 * Return the page pair at an index but do so constraining the
 * index such that an index below 0 returns the first pair and an
 * index after the end of the list returns the last pair.
 *
 * @param {number} idx The index.
 * @return {PagePair}
 */
PagePairList.prototype.getConstrained = getConstrained;
