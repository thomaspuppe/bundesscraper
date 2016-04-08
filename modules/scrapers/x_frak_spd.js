fetch.frak_spd = function(_callback){

	var data = [];
	var base_url = "http://www.spdfraktion.de/abgeordnete/all?view=list";

	scraper.scrape({
		url: base_url,
		type: "html",
		encoding: "utf8"
	}, function(err, $){

		if (err) {
			_callback(err);
		} else {
			
			var _count_fetchable = 0;
			var _count_fetched = 0;

			$('#member_overview_list > li', '#member_overview').each(function(idx,e){
				
				_count_fetchable++;

				var _data = {
					name: $(this).find('h3 a').text(),
					frak_url: url.resolve(base_url, $(this).find('h3 a').attr('href')),
					fotos: [],
					kontakt: [],
					web: []
				};
				
				if ($(this).find('a.mail').length > 0) {
					$(this).find('a.mail').each(function(idx,e){
						_data.kontakt.push({
							"type": "email",
							"address": $(this).attr('href').replace(/^mailto:/,'')
						})
					});
				}
				
				$(this).find('.share li a').each(function(idx,f){
					_data.web.push({
						service: $(f).text(),
						url: $(f).attr("href")
					});
				});
				
				// get details
				
				scraper.scrape({
					url: _data.frak_url, 
					type: "html", 
					encoding: "utf8",
				}, function(err, $){
					
					_count_fetched++;
					
					if (err) {
						
						
					} else {
						
						$('.subcr dl dt','#article_detail_header').each(function(idx,e){
							var _val = $(this).next('dd').text();
							switch ($(this).text()) {
								case "Geburtsdatum": 
									_data.geburtsdatum = _val.split(' in ').unshift(); 
									_data.geburtsort = _val.split(' in ').pop(); 
								break;
								case "Beruf:": _data.beruf = _val; break;
								case "Landesliste:": _data.liste = _val; break;
								case "Wahlkreis:": _data.wahlkreis = _val; break;
							}
						});

						// links
						
						$('.linklist li a','#article_detail_header').each(function(idx,e){
							switch($(this).text()) {
								case "Porträt auf bundestag.de": var _type = "bundestag"; break;
								case "YouTube": var _type = "youtube"; break;
								case "Reden im Videoarchiv des Bundestags": var _type = "bundestag_reden"; break;
								case "Auf twitter": var _type = "twitter"; break;
								case "Auf facebook": var _type = "facebook"; break;
								default:
									if ($(this).text().match(/^Homepage/i)) {
										var _type = "website";
									} else {
										var _type = "unknown";
									}
								break;
							}
							if ($(this).attr('href') !== '') {
								_data.web.push({
									"service": _type,
									"url": $(this).attr('href')
								});
							}
						});
						
						// foto
						$('.img_wrapper','#article_detail_header').each(function(idx,e){
							_data.fotos.push({
								"url": url.resolve(_data.frak_url, $(this).attr("href")),
								"copyright": ""
							});
						});

						// kontakt
						$('.map_box_content li', '#main').each(function(idx,e){
							
							var _name = $(this).find('h3').text();
							
							$(this).find('div span').each(function(idx,f){
								if ($(f).text().match(/^(Tel|Fax)/)) {
									// telefon | fax
									$(f).text().split(' | ').forEach(function(t){
										if (t.match(/^Tel/)){
											_data.kontakt.push({
												"type": "phone",
												"name": _name,
												"address": t.replace(/[^0-9]/g,'').replace(/^0/,'+49')
											});
										}
										if (t.match(/^Fax/)){
											_data.kontakt.push({
												"type": "fax",
												"name": _name,
												"address": t.replace(/[^0-9]/g,'').replace(/^0/,'+49')
											});
										}
									});
								} else {
									_data.kontakt.push({
										"type": "address",
										"name": _name,
										"address": $(f).text().replace(" | ",", ")
									});
								}
							});
							$(this).find('div a').each(function(idx,f){
								if ($(f).text().match(/E-Mail/)) {
									_data.kontakt.push({
										"type": "email",
										"name": _name,
										"address": $(f).attr('href').replace(/^mailto:/,'')
									});
								}
							});
						});
					}
					
					data.push(_data);
					
					if (_count_fetchable === _count_fetched) {
						
						_callback(null, data);
						
					}
					
				});
				
			});

		}
		
	});
	
};