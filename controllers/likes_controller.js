const Like = require('../models/like');
const Post = require('../models/post');
const Comment = require('../models/comment');
const Notification = require('../models/notification');

module.exports.toggleLike = async function(req, res){
    try {
        // likes/toggle/?id=abcdef&type=Post
        const likeable = await (req.query.type === 'Post' ? Post : Comment).findById(req.query.id);

        if(!likeable){
            return res.json(400, {
                message: 'Invalid request'
            });
        }

        // Check if a like already exists
        const existingLike = await Like.findOne({
            likeable: req.query.id,
            onModel: req.query.type,
            user: req.user._id
        });

        if (existingLike){
            // If like exists, remove it (unlike)
            likeable.likes.pull(existingLike._id);
            await likeable.save();

            await Like.deleteOne({_id: existingLike._id});

            return res.json(200, {
                message: 'Like removed!',
                data: {
                    deleted: true
                }
            });
        } else {
            // Else make a new like
            const newLike = await Like.create({
                user: req.user._id,
                likeable: req.query.id,
                onModel: req.query.type
            });

            likeable.likes.push(newLike._id);
            await likeable.save();

            // Create notification
            let ownerId;
            if(req.query.type === 'Post'){
                ownerId = likeable.user;
            } else {
                ownerId = likeable.user;
            }

            if(ownerId.toString() !== req.user._id.toString()){
                await Notification.create({
                    user: ownerId,
                    fromUser: req.user._id,
                    type: 'like',
                    content: `${req.user.name} liked your ${req.query.type.toLowerCase()}`,
                    link: req.query.type === 'Post' ? '/' : '/',
                    relatedPost: req.query.type === 'Post' ? req.query.id : null,
                    relatedComment: req.query.type === 'Comment' ? req.query.id : null
                });
            }

            return res.json(200, {
                message: 'Like added!',
                data: {
                    deleted: false
                }
            });
        }
    } catch(err){
        console.log('Error in toggling like', err);
        return res.json(500, {
            message: 'Internal Server Error'
        });
    }
};
