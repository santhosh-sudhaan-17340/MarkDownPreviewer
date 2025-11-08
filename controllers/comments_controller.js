const Comment = require('../models/comment');
const Post = require('../models/post');
const Like = require('../models/like');
const Notification = require('../models/notification');

module.exports.create = async function(req, res){
    try {
        const post = await Post.findById(req.body.post);

        if (post){
            let comment = await Comment.create({
                content: req.body.content,
                post: req.body.post,
                user: req.user._id,
                parentComment: req.body.parentComment || null
            });

            post.comments.push(comment);
            await post.save();

            // If it's a reply to another comment, add it to the parent comment's replies
            if(req.body.parentComment){
                const parentComment = await Comment.findById(req.body.parentComment);
                if(parentComment){
                    parentComment.replies.push(comment);
                    await parentComment.save();
                }
            }

            // Create notification for post owner
            if(post.user.toString() !== req.user._id.toString()){
                await Notification.create({
                    user: post.user,
                    fromUser: req.user._id,
                    type: 'comment',
                    content: `${req.user.name} commented on your post`,
                    link: `/users/profile/${post.user}`,
                    relatedPost: post._id,
                    relatedComment: comment._id
                });
            }

            comment = await comment.populate('user', 'name email avatar');

            if (req.xhr){
                return res.status(200).json({
                    data: {
                        comment: comment
                    },
                    message: "Comment created!"
                });
            }

            req.flash('success', 'Comment published!');
            return res.redirect('/');
        }
    } catch(err){
        console.log('Error in creating comment', err);
        req.flash('error', 'Error in adding comment');
        return res.redirect('back');
    }
};

module.exports.destroy = async function(req, res){
    try {
        const comment = await Comment.findById(req.params.id);

        if(!comment){
            req.flash('error', 'Comment not found');
            return res.redirect('back');
        }

        if (comment.user == req.user.id){
            const postId = comment.post;

            // Delete all replies to this comment
            await Comment.deleteMany({parentComment: req.params.id});

            // Delete all likes on this comment
            await Like.deleteMany({likeable: req.params.id, onModel: 'Comment'});

            // Delete notifications
            await Notification.deleteMany({relatedComment: req.params.id});

            await Comment.deleteOne({_id: req.params.id});

            // Remove comment from post
            await Post.findByIdAndUpdate(postId, { $pull: {comments: req.params.id}});

            if (req.xhr){
                return res.status(200).json({
                    data: {
                        comment_id: req.params.id
                    },
                    message: "Comment deleted"
                });
            }

            req.flash('success', 'Comment deleted!');
            return res.redirect('back');
        } else {
            req.flash('error', 'Unauthorized');
            return res.redirect('back');
        }
    } catch(err){
        console.log('Error in deleting comment', err);
        req.flash('error', 'Error in deleting comment');
        return res.redirect('back');
    }
};
