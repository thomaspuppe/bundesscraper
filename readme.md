# Bundesscraper

Scraping Data of Members of the German Federal Parliament.

## Current Status: 

Note: This fork is under development/WIP, as I am adapting it to my needs of bundestwitter.de. It works basically, but expect code to be commented out, paths to be hardcoded and heavy console outout.


## About

Bundesscraper collects data of German Parliament members from several Websites and combines them. The data is collected from

* [bundestag.de](http://www.bundestag.de/)
* [de.wikipedia.org](http://de.wikipedia.org/)
* [abgeordnetenwatch.de](http://www.abgeordnetenwatch.de/)
* [spdfraktion.de](http://www.spdfraktion.de/)
* [gruene-bundestag.de](http://www.gruene-bundestag.de/)
* [linksfraktion.de](http://www.linksfraktion.de/)
* [fdp-fraktion.de](http://www.fdp-fraktion.de/)
* [cducsu.de](http://www.cducsu.de/)

## Installation

````
npm -g install bundesscraper
````

## Usage

````
bundesscraper [-c] [-v] [-d] [data.json]
````

In case the complete/latest project is not installed globally, you can run a local ile:

````
node bundesscraper.js bundesscraper_2016-04-08.json
````



* `-c` `--cache` turn on caching, creates cache.json with unprocessed data
* `-v` `--verbose` show a lot of information
* `-d` `--debug` show a lot more information

## License

Bundesscraper is [Public Domain](./license.md).


## TODO: Add Sources

### Bundesfeeds, Wikidata

Bundesfeeds https://bundesfeeds.github.io/liste.html verlinkt eine Wikidata-Liste: https://docs.google.com/spreadsheets/d/1a1ETdLybypLHrR4GC4aap_3Cr5StIsX-hPAHiq9_hGM/edit#gid=0 . Und dort bei Wikidata (https://www.wikidata.org/wiki/Q2372488) stehen dann Twitter-Handle und Facebook-Id.

### Everypolitician

http://everypolitician.org/germany/bundestag/download.html, https://cdn.rawgit.com/everypolitician/everypolitician-data/1395c5973b01ed59bcd672d9b3988b1479f2c933/data/Germany/Bundestag/ep-popolo-v1.0.json
