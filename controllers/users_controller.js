const User = require('../models/user');
const fs = require('fs');
const path = require('path');

module.exports.profile = async function(req, res){
    try {
        const user = await User.findById(req.params.id)
            .populate('friends')
            .populate('friendRequestsReceived')
            .populate('friendRequestsSent');

        const Post = require('../models/post');
        const posts = await Post.find({user: req.params.id})
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user'
                }
            })
            .populate({
                path: 'likes',
                populate: {
                    path: 'user'
                }
            })
            .sort('-createdAt');

        return res.render('user_profile', {
            title: 'User Profile',
            profile_user: user,
            posts: posts
        });
    } catch(err) {
        console.log('Error in finding user for profile', err);
        return res.redirect('back');
    }
};

module.exports.update = async function(req, res){
    if(req.params.id == req.user.id){
        try {
            const user = await User.findById(req.params.id);

            // Update fields
            user.name = req.body.name;
            user.bio = req.body.bio || '';
            user.city = req.body.city || '';
            user.relationship = req.body.relationship || '';

            // Handle avatar upload
            if(req.file){
                // Delete old avatar if it exists
                if(user.avatar){
                    const oldAvatarPath = path.join(__dirname, '..', user.avatar);
                    if(fs.existsSync(oldAvatarPath)){
                        fs.unlinkSync(oldAvatarPath);
                    }
                }
                user.avatar = '/uploads/users/avatars/' + req.file.filename;
            }

            await user.save();
            req.flash('success', 'Profile Updated Successfully!');
            return res.redirect('back');
        } catch(err) {
            console.log('Error in updating user', err);
            req.flash('error', 'Error in updating profile');
            return res.redirect('back');
        }
    } else {
        req.flash('error', 'Unauthorized!');
        return res.status(401).send('Unauthorized');
    }
};

// Render the sign up page
module.exports.signUp = function(req, res){
    if(req.isAuthenticated()){
        return res.redirect('/users/profile/' + req.user.id);
    }
    return res.render('user_sign_up', {
        title: "Codeial | Sign Up"
    });
};

// Render the sign in page
module.exports.signIn = function(req, res){
    if(req.isAuthenticated()){
        return res.redirect('/users/profile/' + req.user.id);
    }
    return res.render('user_sign_in', {
        title: "Codeial | Sign In"
    });
};

// Get the sign up data
module.exports.create = async function(req, res){
    if(req.body.password != req.body.confirm_password){
        req.flash('error', 'Passwords do not match');
        return res.redirect('back');
    }

    try {
        const user = await User.findOne({email: req.body.email});

        if(!user){
            await User.create(req.body);
            req.flash('success', 'Account created successfully! Please sign in.');
            return res.redirect('/users/sign-in');
        } else {
            req.flash('error', 'User already exists');
            return res.redirect('back');
        }
    } catch(err) {
        console.log('Error in creating user while signing up', err);
        req.flash('error', 'Error in signing up');
        return res.redirect('back');
    }
};

// Sign in and create a session for the user
module.exports.createSession = function(req, res){
    req.flash('success', 'Logged in Successfully');
    return res.redirect('/');
};

module.exports.destroySession = function(req, res){
    req.logout(function(err) {
        if (err) {
            console.log('Error in logging out', err);
            return res.redirect('back');
        }
        req.flash('success', 'You have logged out!');
        return res.redirect('/');
    });
};
