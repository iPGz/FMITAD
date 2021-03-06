var mongoUtil = require("./mongo");
var config = require("../../config.json");
var crypto = require("../lib/cryptoHelper");

/*
	Set up passport to use the stratgies. The stratgies should be setup using data from the config.json file
*/
module.exports = function(passport){

	var steamStrategy = require("../strategy/steamStrategy"),
		twitchStrategy = require("../strategy/twitchStrategy");

	//Define passport usage
	passport.use(new steamStrategy({
			returnURL: config.steam.redirect_uri,
			realm: "http://localhost/",
			apiKey: config.steam.api_key,
			passReqToCallback: true
		},
		// Executed when authorized
		function(req, identifier, profile, done){
			process.nextTick(function(){
				if (!req.user){
					return done("Not logged in!");
				}

				mongoUtil.findOne({ 'steam.id': profile.id }, function(err, doc){
					if (err || doc)
						return done( err || "Account already linked to " + doc.id); // If the account is linked

					var user = req.user;

					user.steam.id = profile.id;
					user.steam.username = profile.displayName;
					user.save(function(_err){
						if (_err)
							throw _err;
						console.log("Returning : " + JSON.stringify(user));
						return done(null, user);
					});

				});
			});
		}
	));
	passport.use(new twitchStrategy({
			clientID: config.twitch.client_id,
			clientSecret: config.twitch.client_secret,
			callbackURL: config.twitch.redirect_uri,
			scope: config.twitch.scope.join(" "),
			passReqToCallback: true
		}, function(req, accesstoken, refreshtoken, profile, done){
			process.nextTick(function(){
				if (!req.user){
					return done("Not logged in!");
				}

				mongoUtil.findOne({ 'twitch.id': profile.id }, function(err, doc){
					if (err || doc)
						return done( err || "Account already linked to " + doc.id); // If the account is linked

					var user = req.user;
					console.log("Twitch updating (" + accesstoken + "): "+ JSON.stringify(profile));

					user.twitch.token = crypto.encryptData(req.session.password + req.user.salt, accesstoken);
					user.twitch.id = profile.id;
					user.twitch.username = profile.username;

					user.save(function(err){
						if (err)
							throw new Error(err);

						done(null, user);
					});
				});
			});

		}
	));

	passport.serializeUser(function(user, done){
		done(null, user.id);
	});

	passport.deserializeUser(function(obj, done){
		mongoUtil.getModel("User").findOne({id: obj}, function(err, user){
			done (err, user);
		});
	});
};
