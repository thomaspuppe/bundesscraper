var colors = require("colors");

module.exports = { 

	debug: function ( msg ) {
		console.log( ('[debug] ' + msg).yellow );
	}

};