const User = require('../../../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

module.exports.createSession = async function(req, res){
    try {
        const user = await User.findOne({email: req.body.email});

        if (!user) {
            return res.json(422, {
                message: "Invalid username or password"
            });
        }

        const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password);

        if (!isPasswordCorrect) {
            return res.json(422, {
                message: "Invalid username or password"
            });
        }

        return res.json(200, {
            message: 'Sign in successful, here is your token, please keep it safe!',
            data: {
                token: jwt.sign(user.toJSON(), process.env.JWT_SECRET, {expiresIn: '100000'})
            }
        });
    } catch(err){
        console.log('Error in creating session API', err);
        return res.json(500, {
            message: "Internal Server Error"
        });
    }
};
