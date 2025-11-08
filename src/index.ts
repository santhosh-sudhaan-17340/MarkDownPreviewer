import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import Database from './database/connection';

// Import routes
import subscriptionPlansRouter from './routes/subscriptionPlans';
import subscriptionsRouter from './routes/subscriptions';
import invoicesRouter from './routes/invoices';
import paymentsRouter from './routes/payments';
import couponsRouter from './routes/coupons';
import taxRulesRouter from './routes/taxRules';
import analyticsRouter from './routes/analytics';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'subscription-billing-platform'
    });
});

// API routes
app.use('/api/plans', subscriptionPlansRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/tax-rules', taxRulesRouter);
app.use('/api/analytics', analyticsRouter);

// Root endpoint with API documentation
app.get('/', (req: Request, res: Response) => {
    res.json({
        name: 'Subscription & Billing Management Platform',
        version: '1.0.0',
        description: 'Backend for managing subscription plans, trials, upgrades/downgrades, proration, invoices, and payments',
        endpoints: {
            plans: '/api/plans',
            subscriptions: '/api/subscriptions',
            invoices: '/api/invoices',
            payments: '/api/payments',
            coupons: '/api/coupons',
            tax_rules: '/api/tax-rules',
            analytics: '/api/analytics'
        },
        features: [
            'Monthly/Yearly subscription plans',
            'Trial period support',
            'Upgrade/Downgrade with proration',
            'Optimistic locking for concurrent updates',
            'Invoice generation',
            'Payment processing with retry logic',
            'Coupon code system',
            'Tax calculation engine',
            'Revenue analytics with SQL aggregation'
        ]
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: err.message
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Subscription & Billing Platform running on port ${PORT}`);
    console.log(`📊 API Documentation: http://localhost:${PORT}/`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await Database.getInstance().close();
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await Database.getInstance().close();
        process.exit(0);
    });
});

export default app;
