const User = require('../models/user');
const Friendship = require('../models/friendship');
const Notification = require('../models/notification');

module.exports.sendRequest = async function(req, res){
    try {
        const toUser = await User.findById(req.params.id);

        if(!toUser){
            req.flash('error', 'User not found');
            return res.redirect('back');
        }

        // Check if already friends or request already sent
        const currentUser = await User.findById(req.user._id);

        if(currentUser.friends.includes(toUser._id)){
            req.flash('error', 'Already friends');
            return res.redirect('back');
        }

        if(currentUser.friendRequestsSent.includes(toUser._id)){
            req.flash('error', 'Friend request already sent');
            return res.redirect('back');
        }

        // Create friendship request
        await Friendship.create({
            from_user: req.user._id,
            to_user: toUser._id,
            status: 'pending'
        });

        // Update users
        currentUser.friendRequestsSent.push(toUser._id);
        toUser.friendRequestsReceived.push(req.user._id);

        await currentUser.save();
        await toUser.save();

        // Create notification
        await Notification.create({
            user: toUser._id,
            fromUser: req.user._id,
            type: 'friend_request',
            content: `${req.user.name} sent you a friend request`,
            link: `/users/profile/${req.user._id}`
        });

        req.flash('success', 'Friend request sent!');
        return res.redirect('back');
    } catch(err){
        console.log('Error in sending friend request', err);
        req.flash('error', 'Error in sending friend request');
        return res.redirect('back');
    }
};

module.exports.acceptRequest = async function(req, res){
    try {
        const fromUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if(!fromUser){
            req.flash('error', 'User not found');
            return res.redirect('back');
        }

        // Update friendship status
        await Friendship.findOneAndUpdate(
            {from_user: fromUser._id, to_user: currentUser._id},
            {status: 'accepted'}
        );

        // Add to friends list
        currentUser.friends.push(fromUser._id);
        fromUser.friends.push(currentUser._id);

        // Remove from requests
        currentUser.friendRequestsReceived.pull(fromUser._id);
        fromUser.friendRequestsSent.pull(currentUser._id);

        await currentUser.save();
        await fromUser.save();

        // Create notification
        await Notification.create({
            user: fromUser._id,
            fromUser: req.user._id,
            type: 'friend_accepted',
            content: `${req.user.name} accepted your friend request`,
            link: `/users/profile/${req.user._id}`
        });

        req.flash('success', 'Friend request accepted!');
        return res.redirect('back');
    } catch(err){
        console.log('Error in accepting friend request', err);
        req.flash('error', 'Error in accepting friend request');
        return res.redirect('back');
    }
};

module.exports.rejectRequest = async function(req, res){
    try {
        const fromUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if(!fromUser){
            req.flash('error', 'User not found');
            return res.redirect('back');
        }

        // Update friendship status
        await Friendship.findOneAndUpdate(
            {from_user: fromUser._id, to_user: currentUser._id},
            {status: 'rejected'}
        );

        // Remove from requests
        currentUser.friendRequestsReceived.pull(fromUser._id);
        fromUser.friendRequestsSent.pull(currentUser._id);

        await currentUser.save();
        await fromUser.save();

        req.flash('success', 'Friend request rejected!');
        return res.redirect('back');
    } catch(err){
        console.log('Error in rejecting friend request', err);
        req.flash('error', 'Error in rejecting friend request');
        return res.redirect('back');
    }
};

module.exports.removeFriend = async function(req, res){
    try {
        const friendUser = await User.findById(req.params.id);
        const currentUser = await User.findById(req.user._id);

        if(!friendUser){
            req.flash('error', 'User not found');
            return res.redirect('back');
        }

        // Remove from friends list
        currentUser.friends.pull(friendUser._id);
        friendUser.friends.pull(currentUser._id);

        await currentUser.save();
        await friendUser.save();

        // Delete friendship record
        await Friendship.deleteOne({
            $or: [
                {from_user: currentUser._id, to_user: friendUser._id},
                {from_user: friendUser._id, to_user: currentUser._id}
            ]
        });

        req.flash('success', 'Friend removed!');
        return res.redirect('back');
    } catch(err){
        console.log('Error in removing friend', err);
        req.flash('error', 'Error in removing friend');
        return res.redirect('back');
    }
};

module.exports.suggestions = async function(req, res){
    try {
        const currentUser = await User.findById(req.user._id).populate('friends');

        // Find users who are not friends and not current user
        const suggestions = await User.find({
            _id: {
                $nin: [...currentUser.friends.map(f => f._id), currentUser._id]
            }
        }).limit(10);

        return res.render('friend_suggestions', {
            title: 'Friend Suggestions',
            suggestions: suggestions
        });
    } catch(err){
        console.log('Error in getting friend suggestions', err);
        return res.redirect('back');
    }
};
