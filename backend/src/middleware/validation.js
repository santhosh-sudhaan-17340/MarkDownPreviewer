/**
 * Request Validation Middleware using Joi
 */

const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validate request against Joi schema
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            logger.warn('Validation error', { errors, body: req.body });

            return res.status(400).json({
                error: 'Validation error',
                details: errors,
            });
        }

        req.validatedBody = value;
        next();
    };
}

/**
 * Common validation schemas
 */
const schemas = {
    createSubscription: Joi.object({
        planId: Joi.string().uuid().required(),
        metadata: Joi.object().optional(),
    }),

    upgradeSubscription: Joi.object({
        newPlanId: Joi.string().uuid().required(),
    }),

    applyCoupon: Joi.object({
        couponCode: Joi.string().required(),
    }),

    processPayment: Joi.object({
        invoiceId: Joi.string().uuid().required(),
        paymentMethod: Joi.object({
            type: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'bank_transfer').required(),
            details: Joi.object().optional(),
        }).required(),
    }),

    createCoupon: Joi.object({
        code: Joi.string().min(3).max(50).required(),
        discountType: Joi.string().valid('percentage', 'fixed_amount').required(),
        discountValue: Joi.number().positive().required(),
        currency: Joi.string().length(3).optional(),
        validFrom: Joi.date().optional(),
        validUntil: Joi.date().greater(Joi.ref('validFrom')).optional(),
        maxRedemptions: Joi.number().integer().positive().optional(),
        maxRedemptionsPerUser: Joi.number().integer().positive().default(1),
        minimumAmount: Joi.number().min(0).optional(),
        firstTimeOnly: Joi.boolean().optional(),
        applicablePlanIds: Joi.array().items(Joi.string().uuid()).optional(),
        description: Joi.string().optional(),
    }),

    createTaxRule: Joi.object({
        countryCode: Joi.string().length(2).uppercase().required(),
        stateCode: Joi.string().max(10).optional(),
        taxName: Joi.string().required(),
        taxRate: Joi.number().min(0).max(100).required(),
        effectiveFrom: Joi.date().optional(),
        effectiveUntil: Joi.date().greater(Joi.ref('effectiveFrom')).optional(),
        appliesToShipping: Joi.boolean().optional(),
        inclusive: Joi.boolean().optional(),
        description: Joi.string().optional(),
    }),
};

module.exports = {
    validate,
    schemas,
};
