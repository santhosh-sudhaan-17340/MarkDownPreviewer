const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Escrow Service for Time Credits
 * Manages locking, releasing, and refunding credits
 */

class EscrowService {
  /**
   * Lock credits in escrow when session is scheduled
   */
  static async lockCredits(fromUserId, toUserId, sessionId, amount) {
    const fromUser = await User.findById(fromUserId);

    if (!fromUser) {
      throw new Error('User not found');
    }

    if (fromUser.timeCredits < amount) {
      throw new Error('Insufficient credits');
    }

    // Deduct from available credits
    fromUser.timeCredits -= amount;
    fromUser.escrowedCredits += amount;
    await fromUser.save();

    // Create transaction record
    const transaction = await Transaction.create({
      from: fromUserId,
      to: toUserId,
      session: sessionId,
      amount,
      type: 'escrow',
      status: 'completed',
      description: `Locked ${amount} credits for session`
    });

    return transaction;
  }

  /**
   * Release credits from escrow when session is completed
   */
  static async releaseCredits(fromUserId, toUserId, sessionId, amount) {
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    if (!fromUser || !toUser) {
      throw new Error('User not found');
    }

    if (fromUser.escrowedCredits < amount) {
      throw new Error('Insufficient escrowed credits');
    }

    // Remove from escrow and transfer to recipient
    fromUser.escrowedCredits -= amount;
    toUser.timeCredits += amount;

    await fromUser.save();
    await toUser.save();

    // Create transaction record
    const transaction = await Transaction.create({
      from: fromUserId,
      to: toUserId,
      session: sessionId,
      amount,
      type: 'release',
      status: 'completed',
      description: `Released ${amount} credits for completed session`
    });

    return transaction;
  }

  /**
   * Refund credits from escrow when session is cancelled
   */
  static async refundCredits(userId, sessionId, amount) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.escrowedCredits < amount) {
      throw new Error('Insufficient escrowed credits');
    }

    // Return credits from escrow to available
    user.escrowedCredits -= amount;
    user.timeCredits += amount;
    await user.save();

    // Create transaction record
    const transaction = await Transaction.create({
      from: userId,
      to: userId,
      session: sessionId,
      amount,
      type: 'refund',
      status: 'completed',
      description: `Refunded ${amount} credits for cancelled session`
    });

    return transaction;
  }

  /**
   * Award bonus credits (e.g., for good reviews, referrals)
   */
  static async awardBonus(userId, amount, description) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    user.timeCredits += amount;
    await user.save();

    const transaction = await Transaction.create({
      from: userId, // System award
      to: userId,
      amount,
      type: 'bonus',
      status: 'completed',
      description
    });

    return transaction;
  }

  /**
   * Apply penalty (e.g., for no-shows, cancellations)
   */
  static async applyPenalty(userId, amount, description) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const actualPenalty = Math.min(user.timeCredits, amount);
    user.timeCredits -= actualPenalty;
    await user.save();

    const transaction = await Transaction.create({
      from: userId,
      to: userId, // System penalty
      amount: actualPenalty,
      type: 'penalty',
      status: 'completed',
      description
    });

    return transaction;
  }

  /**
   * Get user's transaction history
   */
  static async getTransactionHistory(userId, limit = 50) {
    const transactions = await Transaction.find({
      $or: [{ from: userId }, { to: userId }]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('from to session', 'name email');

    return transactions;
  }
}

module.exports = EscrowService;
