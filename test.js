/* global console */
var http = require('http'),
	client = require('./index')();

var port = parseInt(process.env.PORT, 10) || 5000,
	sendOpts = {
		qs: {
			to: '4438506036',
			message: 'Hello World MMS!!',
			'content_url': 'http://jobjybe-dashboard.herokuapp.com/images/logo.png'
		}
	},
	server = http.createServer(function (req, res) {
		'use strict';
		client.sendMms(sendOpts, function(err, data, response) {
			res.writeHead(200);
			if (err) {
				res.end('Bad mojo:' + err + response);
			}
			res.end(data);
		});
	}).listen(port);

server.on('listening', function() {
	'use strict';
	console.log('Server is listening on port ', port);
});

server.on('error', function(err) {
	'use strict';
	console.error(err);
	process.nextTick(function() {
		process.exit();
	});
});
