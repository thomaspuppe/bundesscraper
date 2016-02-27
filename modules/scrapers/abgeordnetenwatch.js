var url = require("url");
var scrapyard = require("scrapyard");

var ConsoleLogger = require('./../helpers/consoleLogger');
var dbg = ConsoleLogger.debug;

var argv = require("optimist")
	.boolean(["c","d","z","t"])
	.alias("c","cache")
	.alias("d","debug")
	.alias("v","verbose")
	.alias("z","compress")
	.alias("t","timestamp")
	.alias("o","outdir")
	.argv;

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
		
		dbg( 'fetch.AGW () Start' );

		var data = [];
		var base_url = "http://www.abgeordnetenwatch.de/abgeordnete-1128-0.html";
		scraper.scrape({
			url: base_url, 
			type: "html",
			encoding: "utf8"
		}, function(err, $){

			if (err) {
				dbg( 'fetch.AGW (' + base_url + ') ERROR' );
				_callback(err);
			} else {
				dbg( 'fetch.AGW (' + base_url + ') SUCCESS' );

				var _count_fetched_pages = 0;
				var _count_fetchable = 0;
				var _count_fetched = 0;

				var _pages = [];
				_pages.push(base_url);
				
				//var profilePages = $('.browse_pages .pages', '#content').eq(0).find('a.ReloadByPageProfiles');
				//var profilePages = $('#content .browse_pages .pages a.ReloadByPageProfiles');
				var profilePages = $('.ReloadByPageProfiles');
				dbg( 'fetch.AGW () Found ' + profilePages.length + ' profile pages.' );
				profilePages.each(function(idx,e){
					var profilePageUrl = $(this).attr('href').replace(/#.*$/,'');
					dbg( 'fetch.AGW () Add File: ' + profilePageUrl);
					_pages.push(url.resolve(base_url, profilePageUrl));
				});

				dbg('------------------- STOP -------------------');
				return;
				
				var _lastp = parseInt(_pages.pop().replace(/^.*\-0-([0-9]+)\.html$/,"$1"),10);
				var _pages = [];
				for (var i = 0; i <= _lastp; i++) {
					_pages.push(base_url.replace(/0\.html$/, '0-'+i+'.html'))
				}
				
				_pages.forEach(function(page_url){

					scraper.scrape({
						url: page_url, 
						type: "html",
						encoding: "utf8"
					}, function(err, $){

						_count_fetched_pages++;

						if (err) {
							// FIXME: unify
							_callback(err);
						} else {
							
							$('.list .card', '#content').each(function(idx,e){

								_count_fetchable++;
															
								var _data = {
									agw_url: url.resolve(page_url, $(this).find('a').eq(0).attr("href")),
									name: $(this).find(".title").text(),
									fotos: [],
									ausschuesse: []
								};

								scraper.scrape({
									url: _data.agw_url, 
									type: "html", 
									encoding: "utf8",
								}, function(err, $){

									_count_fetched++;

									if (err) {
										// FIXME: whatever
									} else {
										
										// picture
										$('.portrait .portrait.bordered_left','#content').each(function(idx,e){
											_data.fotos.push({
												"url": url.resolve(_data.agw_url, $(this).find('img').eq(0).attr('src')),
												"copyright": $(this).find('.copyright').text()
											});
										});

										// data
										if ($('.grunddaten ','#content').find(".title_data").eq(0).parent().length === 1) {
											var _match = $('.grunddaten ','#content').find(".title_data").eq(0).parent().html().match(/<div class="title_data">([^<]+)<\/div>([^<]+)/g);
											if ((!_match) && argv.v) console.log("[fail]", "data", _data.name, _data.agw_url);
											if (_match) _match.forEach(function(_m){
												var __m = _m.match(/^<div class="title_data">([^<]+)<\/div>(.*)/);
												if (__m) {
													var __v = __m[2].replace(/^\s+|\s+$/g,'').replace(/<[^>]+>/g,'');
													switch (__m[1]) {
														case "Geburtstag": 
															_data.geburtsdatum = __v;
														break;
														case "Berufliche Qualifikation": 
															_data.beruf = __v;
														break;
														case "Wohnort": 
															_data.wohnort = __v;
														break;
														case "Wahlkreis": 
															_data.wahlkreis = __v;
														break;
														case "Ergebnis": 
															_data.wahlergebnis = __v;
														break;
														case "Landeslistenplatz": 
															_data.listenplatz = __v;
														break;
													}
												}
											});
										} else {
											if (argv.v) console.log("[fail]", _data.name, _data.agw_url);
										}

										/* abgeordnetenwatch.de is a big pile of junk */
										/*
										$(".ausschussmitgliedschaften .entry", "#content").each(function(idx,e){
											_data.ausschuesse.push({
												"name": $(this).find('.entry_title a').text(),
												"funktion": $(this).find('title_data').text(),
												"url": url.resolve(_data.agw_url, $(this).find('.entry_title a').attr('href'))
											});
										});
										*/
										
									}
									
									data.push(_data);
									
									if (_count_fetched_pages === _pages.length && _count_fetched === _count_fetchable) {
										// success
										_callback(null, data);
									}
									
								});
								
							});
							
						}
						
					});
					
				});
				
			}

		});
		
	}
};