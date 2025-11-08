const Post = require('../models/post');
const User = require('../models/user');

module.exports.home = async function(req, res){
    try {
        // Get posts for the feed
        let posts = [];

        if (req.user) {
            // If user is logged in, show posts from friends and own posts
            const user = await User.findById(req.user._id).populate('friends');

            let friendIds = user.friends.map(friend => friend._id);
            friendIds.push(req.user._id);

            posts = await Post.find({
                user: { $in: friendIds }
            })
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
            .sort('-createdAt')
            .limit(50);
        } else {
            // If user is not logged in, show public posts
            posts = await Post.find({privacy: 'public'})
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
                .sort('-createdAt')
                .limit(20);
        }

        // Get all users for friend suggestions
        let users = await User.find({}).limit(10);

        return res.render('home', {
            title: "Codeial | Home",
            posts: posts,
            all_users: users
        });

    } catch(err) {
        console.log('Error', err);
        return res.status(500).send('Internal Server Error');
    }
};
