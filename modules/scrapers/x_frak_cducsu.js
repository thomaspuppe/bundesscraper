fetch.frak_cducsu = function(_callback){

	var data = [];
	var base_url = "https://www.cducsu.de/abgeordnete";
	var _count_fetchable = 0;
	var _count_fetched = 0;

	scraper.scrape({
		url: base_url, 
		type: "html", 
		encoding: "utf8"
	}, function(err, $){
		
		if (err) return _callback(new Error("could not fetch", base_url));
		
		$('.abgeordnete_az_content .node-abgeordneter a.abgeordnete_wrapper_link', '#block-system-main').each(function(idx,e){

			_count_fetchable++;

			(function(_url){

				scraper.scrape({
					"url": _url, 
					type: "html", 
					encoding: "utf8"
				}, function(err, $){

					var _data = {
						name: $('.group-hauptinfo .group-infobereich h1', '#block-system-main').text().replace(/^\s+|\s+$/g,''),
						frak_url: _url,
						fotos: [],
						web: [],
						kontakt: []
					}
					
					_data.position = $('.group-hauptinfo .group-infobereich h3', '#block-system-main').text().replace(/^\s+|\s+$/g,'');
					_data.geburtsdatum = $('.group-hauptinfo .group-infobereich .group-birthday time.date-display-single', '#block-system-main').attr("datetype");
					_data.geburtsort = ent.decode($('.group-hauptinfo .group-infobereich .group-birthday').html().split(/<\/div>/g).pop().replace(/^\s+|\s+$/g,''));
					_data.beruf = $('.group-hauptinfo .group-infobereich .field.field-name-beruf-gendered', '#block-system-main').text().replace(/^\s+|\s+$/g,'');
					
					/* wahlkreis, addressen, social media, */
					if (/^.*Wahlkreis.*\(([0-9]+)\).*$/.test($('.wahlkreis-name', '#block-system-main').text())) {
						_data.wahlkreis = $('.wahlkreis-name', '#block-system-main').text().replace(/^.*Wahlkreis.*\(([0-9]+)\).*$/,'$1');
						_data.mandat = "direkt";
					} else {
						_data.mandat = "liste";
					}

					// addresse berlin
					$('.field-name-field-kontakt-berlin .adr', '#block-system-main').each(function(idx, e){
						$('.type', $(this)).remove();

						$('.tel', $(this)).each(function(idx,e){
							_data.kontakt.push({
								"type": "phone",
								"name": "Berlin",
								"address": $(this).text().replace(/^\s+|\s+$/g,'').replace(/[^0-9]/g,'').replace(/^0/,'+49')
							});
						});

						$('.email', $(this)).each(function(idx,e){
							_data.kontakt.push({
								"type": "email",
								"name": "Berlin",
								"address": $(this).text().replace(/^\s+|\s+$/g,'')
							});
						});

						_data.kontakt.push({
							"type": "address",
							"name": "Berlin",
							"address": [
								$(".street-address", $(this)).text().replace(/^\s+|\s+$/g,''),
								", ",
								$(".postal-code", $(this)).text().replace(/^\s+|\s+$/g,''),
								" ",
								$(".locality", $(this)).text().replace(/^\s+|\s+$/g,'')
							].join("")
						});

					});
					
					// addresse wahlkreis
					$('.group-wahl-wrapper .adr', '#block-system-main').each(function(idx, e){
						$('.type', $(this)).remove();

						$('.tel', $(this)).each(function(idx,e){
							_data.kontakt.push({
								"type": "phone",
								"name": "Wahlkreis",
								"address": $(this).text().replace(/^\s+|\s+$/g,'').replace(/[^0-9]/g,'').replace(/^0/,'+49')
							});
						});

						$('.email', $(this)).each(function(idx,e){
							_data.kontakt.push({
								"type": "email",
								"name": "Wahlkreis",
								"address": $(this).text().replace(/^\s+|\s+$/g,'')
							});
						});

						_data.kontakt.push({
							"type": "address",
							"name": "Wahlkreis",
							"address": [
								$(".street-address", $(this)).text().replace(/^\s+|\s+$/g,''),
								", ",
								$(".postal-code", $(this)).text().replace(/^\s+|\s+$/g,''),
								" ",
								$(".locality", $(this)).text().replace(/^\s+|\s+$/g,'')
							].join("")
						});

					});
					
					// social media
					
					$('.view.view-abgeordneter-sozialnetzwerke li', '#block-system-main').each(function(idx, e){
						switch ($(this).attr("class")) {
							case "twitter":
								_data.web.push({
									"service": "twitter",
									"url": $('a', $(this)).attr('href')
								});
							break;
							case "facebook":
								_data.web.push({
									"service": "facebook",
									"url": $('a', $(this)).attr('href')
								});
							break;
							case "xing":
								_data.web.push({
									"service": "xing",
									"url": $('a', $(this)).attr('href')
								});
							break;
							case "youtube":
								_data.web.push({
									"service": "youtube",
									"url": $('a', $(this)).attr('href')
								});
							break;
							case "vz":
								_data.web.push({
									"service": "meinvz",
									"url": $('a', $(this)).attr('href')
								});
							break;
							default:
								dbg('OUTPUT DEFAULT HTML Fallback')
								console.log($(this).attr("class"), $(this).html());
								process.exit();
							break;
						}
					});
					
					// links
					$('.view-externe-links li', '#block-system-main').remove(".mobile_visible");
					$('.view-externe-links li a', '#block-system-main').each(function(idx, e){

						switch ($(this).text().replace(/^\s+|\s+$/g,'')) {
							case "Persönliche Homepage":
								_data.web.push({
									"service": "website",
									"url": $(this).attr('href')
								});
							break;
						}
					});
										
					// foto
					$('.abgeordnete_content_box .file-image', '#block-system-main').each(function(idx,e){
						$('.group-bildquelle', $(this)).remove('.label-inline')
						_data.fotos.push({
							"url": url.resolve(_url, $('a.colorbox', $(this)).attr('href')),
							"copyright": $('.group-bildquelle', $(this)).text().replace(/^\s+|\s+$/g,''),
							"license": $('a[rel=license]', $(this)).attr("href") || null
						});
					});

					data.push(_data);
					if (++_count_fetched === _count_fetchable) _callback(null, data);
					
					
				});

			})(url.resolve(base_url, $(this).attr("href")))
			
		});

	});

}