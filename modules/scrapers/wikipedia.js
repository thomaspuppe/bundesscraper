/* require modules */
//var fs = require("fs");
//var path = require("path");
var url = require("url");

//var colors = require("colors");
var scrapyard = require("scrapyard");
//var moment = require("moment");
//var ent = require("ent");
//var xz = require("lzma-native");

var argv = require("optimist")
	.boolean(["c","d","z","t"])
	.alias("c","cache")
	.alias("d","debug")
	.alias("v","verbose")
	.alias("z","compress")
	.alias("t","timestamp")
	.alias("o","outdir")
	.argv;

var ConsoleLogger = require('./../helpers/consoleLogger');
var dbg = ConsoleLogger.debug;

/* initialize scrapyard */
var scraper = new scrapyard({
	cache: './.storage', 
	debug: argv.d,
	timeout: 986400000,
	retries: 5,
	connections: 5 // don't increase, cducsu.de serves fake-404s without proper status code on higher connection-concurrency
});

module.exports = { 

fetch: function(_callback){
	
		console.log( 'fetch.Wikipedia () Start' );

		var data = [];
		var base_url = "http://de.wikipedia.org/wiki/Liste_der_Mitglieder_des_Deutschen_Bundestages_%2818._Wahlperiode%29";
		scraper.scrape({
			url: base_url, 
			type: "html",
			encoding: "utf8"
		}, function(err, $){

			if (err) {
				dbg( 'fetch.Wikipedia () ERROR' );
				console.log( error );
				_callback(err);
			} else {

				dbg( 'fetch.Wikipedia () OK' );

				var _count_fetchable = 0;
				var _count_fetched = 0;

				var data = [];
				
				var allRows = $('#Abgeordnete').parent().next().next('table.prettytable.sortable').find('tr');
				dbg( 'fetch.Wikipedia () found ' + allRows.length + ' rows.');

				//allRows = allRows.slice(0,5);

				allRows.each(function(idx,e){

					if ($(this).find('td').length === 0) return;

					if (!($(this).find('td').eq(6).text().match(/ausgeschieden|verstorben/))) {
						
						_count_fetchable++;
						
						var _data = {
							"name": null,
							"gender": "u",
							"links": [],
							"aliases": [],
							"geburtsdatum": null,
							"geburtsort": null,
							"fotos": [],
							"fotos_links": []
						};
						_data.name = $(this).find('td').eq(0).find('a').text();

						_data.wikipedia_url = url.resolve(base_url, $(this).find('td').eq(0).find('a').attr('href'));
						_data.geboren = $(this).find('td').eq(1).text();
						_data.bundesland = $(this).find('td').eq(3).text();

						dbg( 'fetch.Wikipedia () read data for "' + _data.name + '".');

						scraper.scrape({
							url: _data.wikipedia_url, 
							type: "html",
							encoding: "utf8"
						}, function(err, $){

							_count_fetched++;

							if (err) {
								dbg( 'fetch.Wikipedia (' + _data.wikipedia_url + ') ERROR' );
								console.log(err)
								_callback(err);
							} else {

								dbg( 'fetch.Wikipedia (' + _data.wikipedia_url + ') OK' );

								// kategorien
								$('ul li a','#catlinks').each(function(idx,e){
									switch ($(this).attr("title")) {
										case "Kategorie:Mann":
											_data.gender = "m";
										break;
										case "Kategorie:Frau":
											_data.gender = "f";
										break;
										case "Kategorie: Intersexueller":
											_data.gender = "i";
										break;
									}
								});
								
								// weblinks
								$('#Weblinks').parent().next('ul').find('a').each(function(idx,e){
									_data.links.push({
										"text": $(this).text(),
										"url": $(this).attr("href")
									});
								});
								
								// personendaten meta
								$('#Vorlage_Personendaten tr').each(function(idx,e){
									if ($(this).find('.metadata-label').length === 1) {
										var _val = ($(this).find('.metadata-label').next().text());
										switch($(this).find('.metadata-label').text()) {
											case "NAME":
												_data.aliases.push(_val);
											break;
											case "GEBURTSDATUM":
												_data.geburtsdatum = _val;
											break;
											case "GEBURTSORT":
												_data.geburtsort = _val;
											break;
										}
									}
								});
								
								// bilder?
								$('a.image', '#mw-content-text').eq(0).each(function(idx,e){
									if ($(this).attr('href').match(/\.jp(e)?g$/)) {
										_data.fotos_links.push(url.resolve(_data.wikipedia_url, $(this).attr('href')));
									}
								});
								
							}
							
							data.push(_data);

							if (_count_fetchable === _count_fetched) {


								_callback(null, data);
								return;
								// TODO: Fotos. Deren Erfolg darf aber nicht die Callbacks verhindern.

								// get fotos from api
	/*							
								var _count_fetchable_fotos = 0;
								var _count_fetched_fotos = 0;
								data.forEach(function(item){
									item.fotos_links.forEach(function(foto_url){
										var _image = foto_url.split(':').pop();
										_count_fetchable_fotos++;
										this.scraper.scrape({
											url: "http://tools.wmflabs.org/magnus-toolserver/commonsapi.php?image="+_image, 
											type: "xml",
											headers: { 'User-Agent': 'bundesscraper/0.2.5 (https://github.com/yetzt/bundesscraper)' }
										}, function(err, _foto){
											if (!err) {
												item.fotos.push({
													"url": _foto.response.file[0].urls[0].file[0],
													"copyright": _foto.response.file[0].uploader[0],
													"license": (typeof _foto.response.licenses[0].license === "undefined") ? foto_url : (typeof _foto.response.licenses[0].license[0].license_text_url === "undefined") ? _foto.response.licenses[0].license[0].name[0] : _foto.response.licenses[0].license[0].license_text_url[0],
													"source_url": foto_url
												});
											}
											_count_fetched_fotos++;
											if (_count_fetched_fotos === _count_fetchable_fotos) {
												_callback(null, data);
											}
										});
									});
								});
	*/
							}
						});

					}
				});
			}
		});
	}

};