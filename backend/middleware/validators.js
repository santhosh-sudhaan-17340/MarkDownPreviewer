const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

/**
 * Validation rules for user registration
 */
const validateRegistration = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('displayName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Display name must be less than 100 characters'),
    handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

/**
 * Validation rules for task completion
 */
const validateTaskCompletion = [
    body('taskId')
        .isUUID()
        .withMessage('Invalid task ID'),
    body('timeTaken')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Time taken must be a positive integer'),
    handleValidationErrors
];

/**
 * Validation rules for creating a task
 */
const validateCreateTask = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must be less than 2000 characters'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Category must be less than 50 characters'),
    body('difficulty')
        .isIn(['easy', 'medium', 'hard', 'expert'])
        .withMessage('Difficulty must be one of: easy, medium, hard, expert'),
    body('basePoints')
        .isInt({ min: 1, max: 10000 })
        .withMessage('Base points must be between 1 and 10000'),
    body('timeLimitMinutes')
        .optional()
        .isInt({ min: 1, max: 1440 })
        .withMessage('Time limit must be between 1 and 1440 minutes'),
    handleValidationErrors
];

/**
 * Validation rules for creating a friend group
 */
const validateCreateGroup = [
    body('name')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Group name must be between 3 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters'),
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean'),
    handleValidationErrors
];

/**
 * Validation rules for UUID parameters
 */
const validateUuidParam = (paramName) => [
    param(paramName)
        .isUUID()
        .withMessage(`Invalid ${paramName}`),
    handleValidationErrors
];

/**
 * Validation rules for pagination
 */
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

/**
 * Validation rules for date range
 */
const validateDateRange = [
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateRegistration,
    validateLogin,
    validateTaskCompletion,
    validateCreateTask,
    validateCreateGroup,
    validateUuidParam,
    validatePagination,
    validateDateRange
};
