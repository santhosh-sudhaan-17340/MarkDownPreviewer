const Match = require('../models/Match');
const MatchingEngine = require('../utils/matchingEngine');

// @desc    Find matches for current user
// @route   GET /api/matches/find
// @access  Private
exports.findMatches = async (req, res) => {
  try {
    const matches = await MatchingEngine.findMatches(req.user._id);

    // Create or update match records for top matches
    const matchRecords = [];

    for (const match of matches.slice(0, 10)) { // Top 10 matches
      for (const skillMatch of match.skillMatches) {
        // Check if match already exists
        let existingMatch = await Match.findOne({
          $or: [
            {
              'user1.userId': req.user._id,
              'user2.userId': match.user._id
            },
            {
              'user1.userId': match.user._id,
              'user2.userId': req.user._id
            }
          ],
          status: { $in: ['pending', 'accepted'] }
        });

        if (!existingMatch) {
          const newMatch = await Match.create({
            user1: {
              userId: req.user._id,
              skillOffered: skillMatch.teacher.toString() === req.user._id.toString()
                ? skillMatch.skill
                : '',
              skillWanted: skillMatch.learner.toString() === req.user._id.toString()
                ? skillMatch.skill
                : ''
            },
            user2: {
              userId: match.user._id,
              skillOffered: skillMatch.teacher.toString() === match.user._id.toString()
                ? skillMatch.skill
                : '',
              skillWanted: skillMatch.learner.toString() === match.user._id.toString()
                ? skillMatch.skill
                : ''
            },
            matchScore: match.matchScore
          });

          matchRecords.push(newMatch);
        } else {
          matchRecords.push(existingMatch);
        }
      }
    }

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's matches
// @route   GET /api/matches
// @access  Private
exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [
        { 'user1.userId': req.user._id },
        { 'user2.userId': req.user._id }
      ],
      status: { $in: ['pending', 'accepted'] },
      expiresAt: { $gt: new Date() }
    })
    .populate('user1.userId user2.userId', 'name email profileImage reputation')
    .sort({ matchScore: -1 });

    res.json({
      success: true,
      data: matches
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Accept a match
// @route   PUT /api/matches/:id/accept
// @access  Private
exports.acceptMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if user is part of this match
    if (
      match.user1.userId.toString() !== req.user._id.toString() &&
      match.user2.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Add user to acceptedBy array
    if (!match.acceptedBy.includes(req.user._id)) {
      match.acceptedBy.push(req.user._id);
    }

    // If both users accepted, mark as accepted
    if (match.acceptedBy.length === 2) {
      match.status = 'accepted';
    }

    await match.save();

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Decline a match
// @route   PUT /api/matches/:id/decline
// @access  Private
exports.declineMatch = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Check if user is part of this match
    if (
      match.user1.userId.toString() !== req.user._id.toString() &&
      match.user2.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    match.status = 'declined';
    await match.save();

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
