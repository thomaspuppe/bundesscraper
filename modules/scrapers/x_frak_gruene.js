fetch.frak_gruene = function(_callback){

	var data = [];
	var base_url = "http://www.gruene-bundestag.de/";
	var fetch_url = "http://www.gruene-bundestag.de/fraktion/abgeordnete_ID_4389869.html";

	scraper.scrape({
		url: fetch_url, 
		type: "html",
		encoding: "utf8"
	}, function(err, $){

		if (err) {
			_callback(err);
		} else {
			
			var _count_fetchable = 0;
			var _count_fetched = 0;
			
			$('.tt_content_list_item','#abgeordnete_slides_container').each(function(idx,e){
				
				_count_fetchable++;
				
				var _data = {
					name: $(this).find('.abgeordnete_text p').eq(0).find('a').text(),
					frak_url: url.resolve(base_url, $(this).find('.abgeordnete_text p').eq(0).find('a').attr("href")),
					fotos: [{
						"url": url.resolve(base_url, $(this).find('img').eq(0).attr("src")),
						"copyright": null
					}],
					web: [],
					kontakt: []
				}
				
				$(this).find('.email_link a').each(function(idx,e){
					_data.kontakt.push({
						"type": "email",
						"address": $(this).attr('href').replace(/^mailto:/,'')
					})
				})
				
				scraper.scrape({
					url: _data.frak_url, 
					type: "html",
					encoding: "utf8"
				}, function(err, $){
					
					_count_fetched++;
					
					if (err) {
						// FIXME: err
					} else {
						
						// email, telefon & fax
						$('p.bodytext', '#abgeordnete_links').each(function(idx,e){
							if ($(this).find('a.mailtolink').length !== 0) {
								/* email */
								_data.kontakt.push({
									"type": "email",
									"name": "Berliner Büro",
									"address": $(this).find('a.mailtolink').attr("href").replace(/^mailto:/,'')
								});
							} else if ($(this).find('b').length !== 0) {
								// skip
							} else {
								/* telefon fax */
								$(this).html().split('<br>').forEach(function(itm){
									itm = itm.replace(/^\s+|\s+$/g,'');
									switch(itm.substr(0,1)) {
										case "T":
											_data.kontakt.push({
												"type": "phone",
												"name": "Berliner Büro",
												"address": itm.replace(/[^0-9]/g,'').replace(/^0/,'+49')
											});
										break;
										case "F":
										_data.kontakt.push({
											"type": "fax",
											"name": "Berliner Büro",
											"address": itm.replace(/[^0-9]/g,'').replace(/^0/,'+49')
										});
										break;
									}
								});
							}
						});
						
						// links 
						$('li a','#links').each(function(idx,e){
							switch($(this).text().toLowerCase().replace(/[^a-z]/g,'')){
								case "twitter":
									_data.web.push({
										"service": "twitter",
										"url": $(this).attr('href')
									});
								break;
								case "facebook":
									_data.web.push({
										"service": "facebook",
										"url": $(this).attr('href')
									});
								break;
								case "blog":
									_data.web.push({
										"service": "blog",
										"url": $(this).attr('href')
									});
								break;
								case "youtube":
									_data.web.push({
										"service": "youtube",
										"url": $(this).attr('href')
									});
								break;
								case "portrtbeibundestagde":
									_data.web.push({
										"service": "bundestag",
										"url": $(this).attr('href')
									});
								break;
								case "verffentlichungspflichtigeangaben": break;
								default: 
									if ($(this).attr('href').toLowerCase().indexOf($(this).text().toLowerCase()) >= 0) {
										// personal website
										_data.web.push({
											"service": "website",
											"url": $(this).attr('href')
										});
									} else {
										_data.web.push({
											"service": "unknown",
											"url": $(this).attr('href')
										});
									}
								break;
							}
						});
						
						/* wahlkreis */
						$('.wk-info h4 a','#parlament').each(function(idx,e){
							_data.wahlkreis = $(this).text();
						});
						
						/* guessing arbritrary address formats */
						$('.wk-kontakt .bodytext','#parlament').each(function(idx,e){

							var _lines = [];
							$(this).html().split('<br>').forEach(function(_line){
								_lines.push(_line.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,''));
							});
														
							_lines.forEach(function(_line,idx){
								_line = _line.replace('&nbsp;',' ');
								if (_line.match(/^T. /)) {
									/* phone */
									_data.kontakt.push({
										"type": "phone",
										"name": "Wahlkreisbüro",
										"address": _line.replace(/[^0-9]/g,'').replace(/^0/,'+49')
									});
								} else if (_line.match(/^F. /)) {
									/* fax */
									_data.kontakt.push({
										"type": "fax",
										"name": "Wahlkreisbüro",
										"address": _line.replace(/[^0-9]/g,'').replace(/^0/,'+49')
									});
								} else if (_line.match(/^0[0-9]+[0-9\/ ]+$/)) {
									/* phone */
									_data.kontakt.push({
										"type": "phone",
										"name": "Wahlkreisbüro",
										"address": _line.replace(/[^0-9]/g,'').replace(/^0/,'+49')
									});
								} else if (_line.match(/^(D-)?[0-9]{5} [^0-9]+$/i)) {
									/* address */
									_data.kontakt.push({
										"type": "address",
										"name": "Wahlkreisbüro",
										"address": (_lines[idx-1]+', '+_line)
									});
								} else if (_line.match(/\(at\)|@/i)) {
									/* email */
									_data.kontakt.push({
										"type": "email",
										"name": "Wahlkreisbüro",
										"address": _line.replace(/\s*\(at\)\s*/,'@')
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