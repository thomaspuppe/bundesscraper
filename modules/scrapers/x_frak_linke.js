fetch.frak_linke = function(_callback){

	var data = [];
	var base_url = "http://www.linksfraktion.de/abgeordnete/";

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

			$('.listenElement','#layoutHaupt').each(function(idx,e){
				
				_count_fetchable++;
				
				var _data = {
					name: $(this).find('a').eq(0).attr('title'),
					frak_url: url.resolve(base_url, $(this).find('a').eq(0).attr('href')),
					fotos: [{
						"url": $(this).find('img').attr('src'),
						"copyright": null
					}],
					web: [],
					kontakt: []
				}
				
				scraper.scrape({
					url: _data.frak_url.replace(/profil\/$/,'kontakt/'), 
					type: "html", 
					encoding: "utf8"
				}, function(err, $){
				
					_count_fetched++;
				
					if (err) {
						
						// err
						
					} else {
						
						$('.kontakt', '#spalte1').each(function(idx,e){
						
							var _name = $(this).find("[itemprop=name]").text();
						
							$(this).find("[itemprop=address]").each(function(idx,f){
							
								_data.kontakt.push({
									"type": "address",
									"name": _name,
									"address": $(f).find("[itemprop=street-address]").text()+', '+$(f).find("[itemprop=postal-code]").text()+' '+$(f).find("[itemprop=locality]").text()
								});
							
							});
						
							$(this).find("[itemprop=tel]").each(function(idx,f){
								_data.kontakt.push({
									"type": "phone",
									"name": _name,
									"address": $(f).text().replace(/[^0-9]/g,'').replace(/^0/,'+49')
								});
							});
						
							$(this).find("[itemprop=fax]").each(function(idx,f){
								_data.kontakt.push({
									"type": "fax",
									"name": _name,
									"address": $(f).text().replace(/[^0-9]/g,'').replace(/^0/,'+49')
								});
							});

							$(this).find("a.linkEmail").each(function(idx,f){
								_data.kontakt.push({
									"type": "email",
									"name": _name,
									"address": $(f).attr('href').replace(/^mailto:/g,'')
								});
							});
						
						});
					
						$('.inhaltElement.elemTeaser.extern', '#spalte2').each(function(idx,e){
							if ($(this).find('h3.kennung').length === 1 && $(this).find('h3.kennung').text() === "Linktipp") {
								_data.web.push({
									"service": "website",
									"url": $(this).find('a.extern').attr('href')
								});
							}
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