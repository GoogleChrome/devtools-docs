
(function(){

	var file = document.location.search.replace(/\?/,'');
	var link = document.createElement('a');
	var listing = false;

	// get directory listing if no URL provided
	if (!file){
		listing = true;
		file = '/docs/';
	}

	// let's ajax it in
	var content = jQuery('<div>').load(file, function(){

		// muck with the content
		if (!listing) return;

		$(this).find('a[href]')
			.filter('a[href$="/"]').closest('li').remove().end().end()
			.attr('href', function(el, oldattr){
				link.href = oldattr;
				return location.pathname + '?' + link.pathname.replace(/\/docs\//,'');
			});

	}).prependTo('#gc-content');

}());
