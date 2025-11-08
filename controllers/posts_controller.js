const Post = require('../models/post');
const Comment = require('../models/comment');
const Like = require('../models/like');
const Notification = require('../models/notification');
const fs = require('fs');
const path = require('path');

module.exports.create = async function(req, res){
    try {
        let post = await Post.create({
            content: req.body.content,
            user: req.user._id,
            privacy: req.body.privacy || 'public'
        });

        if (req.file) {
            post.image = '/uploads/posts/' + req.file.filename;
            await post.save();
        }

        if (req.xhr){
            // If we want to populate just the name of the user (we'll not want to send the password in the API), this is how we do it!
            post = await post.populate('user', 'name email avatar');

            return res.status(200).json({
                data: {
                    post: post
                },
                message: "Post created!"
            });
        }

        req.flash('success', 'Post published!');
        return res.redirect('back');
    } catch(err){
        console.log('Error in creating post', err);
        req.flash('error', 'Error in creating post');
        return res.redirect('back');
    }
};

module.exports.destroy = async function(req, res){
    try {
        const post = await Post.findById(req.params.id);

        if(!post){
            req.flash('error', 'Post not found');
            return res.redirect('back');
        }

        // .id means converting the object id into string
        if (post.user == req.user.id){
            // Delete the associated image file if exists
            if(post.image){
                const imagePath = path.join(__dirname, '..', post.image);
                if(fs.existsSync(imagePath)){
                    fs.unlinkSync(imagePath);
                }
            }

            // Delete all comments on this post
            await Comment.deleteMany({post: req.params.id});

            // Delete all likes on this post
            await Like.deleteMany({likeable: req.params.id, onModel: 'Post'});

            // Delete all notifications related to this post
            await Notification.deleteMany({relatedPost: req.params.id});

            await Post.deleteOne({_id: req.params.id});

            if (req.xhr){
                return res.status(200).json({
                    data: {
                        post_id: req.params.id
                    },
                    message: "Post deleted"
                });
            }

            req.flash('success', 'Post and associated comments deleted!');
            return res.redirect('back');
        } else {
            req.flash('error', 'You cannot delete this post!');
            return res.redirect('back');
        }
    } catch(err){
        console.log('Error in deleting post', err);
        req.flash('error', 'Error in deleting post');
        return res.redirect('back');
    }
};

module.exports.update = async function(req, res){
    try {
        const post = await Post.findById(req.params.id);

        if(!post){
            req.flash('error', 'Post not found');
            return res.redirect('back');
        }

        if (post.user == req.user.id){
            post.content = req.body.content;
            post.privacy = req.body.privacy || post.privacy;

            if (req.file) {
                // Delete old image if exists
                if(post.image){
                    const oldImagePath = path.join(__dirname, '..', post.image);
                    if(fs.existsSync(oldImagePath)){
                        fs.unlinkSync(oldImagePath);
                    }
                }
                post.image = '/uploads/posts/' + req.file.filename;
            }

            await post.save();

            req.flash('success', 'Post updated!');
            return res.redirect('back');
        } else {
            req.flash('error', 'You cannot update this post!');
            return res.redirect('back');
        }
    } catch(err){
        console.log('Error in updating post', err);
        req.flash('error', 'Error in updating post');
        return res.redirect('back');
    }
};
