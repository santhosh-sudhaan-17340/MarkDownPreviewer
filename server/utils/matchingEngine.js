const User = require('../models/User');

/**
 * Smart Matching Engine
 * Matches users based on:
 * - Skill compatibility (what they offer vs what others want)
 * - Reputation scores
 * - Availability overlap
 * - Activity level
 */

class MatchingEngine {
  /**
   * Find potential matches for a user
   * @param {String} userId - User ID to find matches for
   * @returns {Array} - Array of potential matches with scores
   */
  static async findMatches(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const allUsers = await User.find({
      _id: { $ne: userId },
      isActive: true
    });

    const matches = [];

    for (const candidate of allUsers) {
      const matchScore = this.calculateMatchScore(user, candidate);

      if (matchScore > 0) {
        matches.push({
          user: candidate,
          matchScore,
          skillMatches: this.findSkillMatches(user, candidate)
        });
      }
    }

    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches;
  }

  /**
   * Calculate match score between two users
   */
  static calculateMatchScore(user1, user2) {
    let score = 0;

    // 1. Skill Match Score (40 points max)
    const skillMatchScore = this.calculateSkillMatchScore(user1, user2);
    score += skillMatchScore * 40;

    // 2. Reputation Score (30 points max)
    const reputationScore = (user2.reputation.rating / 5) * 30;
    score += reputationScore;

    // 3. Availability Overlap (20 points max)
    const availabilityScore = this.calculateAvailabilityOverlap(user1, user2);
    score += availabilityScore * 20;

    // 4. Activity Level (10 points max)
    const activityScore = Math.min(user2.completedSessions / 10, 1) * 10;
    score += activityScore;

    return Math.round(score);
  }

  /**
   * Calculate how well skills match between two users
   */
  static calculateSkillMatchScore(user1, user2) {
    let matches = 0;
    let totalPossible = 0;

    // Check if user2 offers what user1 wants
    for (const wanted of user1.skillsWanted) {
      totalPossible++;
      const offered = user2.skillsOffered.find(s =>
        s.name.toLowerCase() === wanted.name.toLowerCase() &&
        s.category === wanted.category
      );
      if (offered) {
        matches += 1;
        // Bonus for level match
        if (wanted.level && offered.level === wanted.level) {
          matches += 0.2;
        }
      }
    }

    // Check if user1 offers what user2 wants (bidirectional match)
    for (const wanted of user2.skillsWanted) {
      totalPossible++;
      const offered = user1.skillsOffered.find(s =>
        s.name.toLowerCase() === wanted.name.toLowerCase() &&
        s.category === wanted.category
      );
      if (offered) {
        matches += 1;
        if (wanted.level && offered.level === wanted.level) {
          matches += 0.2;
        }
      }
    }

    return totalPossible > 0 ? matches / totalPossible : 0;
  }

  /**
   * Find specific skill matches between users
   */
  static findSkillMatches(user1, user2) {
    const matches = [];

    // What user2 can teach user1
    for (const wanted of user1.skillsWanted) {
      const offered = user2.skillsOffered.find(s =>
        s.name.toLowerCase() === wanted.name.toLowerCase() &&
        s.category === wanted.category
      );
      if (offered) {
        matches.push({
          skill: offered.name,
          category: offered.category,
          teacher: user2._id,
          learner: user1._id,
          level: offered.level
        });
      }
    }

    // What user1 can teach user2
    for (const wanted of user2.skillsWanted) {
      const offered = user1.skillsOffered.find(s =>
        s.name.toLowerCase() === wanted.name.toLowerCase() &&
        s.category === wanted.category
      );
      if (offered) {
        matches.push({
          skill: offered.name,
          category: offered.category,
          teacher: user1._id,
          learner: user2._id,
          level: offered.level
        });
      }
    }

    return matches;
  }

  /**
   * Calculate availability overlap between two users
   */
  static calculateAvailabilityOverlap(user1, user2) {
    if (!user1.availability.length || !user2.availability.length) {
      return 0;
    }

    let overlapCount = 0;
    const totalSlots = user1.availability.length;

    for (const slot1 of user1.availability) {
      const overlap = user2.availability.find(slot2 =>
        slot2.dayOfWeek === slot1.dayOfWeek &&
        this.timeRangesOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)
      );
      if (overlap) {
        overlapCount++;
      }
    }

    return overlapCount / totalSlots;
  }

  /**
   * Check if two time ranges overlap
   */
  static timeRangesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
  }
}

module.exports = MatchingEngine;
