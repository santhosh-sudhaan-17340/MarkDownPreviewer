const Message = require('../models/message');
const User = require('../models/user');

module.exports.index = async function(req, res){
    try {
        // Get all users the current user has conversations with
        const messages = await Message.find({
            $or: [
                {sender: req.user._id},
                {receiver: req.user._id}
            ]
        })
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar')
        .sort('-createdAt');

        // Get unique users
        const conversationUsers = new Set();
        const conversationUsersArray = [];

        for(let message of messages){
            const otherUser = message.sender._id.toString() === req.user._id.toString()
                ? message.receiver
                : message.sender;

            if(!conversationUsers.has(otherUser._id.toString())){
                conversationUsers.add(otherUser._id.toString());
                conversationUsersArray.push(otherUser);
            }
        }

        return res.render('messages', {
            title: 'Messages',
            conversationUsers: conversationUsersArray
        });
    } catch(err){
        console.log('Error in fetching messages', err);
        return res.redirect('back');
    }
};

module.exports.conversation = async function(req, res){
    try {
        const otherUser = await User.findById(req.params.userId);

        if(!otherUser){
            req.flash('error', 'User not found');
            return res.redirect('back');
        }

        const messages = await Message.find({
            $or: [
                {sender: req.user._id, receiver: otherUser._id},
                {sender: otherUser._id, receiver: req.user._id}
            ]
        })
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar')
        .sort('createdAt');

        // Mark messages as read
        await Message.updateMany(
            {sender: otherUser._id, receiver: req.user._id, read: false},
            {read: true}
        );

        return res.render('conversation', {
            title: 'Conversation',
            otherUser: otherUser,
            messages: messages
        });
    } catch(err){
        console.log('Error in fetching conversation', err);
        return res.redirect('back');
    }
};

module.exports.send = async function(req, res){
    try {
        const message = await Message.create({
            sender: req.user._id,
            receiver: req.body.receiver,
            content: req.body.content
        });

        if(req.xhr){
            const populatedMessage = await message.populate('sender', 'name avatar');
            return res.json(200, {
                data: {
                    message: populatedMessage
                },
                message: 'Message sent!'
            });
        }

        req.flash('success', 'Message sent!');
        return res.redirect('back');
    } catch(err){
        console.log('Error in sending message', err);

        if(req.xhr){
            return res.json(500, {
                message: 'Error in sending message'
            });
        }

        req.flash('error', 'Error in sending message');
        return res.redirect('back');
    }
};
