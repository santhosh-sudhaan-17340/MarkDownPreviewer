const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const crypto = require('crypto');
const User = require('../models/user');
require('dotenv').config();

// Tell passport to use a new strategy for Google login
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || 'dummy',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async function(accessToken, refreshToken, profile, done){
        try {
            // Find a user
            const user = await User.findOne({email: profile.emails[0].value}).exec();

            if (user) {
                // If found, set this user as req.user
                return done(null, user);
            } else {
                // If not found, create the user and set it as req.user
                const newUser = await User.create({
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    password: crypto.randomBytes(20).toString('hex')
                });

                return done(null, newUser);
            }
        } catch (err) {
            console.log('Error in Google Strategy-passport', err);
            return done(err, null);
        }
    }
));

module.exports = passport;
