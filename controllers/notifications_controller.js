const Notification = require('../models/notification');

module.exports.index = async function(req, res){
    try {
        const notifications = await Notification.find({user: req.user._id})
            .populate('fromUser', 'name avatar')
            .sort('-createdAt')
            .limit(50);

        return res.render('notifications', {
            title: 'Notifications',
            notifications: notifications
        });
    } catch(err){
        console.log('Error in fetching notifications', err);
        return res.redirect('back');
    }
};

module.exports.markRead = async function(req, res){
    try {
        await Notification.findByIdAndUpdate(req.params.id, {read: true});

        return res.json(200, {
            message: 'Notification marked as read'
        });
    } catch(err){
        console.log('Error in marking notification as read', err);
        return res.json(500, {
            message: 'Internal Server Error'
        });
    }
};

module.exports.markAllRead = async function(req, res){
    try {
        await Notification.updateMany(
            {user: req.user._id, read: false},
            {read: true}
        );

        req.flash('success', 'All notifications marked as read');
        return res.redirect('back');
    } catch(err){
        console.log('Error in marking all notifications as read', err);
        req.flash('error', 'Error in marking notifications as read');
        return res.redirect('back');
    }
};
