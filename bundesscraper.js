#!/usr/bin/env node

/* all the listeners! (trust me, it's gonna be ok) */
process.setMaxListeners(0);

/* require modules */
var fs = require("fs");
var path = require("path");
var url = require("url");

var colors = require("colors");
var scrapyard = require("scrapyard");
var moment = require("moment");
var ent = require("ent");
var xz = require("lzma-native");

var argv = require("optimist")
	.boolean(["c","d","z","t"])
	.alias("c","cache")
	.alias("d","debug")
	.alias("v","verbose")
	.alias("z","compress")
	.alias("t","timestamp")
	.alias("o","outdir")
	.argv;

var dbg = function( msg ) {
	console.log( ('[debug] ' + msg).yellow );
}

/* initialize scrapyard */
var scraper = new scrapyard({
	cache: './.storage', 
	debug: argv.d,
	timeout: 986400000,
	retries: 5,
	connections: 5 // don't increase, cducsu.de serves fake-404s without proper status code on higher connection-concurrency
});

/* configue moment */
moment.locale("de");

/* manual name translations, because some people can't decide how they want to be called */
var name_translations = {
	"Barbara Katharina Landgraf": "Katharina Landgraf",
	"Cajus Julius Caesar": "Cajus Caesar",
	"Christian von Stetten": "Christian Freiherr von Stetten",
	"Dirk Erik Fischer": "Dirk Fischer",
	"Dorothée Luise Menzner": "Dorothée Menzner",
	"Edmund Geisen": "Edmund Peter Geisen",
	"Elisabeth Paus": "Lisa Paus",
	"Erich Georg Fritz": "Erich Fritz",
	"Gabi Molitor": "Gabriele Molitor",
	"Gerd Friedrich Bollmann": "Gerd Bollmann",
	"Helmut Günter Baumann": "Günter Baumann",
	"Ingrid Remmers": "Ingrid Lieselotte Remmers",
	"Johann David Wadephul": "Johann Wadephul",
	"Josip Juratović": "Josip Juratovic",
	"Kai Boris Gehring": "Kai Gehring",
	"Klaus Peter Brähmig": "Klaus Brähmig",
	"Lars Friedrich Lindemann": "Lars Lindemann",
	"Luc Jochimsen": "Lukrezia Jochimsen",
	"Lukrezia Luise Jochimsen": "Lukrezia Jochimsen",
	"Maria Anna Klein Schmeink": "Maria Klein Schmeink",
	"Maximilian Lehmer": "Max Lehmer",
	"Memet Kılıç": "Memet Kilic",
	"Michael Georg Link": "Michael Link",
	"Michael Groß": "Michael Peter Groß",
	"Patrick Ernst Sensburg": "Patrick Sensburg",
	"Paul Georg Schäfer": "Paul Schäfer",
	"Sabine Stüber": "Sabine Ursula Stüber",
	"Sonja Steffen": "Sonja Amalie Steffen",
	"Ursula Lötzer": "Ulla Lötzer",
	"Veronika Maria Bellmann": "Veronika Bellmann",
	"Wolfgang Gehrcke Reymann": "Wolfgang Gehrcke",
	"Sevim Dagdelen": "Sevim Dağdelen",
	"Ulrich Wolfgang Kelber": "Ulrich Kelber",
	"Ute Finckh Krämer": "Ute Finckh-Krämer",
	"Aydan Özoguz": "Aydan Özoğuz",
	"Michaela Engelmeier-Heite": "Michaela Engelmeier",
	"Mark André Helfrich": "Mark Helfrich",
	"Charles M. Huber": "Karl-Heinz (Charles M.) Huber", // FIXME (pretentiousness overflow)
	"Philipp Graf von und zu Lerchenfeld": "Philipp Graf Lerchenfeld",
	"Elisabeth Charlotte Motschmann": "Elisabeth Motschmann",
	"Alois Georg Josef Rainer": "Alois Rainer",
	"Ursula Schauws": "Ulle Schauws",
	"Charles Huber": "Karl-Heinz (Charles M.) Huber", // FIXME (pretentiousness overflow)
	"Pia-Beate Zimmermann": "Pia Zimmermann",
	"Volker Michael Ullrich": "Volker Ullrich",
	"Matthias Birkwald": "Matthias W. Birkwald",
	"Ulrike Nissen": "Ulli Nissen",
	"Bernd Bernhard Fabritius": "Bernd Fabritius",
	"Chris Kühn": "Christian Kühn",
	"Artur Friedrich Auernhammer": "Artur Auernhammer",
	"Gudrun Anna Therese Zollner": "Gudrun Zollner"
};

/* global object for scrapers */
var fetch = {};

fetch.bt = function(_callback){
	console.log( 'fetch.bt () Start' );

};

var bundestagScraper = require('./modules/scrapers/bundestag');
fetch.bt = bundestagScraper.fetch;

var wikipediaScraper = require('./modules/scrapers/wikipedia');
fetch.wikipedia = wikipediaScraper.fetch;

var abgeordnetenwatchScraper = require('./modules/scrapers/abgeordnetenwatch');
fetch.agw = abgeordnetenwatchScraper.fetch;

// x_spd
// x_gruene
// x_linke
// x_cducsu

var fetch_all = function(_callback) {

	dbg('fetch_all()');

	var _passed = 0;
	var _data = {
		bt: null,
		wikipedia: null,
		agw: null,
		frak_spd: null,
		frak_gruene: null,
		frak_linke: null,
		frak_cducsu: null
	};
	
	//["bt","wikipedia","agw","frak_spd","frak_gruene","frak_linke","frak_cducsu"].forEach(function(_fetch){
	["bt","wikipedia"].forEach(function(_fetch){		
		if (argv.v) console.log('[init]'.magenta.inverse.bold, "scraper".cyan, _fetch.white);
		
		fetch[_fetch](function(err, data){
			_passed++;
			if (argv.v) console.log(((err)?'[fail]'.red:'[ ok ]'.green).inverse.bold, "scraper".cyan, _fetch.white);
			if (!err) {
				_data[_fetch] = data;
				dbg('fetch_' + _fetch + 'callback ( SUCCESS ):');
			} else {
				dbg('fetch_' + _fetch + 'callback ( ERROR )');
			}
			//if (_passed === 7) _callback(null, _data);
			if (_passed === 2) _callback(null, _data);
		});
		
	});
};

var name_simplify = function(_name) {
	return _name
		.replace(/(Prof\.|Dr\.|h\.\s?c\.|med\.|vet\.|rer\.|nat\.|pol\.|iur\.)\s?/g,'')
		.replace(/\s+[A-Za-z]\.\s+/,' ')
		.replace(/\s+/g,' ')
		.replace(/ [a-z]+ /g,' ')
		.replace(/ [a-z]+ /g,' ')
		.replace(/ Freiherr /g,' ')
		.replace(/-/g,' ')
		.replace(/Dipl\. Soz\.Wiss\. /, '')
		.replace(/\([^\)]+\) /,'')
		.replace(/\s+/g,' ')
		.replace(/^\s+|\s+$/g,'');
}

var array_intersect = function(a, b) {
	for (var i = 0; i < a.length; i++) {
		if (b.indexOf(a[i]) >= 0) return true;
	}
	return false;
}

var data_combine = function(_data, _callback){
	var data = [];

	if (_data.bt) {
		_data.bt.forEach(function(d){
			var _item = {
				data: {},
				compare: {
					name: [],
					kontakt: []
				}
			};
			_item.data.bt = d;
			d.aliases.forEach(function(i){
				_item.compare.name.push(i)
				_item.compare.name.push(name_simplify(i))
			});
			d.kontakt.forEach(function(i){
				if (["phone","email"].indexOf(i.type) >= 0) _item.compare.kontakt.push(i.address);
			});
			data.push(_item);
		});
	}
	
	/* find abgeordnetenwatch */
	if (_data.agw) {
		for (var i = 0; i < _data.agw.length; i++) {
			var _found = false;
			var _name = name_simplify(_data.agw[i].name)
			for (var j = 0; j < data.length; j++) {
				if ((data[j].compare.name.indexOf(_name) >= 0) || (data[j].compare.name.indexOf(name_translations[_name]) >= 0)) {
					var _found = true;
					data[j].data.agw = _data.agw[i];
					break;
				}
			}
			if (!_found && argv.v) console.log("[warn]".inverse.bold.yellow, "Not found:".yellow, _name.white, '(Abgeordnetenwatch)'.cyan);
		}
	}

	/* find wikipedia */
	if (_data.wikipedia) {
		dbg('combine data: Wikipedia ' + _data.wikipedia.length);
		for (var i = 0; i < _data.wikipedia.length; i++) {
			dbg('comparison in: ' + i);
			var _found = false;
			for (var j = 0; j < data.length; j++) {

				var name_from_data = data[j].compare.name,
					name_from_wikipedia = _data.wikipedia[i].name,
					name_from_translation = name_translations[name_from_wikipedia];

				//dbg('comparison try (' + j + ') ' + name_from_data + ' | ' + name_from_wikipedia + ' | ' + name_from_translation);

				if ((name_from_data.indexOf(name_from_wikipedia) >= 0) || (name_from_data.indexOf(name_from_translation) >= 0)) {
					//dbg('comparison OK');
					var _found = true;
					data[j].data.wikipedia = _data.wikipedia[i];
					break;
				} else {
					//dbg('comparison FAILED')
				}
			}
			if (!_found && argv.v) console.log("[warn]".inverse.bold.yellow, "Not found:".yellow, _data.wikipedia[i].name.white, '(Wikipedia)'.cyan);
		}
		//console.log(_data)
	}
	
	/* find spd */
	if (_data.frak_spd) {
		for (var i = 0; i < _data.frak_spd.length; i++) {
			var _name = name_simplify(_data.frak_spd[i].name)
			var _found = false;
			var _kontakt = [];
			_data.frak_spd[i].kontakt.forEach(function(_k){
				if (["phone","email"].indexOf(_k.type) >= 0) _kontakt.push(_k.address)
			});
			for (var j = 0; j < data.length; j++) {
				if ((data[j].compare.name.indexOf(_name) >= 0) || (data[j].compare.name.indexOf(name_translations[_name]) >= 0) || (array_intersect(_kontakt, data[j].compare.kontakt))) {
					var _found = true;
					data[j].data.frak_spd = _data.frak_spd[i];
					break;
				}
			}
			if (!_found && argv.v) console.log("[warn]".inverse.bold.yellow, "Not found:".yellow, _name.white, '(Fraktion SPD)'.cyan);
		}
	}

	/* find grüne */
	if (_data.frak_gruene) {
		for (var i = 0; i < _data.frak_gruene.length; i++) {
			var _name = name_simplify(_data.frak_gruene[i].name)
			var _found = false;
			var _kontakt = [];
			_data.frak_gruene[i].kontakt.forEach(function(_k){
				if (["phone","email"].indexOf(_k.type) >= 0) _kontakt.push(_k.address)
			});
			for (var j = 0; j < data.length; j++) {
				if ((data[j].compare.name.indexOf(_name) >= 0) || (data[j].compare.name.indexOf(name_translations[_name]) >= 0) || (array_intersect(_kontakt, data[j].compare.kontakt))) {
					var _found = true;
					data[j].data.frak_gruene = _data.frak_gruene[i];
					break;
				}
			}
			if (!_found && argv.v) console.log("[warn]".inverse.bold.yellow, "Not found:".yellow, _name.white, '(Fraktion Grüne)'.cyan);
		}
	}
	
	/* find linke */
	if (_data.frak_linke) {
		for (var i = 0; i < _data.frak_linke.length; i++) {
			var _name = name_simplify(_data.frak_linke[i].name)
			var _found = false;
			var _kontakt = [];
			_data.frak_linke[i].kontakt.forEach(function(_k){
				if (["phone","email"].indexOf(_k.type) >= 0) _kontakt.push(_k.address)
			});
			for (var j = 0; j < data.length; j++) {
				if ((data[j].compare.name.indexOf(_name) >= 0) || (data[j].compare.name.indexOf(name_translations[_name]) >= 0) || (array_intersect(_kontakt, data[j].compare.kontakt))) {
					var _found = true;
					data[j].data.frak_linke = _data.frak_linke[i];
					break;
				}
			}
			if (!_found && argv.v) console.log("[warn]".inverse.bold.yellow, "Not found:".yellow, _name.white, '(Fraktion Linke)'.cyan);
		}
	}

	/* find cdu/csu */
	if (_data.frak_cducsu) {
		for (var i = 0; i < _data.frak_cducsu.length; i++) {
			var _name = name_simplify(_data.frak_cducsu[i].name)
			var _found = false;
			var _kontakt = [];
			_data.frak_cducsu[i].kontakt.forEach(function(_k){
				if (["phone","email"].indexOf(_k.type) >= 0) _kontakt.push(_k.address)
			});
			for (var j = 0; j < data.length; j++) {
				if ((data[j].compare.name.indexOf(_name) >= 0) || (data[j].compare.name.indexOf(name_translations[_name]) >= 0) || (array_intersect(_kontakt, data[j].compare.kontakt))) {
					var _found = true;
					data[j].data.frak_cducsu = _data.frak_cducsu[i];
					break;
				}
			}
			if (!_found && argv.v) console.log("[warn]".inverse.bold.yellow, "Not found:".yellow, _name.white, '(Fraktion CDU/CSU)'.cyan);
		}
	}

	_callback(null, data);

};

var data_unify = function(_data, _callback){

	var data = [];
	
	_data.forEach(function(item){
		
		var _data = {
			name: item.data.bt.name,
			fraktion: item.data.bt.fraktion,
			ausschuesse: item.data.bt.ausschuesse,
			aliases: item.data.bt.aliases,
			fotos: item.data.bt.fotos,
			kontakt: item.data.bt.kontakt,
			web: item.data.bt.web,
			wahl: {
				wahlkreis_id: null,
				wahlkreis_name: null,
				bundesland: null,
				mandat: item.data.bt.mandat,
				liste: item.data.bt.landesliste,
				listenplatz: null,
				ergebnis: null
			},
			meta: {
				beruf: null,
				wohnort: null,
				geburtsdatum: null,
				geburtsort: null,
				geschlecht: 'u',
				btcert: {
					uid: item.data.bt.btcertuid,
					vorname: item.data.bt.vorname,
					nachname: item.data.bt.nachname 
				}
			}
		};
		
		/* wahlkreis */
		if (item.data.bt.wahlkreis) {
			var _wahlkreis = item.data.bt.wahlkreis.match(/^Wahlkreis ([0-9]+): (.*)$/);
			if (_wahlkreis) {
				_data.wahl.wahlkreis_id = _wahlkreis[1];
				_data.wahl.wahlkreis_name = _wahlkreis[2];
			}
		}
		
		/* url */
		_data.web.push({
			service: "bundestag",
			url: item.data.bt.url
		});
		
		/* abgeordnetenwatch */
		
		/* name */
		if (item.data.hasOwnProperty("agw")) {
			
			if (_data.aliases.indexOf(item.data.agw.name) < 0) _data.aliases.push(item.data.agw.name);

			/* url */
			_data.web.push({
				service: "agw",
				url: item.data.agw.agw_url
			});
		
			/* fotos */
			item.data.agw.fotos.forEach(function(foto){
				_data.fotos.push(foto);
			});
		
			/* wahl */
			if ("liste" in item.data.agw && item.data.agw.liste !== null) _data.wahl.liste = item.data.agw.liste;
			if ("listenplatz" in item.data.agw && item.data.agw.listenplatz !== null) _data.wahl.listenplatz = item.data.agw.listenplatz;
			if ("wahlergebnis" in item.data.agw && item.data.agw.wahlergebnis !== null) _data.wahl.ergebnis = item.data.agw.wahlergebnis;

			/* meta */
			if ("geburtsdatum" in item.data.agw && item.data.agw.geburtsdatum !== null && item.data.agw.geburtsdatum.match(/^(0[1-9]|[1-2][0-9]|30|31)\.(0[1-9]|10|11|12)\.(19|20)[0-9]{2}$/)) _data.meta.geburtsdatum = moment(item.data.agw.geburtsdatum, "DD.MM.YYYY").format("YYYY-MM-DD");
			if ("beruf" in item.data.agw && item.data.agw.beruf !== null) _data.meta.beruf = item.data.agw.beruf;
			if ("wohnort" in item.data.agw && item.data.agw.wohnort !== null) _data.meta.wohnort = item.data.agw.wohnort;
			
		} else {
//			if (argv.v) console.log("[warn]".inverse.bold.yellow, "No Data for:".yellow, _data.name.white, '(Abgeordnetenwatch)'.cyan);
		}

		/* wikipedia */
		if (item.data.hasOwnProperty("wikipedia")) {

			/* name */
			if (_data.aliases.indexOf(item.data.wikipedia.name) < 0) _data.aliases.push(item.data.wikipedia.name);

			/* fotos */
			item.data.wikipedia.fotos.forEach(function(foto){
				_data.fotos.push(foto);
			});

			/* url */
			_data.web.push({
				service: "wikipedia",
				url: item.data.wikipedia.wikipedia_url
			});
		
			/* links */
			item.data.wikipedia.links.forEach(function(link){
				var _url = url.parse(link.url);
				if ("hostname" in _url) {
					if (link.url.match(/^http:\/\/(www\.)?bundestag\.de\/bundestag\/abgeordnete17\/biografien\//)) {
						_data.web.push({
							service: "bundestag",
							url: link.url
						});
					} else if (link.url.match(/^http:\/\/(www\.)?abgeordnetenwatch\.de\/([a-zA-Z0-9\_]+)-575-([0-9]+).html$/)) {
						_data.web.push({
							service: "agw",
							url: link.url
						});
					} else {
						// FIXME: fraktionen, xing, twitter, facebook, meinvz, dnb
						_data.web.push({
							service: "unknown",
							title: link.text,
							url: link.url
						});
					}
				
				}
			});
			
			/* geschlecht */
			if (typeof item.data.wikipedia.gender !== "undefined") {
				_data.meta.geschlecht = item.data.wikipedia.gender;
			}
			
			if (_data.meta.geburtsort === null && item.data.wikipedia.geburtsort !== null) {
				_data.meta.geburtsort = item.data.wikipedia.geburtsort;
			}

			if (_data.meta.geburtsdatum === null && item.data.wikipedia.geburtsdatum !== null) {
				_data.meta.geburtsdatum = moment(item.data.wikipedia.geburtsdatum, 'D. MMMM YYYY').format("YYYY-MM-DD");
			}

			if (_data.wahl.bundesland === null && item.data.wikipedia.bundesland !== null) {
				_data.wahl.bundesland = item.data.wikipedia.bundesland;
			}
		
		} else {
//			if (argv.v) console.log("[warn]".inverse.bold.yellow, "No Data for:".yellow, _data.name.white, '(Wikipedia)'.cyan);
		}

		/* spd */
		if ("frak_spd" in item.data) {
			
			/* name */
			if (_data.aliases.indexOf(item.data.frak_spd.name) < 0) _data.aliases.push(item.data.frak_spd.name);

			/* url */
			_data.web.push({
				service: "fraktion",
				url: item.data.frak_spd.frak_url
			});

			/* fotos */
			item.data.frak_spd.fotos.forEach(function(foto){
				_data.fotos.push(foto);
			});

			/* kontakt */
			item.data.frak_spd.kontakt.forEach(function(kontakt){
				_data.kontakt.push(kontakt);
			});
			
			/* web */
			item.data.frak_spd.web.forEach(function(web){
				_data.web.push(web);
			});
			
			/* beruf */
			if (_data.meta.beruf === null && item.data.frak_spd.beruf !== null) {
				_data.meta.beruf = item.data.frak_spd.beruf;
			} 

			if (_data.wahl.liste === null || _data.wahl.liste === "&uuml;ber Liste eingezogen") {
				_data.wahl.liste = item.data.frak_spd.liste;
			} else {
				if (_data.wahl.liste !== item.data.frak_spd.liste) {
					if (argv.v) console.log("[warn]".inverse.bold.yellow, "List mismatch:".yellow, _data.wahl.liste.white, "<>".red, item.data.frak_spd.liste.white, _data.name.cyan, '(Fraktion SPD)'.cyan);
				}
			}
			
			if (item.data.frak_spd.wahlkreis !== ' - ' && _data.wahl.wahlkreis_id === null) {
				_data.wahl.wahlkreis_id = item.data.frak_spd.wahlkreis.replace(/^.*\[([0-9]+)\]$/,'$1');
			}
			
		}
		
		/* gruene */
		if ("frak_gruene" in item.data) {
						
			/* name */
			if (_data.aliases.indexOf(item.data.frak_gruene.name) < 0) _data.aliases.push(item.data.frak_gruene.name);

			/* url */
			_data.web.push({
				service: "fraktion",
				url: item.data.frak_gruene.frak_url
			});

			/* fotos */
			item.data.frak_gruene.fotos.forEach(function(foto){
				_data.fotos.push(foto);
			});

			/* kontakt */
			item.data.frak_gruene.kontakt.forEach(function(kontakt){
				_data.kontakt.push(kontakt);
			});
			
			/* web */
			item.data.frak_gruene.web.forEach(function(web){
				_data.web.push(web);
			});
			
			/* wahlkreis */
			if (item.data.frak_gruene.wahlkreis !== undefined && _data.wahl.wahlkreis_id === null) {
				var _wahlkreis = item.data.frak_gruene.wahlkreis.match(/^Wahlkreis ([0-9]+): (.*)$/);
				if (_wahlkreis) {
					_data.wahl.wahlkreis_id = _wahlkreis[1];
					_data.wahl.wahlkreis_name = _wahlkreis[2];
				}
			}
			
		}

		/* linke */
		if ("frak_linke" in item.data) {

			/* name */
			if (_data.aliases.indexOf(item.data.frak_linke.name) < 0) _data.aliases.push(item.data.frak_linke.name);

			/* url */
			_data.web.push({
				service: "fraktion",
				url: item.data.frak_linke.frak_url
			});

			/* fotos */
			item.data.frak_linke.fotos.forEach(function(foto){
				_data.fotos.push(foto);
			});

			/* kontakt */
			item.data.frak_linke.kontakt.forEach(function(kontakt){
				_data.kontakt.push(kontakt);
			});

			/* web */
			item.data.frak_linke.web.forEach(function(web){
				_data.web.push(web);
			});

		}
		
		/* cducsu */
		if ("frak_cducsu" in item.data) {
			
			/* name */
			if (_data.aliases.indexOf(item.data.frak_cducsu.name) < 0) _data.aliases.push(item.data.frak_cducsu.name);

			/* url */
			_data.web.push({
				service: "fraktion",
				url: item.data.frak_cducsu.frak_url
			});

			/* fotos */
			item.data.frak_cducsu.fotos.forEach(function(foto){
				_data.fotos.push(foto);
			});

			/* kontakt */
			item.data.frak_cducsu.kontakt.forEach(function(kontakt){
				_data.kontakt.push(kontakt);
			});

			/* web */
			item.data.frak_cducsu.web.forEach(function(web){
				_data.web.push(web);
			});

			/* beruf */
			if (_data.meta.beruf === null && item.data.frak_cducsu.beruf !== null) {
				_data.meta.beruf = item.data.frak_cducsu.beruf;
			} 

			/* mandat */
			if (_data.wahl.mandat === null && item.data.frak_cducsu.mandat !== null) {
				_data.wahl.mandat = item.data.frak_cducsu.mandat;
			} 

			/* wahlkreis */
			if (("wahlkreis" in item.data.frak_cducsu) && _data.wahl.wahlkreis_id === null) {
				_data.wahl.wahlkreis_id = item.data.frak_cducsu.wahlkreis;
			}
			
			/* geburtsdatum */
			if (_data.meta.geburtsdatum === null && "geburtsdatum" in item.data.frak_cducsu && item.data.frak_cducsu.geburtsdatum !== null) {
				_data.meta.geburtsdatum = moment(item.data.frak_cducsu.geburtsdatum, "DD.MM.YYYY").format("YYYY-MM-DD");
			}
			
			/* geburtsort */
			if (_data.meta.geburtsort === null && "geburtsort" in item.data.frak_cducsu && item.data.frak_cducsu.geburtsort !== null) {
				_data.meta.geburtsort = item.data.frak_cducsu.geburtsort;
			}
			
		}
		
		data.push(_data);
		
	});
	
	_callback(null, data);
	
};

var load_data = function(_callback) {
	dbg('load_data() Uncached');
	var cache_file = path.resolve(__dirname, 'cache.json');
	if (argv.c && fs.existsSync(cache_file)) {
		dbg('load_data CACHED !');
		_callback(null, JSON.parse(fs.readFileSync(cache_file)))
	} else {
		fetch_all(function(err, data){

			if (err) {
				dbg('fetch_all callback ( ERROR )');
			} else {
				dbg('fetch_all callback ()');
			}
/* DISABLE I/O
			fs.writeFileSync(cache_file, JSON.stringify(data, null, '\t'));
*/
			_callback(null, data);
		});
	}
}

var main = function(){
	dbg('main()');
	load_data(function(err, data){
		
		if (err) {
			dbg('load_data callback ( ERROR )');
		} else {
			dbg('load_data callback ()');
		}

		if (argv.v) console.log('[stat]'.magenta.inverse.bold, "all data loaded".white);

		data_combine(data, function(err, data){
			data_unify(data, function(err, data){
				if (argv.v) console.log('[stat]'.magenta.inverse.bold, "all data combined".white);

				var out_file = (argv._.length > 0) ? argv._[0] : 'data.json';
				if (argv.t) out_file = "bundesscraper."+moment().format("YYYY-MM-DD")+".json";
				if (argv.z) out_file += ".xz";
				out_file = path.resolve((argv.o || __dirname), out_file);

				// TODO: fix this, make the path relative
				var out_file = "/var/www/bundesscraper/bundesscraper_" + moment().format("YYYY-MM-DD") + ".json";
				fs.writeFileSync(out_file, JSON.stringify(data, null, '\t'));
				console.log('[save]'.magenta.inverse.bold, path.basename(out_file).white);
				process.exit();

/* DISABLE I/O
				if (argv.z) {
					var compressor = new xz.Compressor(9);
					compressor.pipe(fs.createWriteStream(out_file).on("finish", function(){
						if (argv.v) console.log('[save]'.magenta.inverse.bold, path.basename(out_file).white);
						if (argv.v) console.log("<3".bold.magenta, 'made with datalove'.magenta);
						process.exit();
					}));
					compressor.write(JSON.stringify(data,null,"\t"));
					compressor.end();
				} else {
					fs.writeFileSync(out_file, JSON.stringify(data, null, '\t'));
					if (argv.v) console.log('[save]'.magenta.inverse.bold, path.basename(out_file).white);
					if (argv.v) console.log("<3".bold.magenta, 'made with datalove'.magenta);
					process.exit();
				}
*/
			});
		});
	});
};

/* execute */
main();
