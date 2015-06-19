var _ = require('underscore'),
    https   = require('https'),
    request = require('request');

var defaultHost = 'api.mogreet.com',
	defaultMogreetMethod = 'system.ping',
	_requestDefaults = {
		url: defaultMogreetMethod
	};

function RestClient(cid, tkn, smsID, mmsID, options) {
    'use strict';
    //Required client config
    if (!cid || !tkn) {
        if (process.env.MOGREET_ACCOUNT_CID && process.env.MOGREET_AUTH_TOKEN) {
            this.accountCid = process.env.MOGREET_ACCOUNT_CID;
            this.authToken = process.env.MOGREET_AUTH_TOKEN;
        }
        else {
            throw 'RestClient requires an Account CID and Auth Token set explicitly or via the MOGREET_ACCOUNT_CID and MOGREET_AUTH_TOKEN environment variables.';
        }
    }
    else {
        //if auth token/CID passed in manually, trim spaces
        this.accountCid = cid.replace(/ /g,'');
        this.authToken = tkn.replace(/ /g,'');
    }

    if(!smsID || !mmsID) {
		if(process.env.MOGREET_SMS_CAMPAIGN_ID && process.env.MOGREET_MMS_CAMPAIGN_ID) {
			this.smsCampaignID = process.env.MOGREET_SMS_CAMPAIGN_ID;
			this.mmsCampaignID = process.env.MOGREET_MMS_CAMPAIGN_ID;
		} else {
			throw 'RestClient requires an SMS Campaign ID and MMS Campaign ID set explicitly or via the MOGREET_SMS_CAMPAIGN_ID and MOGREET_MMS_CAMPAIGN_ID environment variables.';
		}
	} else {
		this.smsCampaignID = smsID.replace(/ /g,'');
		this.mmsCampaignID = mmsID.replace(/ /g,'');
	}
    //Optional client config
    options = options || {};
    this.host = options.host || defaultHost;
}

RestClient.prototype.getBaseUrl = function () {
    'use strict';
    return 'https://' + this.host + '/moms/';
};

RestClient.prototype.getQuery = function(query) {
    'use strict';
	var qs = {
		'client_id': this.accountCid,
		token: this.authToken,
		format: 'json'
	};
	return _.extend(query, qs);
};

RestClient.prototype.request = function (options, callback) {
    'use strict';
    var client = this;

    //Prepare request options
	options.url     = client.getBaseUrl() + (options.url || defaultMogreetMethod);
	options.qs      = client.getQuery(options.qs || {});

    //Initiate HTTP request
    request(options, function (err, response, body) {
        if (callback) {
            var data = err || !body ? {} : body;

            //request doesn't think 4xx is an error - we want an error for any non-2xx status codes

            if (!err && (response.statusCode < 200 || response.statusCode > 206)) {
                err = data ? data : {
                    status: response.statusCode,
                    message:'HTTP request error, check response for more info'
                };
            }

            //process data and make available in a more JavaScripty format
            var processKeys = function(source) {
                if (_.isObject(source)) {
                    Object.keys(source).forEach(function(key) {

                        //Supplement underscore values with camel-case
                        if (key.indexOf('_') > 0) {
                            var cc = key.replace(/_([a-z])/g, function (g) {
                                return g[1].toUpperCase();
                            });
                            source[cc] = source[key];
                        }

                        //process any nested arrays...
                        if (Array.isArray(source[key])) {
                            source[key].forEach(processKeys);
                        }
                        else if (_.isObject(source[key])) {
                            processKeys(source[key]);
                        }
                    });

                    //Look for and convert date strings for specific keys
                    ['startDate', 'endDate', 'dateCreated', 'dateUpdated', 'startTime', 'endTime'].forEach(function(dateKey) {
                        if (source[dateKey]) {
                            source[dateKey] = new Date(source[dateKey]);
                        }
                    });
                }
            };
            processKeys(data);

            //hang response off the JSON-serialized data
            data.nodeClientResponse = response;

            callback.call(client, err, data, response);
        }
    });
};

RestClient.prototype.ping = function(options, callback) {
    'use strict';
	var client = this,
		opts = _.extend( _requestDefaults, options );
	return client.request(opts, callback);
};

RestClient.prototype.sendSms = function(options, callback) {
    'use strict';
	var client = this,
		opts = _.extend( {
			url: 'transaction.send'
		}, options);
    opts.qs = _.defaults(opts.qs || {}, {
        'campaign_id': this.smsCampaignID,
        to: null,
        message: null,
        callback: null
    });
	return client.request(opts, callback);
};

RestClient.prototype.sendMms = function(options, callback) {
    'use strict';
	var client = this,
		opts = _.extend( {
			url: 'transaction.send'
        }, options);
	opts.qs = _.defaults(opts.qs || {}, {
		'campaign_id': this.mmsCampaignID,
		to: null,
		message: null,
		'content_id': null,
        'content_url': null,
		callback: null
	});
	return client.request(opts, callback);
};

function initializer(sid, tkn, smsID, mmsID, options) {
    'use strict';
    return new RestClient(sid, tkn, smsID, mmsID, options);
}

initializer.RestClient = RestClient;

module.exports = initializer;
