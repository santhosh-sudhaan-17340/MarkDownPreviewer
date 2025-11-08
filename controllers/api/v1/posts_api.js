const Post = require('../../../models/post');
const Comment = require('../../../models/comment');

module.exports.index = async function(req, res){
    try {
        const posts = await Post.find({})
            .sort('-createdAt')
            .populate('user')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user'
                }
            });

        return res.json(200, {
            message: "List of posts",
            posts: posts
        });
    } catch(err){
        console.log('Error in fetching posts API', err);
        return res.json(500, {
            message: "Internal Server Error"
        });
    }
};

module.exports.destroy = async function(req, res){
    try {
        const post = await Post.findById(req.params.id);

        if(!post){
            return res.json(404, {
                message: 'Post not found'
            });
        }

        if(post.user == req.user.id){
            await Comment.deleteMany({post: req.params.id});
            await Post.deleteOne({_id: req.params.id});

            return res.json(200, {
                message: "Post and associated comments deleted successfully"
            });
        } else {
            return res.json(401, {
                message: "You cannot delete this post!"
            });
        }
    } catch(err){
        console.log('Error in deleting post API', err);
        return res.json(500, {
            message: "Internal Server Error"
        });
    }
};
