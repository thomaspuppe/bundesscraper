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
	
		dbg( 'fetch.BT () Start' );

	var data = [];
	var base_url = "http://www.bundestag.de/bundestag/abgeordnete18/alphabet/index.html";
	scraper.scrape({
		url: base_url, 
		type: "html", 
		encoding: "utf8"
	}, function(err, $){
		if (err) {
			console.log( 'fetch.bt () ERROR' );
			_callback(err);
		} else {
			console.log( 'fetch.bt () SUCCESS' );
			var _count_fetchable = 0;
			var _count_fetched = 0;

			var linksFound = $('.linkIntern a','#inhaltsbereich');
			console.log( 'fetch.bt () Found ' + linksFound.length + ' internal links in #inhaltsbereich' );

			// for testing and debugging: only use a slice of the data	
			//linksFound = linksFound.slice(0, 10);

			linksFound.each(function(idx, e){
				var $e = $(this);
				/* check for dead or retired members, marked by "+)" or "*)" and for "Jakob Maria Mierscheid" */
				if (!($e.text().match(/[\*\+]\)$/)) && !($(this).text().match(/Mierscheid/i))) {
					_count_fetchable++;
					var _data = {
						"name": null,
						"aliases": [],
						"url": url.resolve(base_url, $e.attr('href')),
						"fraktion": null,
						"fotos": [],
						"ausschuesse": [],
						"wahlkreis": null,
						"mandat": null,
						"kontakt": [],
						"web": []
					};
					scraper.scrape({
						url: _data.url,
						type: "html",
						encoding: "utf8"
					}, function(err, $){						
						if (err) {
							console.log( 'fetch.bt () Fetch ERROR: ' + _data.url );
							if (argv.v) console.log("[fail]".inverse.bold.red, "fetching".white, _data.url.red);
						} else {
							console.log( 'fetch.bt () Fetch SUCCESS: ' + _data.url );
							/* name, fraktion */
							var _title = $('h1', '#inhaltsbereich').eq(0).text().replace(/^\s+|\s+$/,'').split(', ');
							_data.name = _title[0].replace(/ \([^\)]+\)$/,'');
							_data.fraktion = _title[1];
							
							/* build aliases */
							_data.aliases.push(_data.name);
							if (_data.name.match(/^(Prof\. |Dr\. |h\.\s?c\. |rer\. |nat\. |jur\. |iur\. |pol\. )/)) {
								_data.aliases.push(_data.name.replace(/(Prof\. |Dr\. |h\.\s?c\. |rer\. |nat\. |jur\. |iur\. |pol\. )/g,''));
							}
							_data.aliases.forEach(function(name){
								if (name.match(/\s+[A-Z]\.\s+/)) {
									_data.aliases.push(name.replace(/\s+[A-Z]\.\s+/,' '));
								}
							});
							
							/* fotos */
							$('.bildDivPortrait', '#inhaltsbereich').each(function(idx,e){
								_data.fotos.push({
									"url": url.resolve(_data.url, $(this).find('img').attr('src')),
									"copyright": $(this).find('.bildUnterschrift p').text().replace(/^\s+|\s+$/,'')
								});
							});

							/* ausschuesse */
							$('.mitgliedschaftBox', '#inhaltsbereich').each(function(idx,e){
								if ($(this).find('h2').eq(0).text().replace(/^\s+|\s+$/,'') === "Mitgliedschaften und Ämter im Bundestag") {
									$(this).find('.standardBox h3').each(function(idx,f){
										$(f).next().find('a').each(function(idx,g){
											_data.ausschuesse.push({
												"name": $(g).text().replace(/^\s+|\s+$/,''),
												"funktion": $(f).text().replace(/^\s+|\s+$/,""),
												"url": url.resolve(_data.url, $(g).attr('href'))
											});
										});
									});
								}
							});

							/* website, wahlkreis */
							$('.contextBox', '#context').each(function(idx,e){
								var _section = $(this).find('h2').text().trim();

								//dbg( 'Switch Section: ' + _section );

								switch(_section) {
									case "Kontakt":
										if ($(this).find('.standardBox .standardLinkliste .linkExtern a').length > 0) {
											$(this).find('.standardBox .standardLinkliste .linkExtern a').each(function(idx,f){
												switch($(f).text()) {
													case "bei Facebook": 
														_data.web.push({
															"service": "facebook",
															"url": $(f).attr('href')
														});
													break;
													case "bei Twitter": 
														_data.web.push({
															"service": "twitter",
															"url": $(f).attr('href')
														});
													break;
													case "bei studiVZ": 
														_data.web.push({
															"service": "studivz",
															"url": $(f).attr('href')
														});
													break;
													case "bei Xing": 
														_data.web.push({
															"service": "studivz",
															"url": $(f).attr('href')
														});
													break;
													case "Weblog": 
														_data.web.push({
															"service": "blog",
															"url": $(f).attr('href')
														});
													break;
													case "persönliche Internetseite": 
														_data.web.push({
															"service": "website",
															"url": $(f).attr('href')
														});
													break;
													default: 
														if ($(f).text().match(/^http[s]?:\/\//)) {
															_data.web.push({
																"service": "website",
																"url": $(f).attr('href')
															});
														} else {
															_data.web.push({
																"service": "unknown",
																"url": $(f).attr('href')
															});
														}
													break;
												}
											});
										}
									break;
									case "Gewählt über Landesliste": 
										_data.mandat = 'liste';
										if ($(this).find('.standardBox a[title^=Wahlkreis]','#context').length === 1) {
											_data.wahlkreis = $(this).find('.standardBox a[title^=Wahlkreis]','#context').eq(0).attr('title');
											dbg( 'Landesliste/WK gefunden: ' + _data.wahlkreis );
										} else if ($(this).find('.standardBox','#context').length === 1) {
											_data.landesliste = $(this).find('.standardBox','#context').eq(0).text().trim();
											dbg( 'Landesliste ohne Link gefunden: ' + _data.landesliste );
										} else {
											dbg( 'Landesliste nicht gefunden' );
											_data.wahlkreis = null;
										}
									break;
									case "Direkt gewählt in": 
										_data.mandat = 'direkt';
										_data.wahlkreis = $(this).find('.standardBox a[title^=Wahlkreis]','#context').eq(0).attr('title');
										dbg( 'Direkt-WK gefunden: ' + _data.wahlkreis );
									break;
									case "Reden des MdB": break;
									case "Namentliche Abstimmungen": break;
									case "Informationen zur Fraktion": break;
								}
							});
							
							/* get addresses */
							
							/* why you no utf8? */
							var adr_search = (_data.aliases[(_data.aliases.length-1)])
								.replace(/ä/ig, 'ae')
								.replace(/ö/ig, 'oe')
								.replace(/ü/ig, 'ue')
								.replace(/ß/ig, 'ss')
								.replace(/ğ/ig, 'g')
								.replace(/è/ig, 'e')
								.replace(/é/ig, 'e')
								.replace(/š/ig, 's')
								.replace(/ć/ig, 'c')
								.split(/\s+/);
							var adr_search_firstname = adr_search.shift();
							var adr_search_surname = adr_search.pop();
							
							/* special cases, fixed by hand. */
							switch (adr_search_firstname+' '+adr_search_surname) {
								case "Birgitt Bender":
									adr_search_firstname = "Biggi";
									_data.aliases.push("Biggi Bender");
								break;
								case "Agnes Brugger":
									adr_search_firstname = "Agnieszka";
									_data.aliases.push("Agnieszka Brugger");
								break;
								case "Viola Cramon-Taubadel":
									adr_search_surname = "Cramon";
									_data.aliases.push("Viola Cramon");
									_data.aliases.push("Viola von Cramon");
								break;
								case "Joerg Essen":
									adr_search_surname = "Essenvan"; // so broken this shit
								break;
								case "Ursula Heinen-Esser":
									adr_search_surname = "Heinen";
									_data.aliases.push("Ursula Heinen");
								break;
								case "Sven-Christian Kindler":
									adr_search_firstname = "Sven";
									_data.aliases.push("Sven Kindler");
								break;
								case "Ulla Schmidt":
									adr_search_firstname = "Ursula";
									_data.aliases.push("Ursula Schmidt");
								break;
								case "Heinz Wichtel":
									adr_search_firstname = "Peter";
									_data.aliases.push("Peter Wichtel");
								break;
							}
							

							console.log( 'fetch.bt () Scraped Member "' + adr_search_firstname+' '+adr_search_surname + '":' );
							//console.log( _data );


_data.nachname = adr_search_surname;
_data.vorname = adr_search_firstname;

							data.push(_data);

							_count_fetched++;
							if (_count_fetched === _count_fetchable) {
								_callback(null, data);
							}

/*
							//hmpf

							scraper.scrape({
								url: "http://www.bundestag.de/dokumente/adressbuch/?",
								type: "html",
								method: "POST",
								form: {
									surname: adr_search_surname,
									firstname: adr_search_firstname,
									fraction: "",
									email: "",
									associatedTo: "MdB", 
									doSearch: "Suchen"
								}
							}, function(err, $){

								_count_fetched++;

								if (err) {
									console.log( 'fetch.bt () AddessSearch ERROR: "' + adr_search_firstname+' '+adr_search_surname + '":' );
									if (argv.v) console.log("[fail]".inverse.bold.red, "address1".white, adr_search_firstname.red, adr_search_surname.red);
								} else {
									console.log( 'fetch.bt () AddessSearch SUCCESS: "' + adr_search_firstname+' '+adr_search_surname + '":' );
									if ($('.infoBox .standardBox table.standard','#container').length < 1) {
// HIER RUTSCHT ER REIN. IM BROWSER GEHT ES ABER. WARUM?
										console.log( 'fetch.bt () AddessSearch SUCCESS - Container not Found : "' + adr_search_firstname+' '+adr_search_surname + '":' );
										if (argv.v) console.log("[fail]".inverse.bold.red, "address2".white, adr_search_firstname.red, adr_search_surname.red);
										
									} else {
										
										$('.infoBox .standardBox table.standard tr','#container').each(function(idx,e){
											console.log( 'fetch.bt () AddessSearch SUCCESS - Container Row Found : "' + adr_search_firstname+' '+adr_search_surname + '":' );
											switch ($(this).find('th').text().replace(/^\s+|\s+$/g,'')) {
												
												case "Nachname": 
													_data.nachname = $(this).find('td').text().replace(/^\s+|\s+$/g,'');
												break;
												case "Vorname": 
													_data.vorname = $(this).find('td').text().replace(/^\s+|\s+$/g,'');
												break;
												case "E-Mail Adresse": 
													_data.kontakt.push({
														"type": "email",
														"address": $(this).find('td').text().replace(/^\s+|\s+$/g,'')
													});
												break;
												case "Zertifikat":
													_data.btcertuid = $(this).find('td a').eq(0).attr('href').split('uid=').pop();
												break;
												
											}
											
										});
										
									}
									
									data.push(_data);
									if (_count_fetched === _count_fetchable) {
										_callback(null, data);
									}
									
								}
							});
*/
						}

					});
				} 
				console.log( 'fetch.bt () Do not fetch beause of wrong name: ' + $e.text() );
			});
		}
	});

	}
};