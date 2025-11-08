-- Seed Data for Subscription & Billing Platform
-- Sample data for testing and development

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================

INSERT INTO subscription_plans (id, name, description, billing_cycle, price, currency, trial_days, features, is_active, display_order) VALUES
-- Monthly Plans
('550e8400-e29b-41d4-a716-446655440001', 'Basic', 'Perfect for individuals getting started', 'monthly', 9.99, 'USD', 14,
    '{"max_documents": 10, "max_storage_gb": 1, "export_pdf": true, "export_html": true, "priority_support": false}',
    true, 1),
('550e8400-e29b-41d4-a716-446655440002', 'Pro', 'For professionals who need more', 'monthly', 29.99, 'USD', 14,
    '{"max_documents": 100, "max_storage_gb": 10, "export_pdf": true, "export_html": true, "priority_support": true, "custom_themes": true}',
    true, 2),
('550e8400-e29b-41d4-a716-446655440003', 'Enterprise', 'For teams and organizations', 'monthly', 99.99, 'USD', 30,
    '{"max_documents": -1, "max_storage_gb": 100, "export_pdf": true, "export_html": true, "priority_support": true, "custom_themes": true, "api_access": true, "sso": true}',
    true, 3),

-- Yearly Plans (with discount)
('550e8400-e29b-41d4-a716-446655440004', 'Basic', 'Perfect for individuals getting started - Save 20%', 'yearly', 95.90, 'USD', 14,
    '{"max_documents": 10, "max_storage_gb": 1, "export_pdf": true, "export_html": true, "priority_support": false}',
    true, 4),
('550e8400-e29b-41d4-a716-446655440005', 'Pro', 'For professionals who need more - Save 20%', 'yearly', 287.90, 'USD', 14,
    '{"max_documents": 100, "max_storage_gb": 10, "export_pdf": true, "export_html": true, "priority_support": true, "custom_themes": true}',
    true, 5),
('550e8400-e29b-41d4-a716-446655440006', 'Enterprise', 'For teams and organizations - Save 20%', 'yearly', 959.90, 'USD', 30,
    '{"max_documents": -1, "max_storage_gb": 100, "export_pdf": true, "export_html": true, "priority_support": true, "custom_themes": true, "api_access": true, "sso": true}',
    true, 6);

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================

INSERT INTO users (id, email, password_hash, full_name, created_at, last_login_at) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'alice@example.com', '$2b$10$rZ3h.vJKGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYG', 'Alice Johnson', '2024-01-15 10:00:00', '2024-11-08 09:30:00'),
('650e8400-e29b-41d4-a716-446655440002', 'bob@example.com', '$2b$10$rZ3h.vJKGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYG', 'Bob Smith', '2024-02-20 14:30:00', '2024-11-07 16:45:00'),
('650e8400-e29b-41d4-a716-446655440003', 'charlie@example.com', '$2b$10$rZ3h.vJKGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYG', 'Charlie Davis', '2024-03-10 09:15:00', '2024-11-08 08:00:00'),
('650e8400-e29b-41d4-a716-446655440004', 'diana@example.com', '$2b$10$rZ3h.vJKGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYG', 'Diana Prince', '2024-04-05 11:20:00', '2024-11-06 12:30:00'),
('650e8400-e29b-41d4-a716-446655440005', 'evan@example.com', '$2b$10$rZ3h.vJKGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYGKFfJ5KF5K5K5uYG', 'Evan Martinez', '2024-05-12 15:45:00', '2024-11-08 10:15:00');

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, trial_end, price, currency, version) VALUES
-- Alice - Active Pro Monthly (in trial)
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'trial',
    '2024-10-25 10:00:00', '2024-11-25 10:00:00', '2024-11-08 10:00:00', 29.99, 'USD', 0),

-- Bob - Active Basic Monthly
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'active',
    '2024-10-20 14:30:00', '2024-11-20 14:30:00', NULL, 9.99, 'USD', 2),

-- Charlie - Active Enterprise Yearly
('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440006', 'active',
    '2024-03-10 09:15:00', '2025-03-10 09:15:00', NULL, 959.90, 'USD', 1),

-- Diana - Canceled (cancel at period end)
('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'active',
    '2024-10-05 11:20:00', '2024-11-05 11:20:00', NULL, 29.99, 'USD', 1),

-- Evan - Past Due
('750e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'past_due',
    '2024-10-12 15:45:00', '2024-11-12 15:45:00', NULL, 9.99, 'USD', 0);

UPDATE subscriptions SET cancel_at_period_end = true, canceled_at = '2024-10-28 14:30:00'
WHERE id = '750e8400-e29b-41d4-a716-446655440004';

-- ============================================================================
-- SUBSCRIPTION HISTORY
-- ============================================================================

INSERT INTO subscription_history (subscription_id, user_id, action, from_plan_id, to_plan_id, old_price, new_price, proration_amount, created_at) VALUES
('750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'created', NULL, '550e8400-e29b-41d4-a716-446655440002', NULL, 29.99, 0, '2024-10-25 10:00:00'),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'created', NULL, '550e8400-e29b-41d4-a716-446655440001', NULL, 9.99, 0, '2024-02-20 14:30:00'),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'upgraded', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 9.99, 29.99, 13.33, '2024-08-25 10:15:00'),
('750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'downgraded', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 29.99, 9.99, -10.00, '2024-09-15 11:00:00'),
('750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', 'created', NULL, '550e8400-e29b-41d4-a716-446655440006', NULL, 959.90, 0, '2024-03-10 09:15:00'),
('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 'created', NULL, '550e8400-e29b-41d4-a716-446655440002', NULL, 29.99, 0, '2024-04-05 11:20:00'),
('750e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', 'canceled', '550e8400-e29b-41d4-a716-446655440002', NULL, 29.99, NULL, 0, '2024-10-28 14:30:00');

-- ============================================================================
-- INVOICES
-- ============================================================================

INSERT INTO invoices (id, invoice_number, user_id, subscription_id, status, subtotal, tax_amount, discount_amount, total, amount_due, amount_paid, invoice_date, due_date, paid_at) VALUES
-- Alice's trial invoice (will be billed at end of trial)
('850e8400-e29b-41d4-a716-446655440001', 'INV-2024-001', '650e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'open', 29.99, 2.70, 0, 32.69, 32.69, 0, '2024-11-08 10:00:00', '2024-11-15 10:00:00', NULL),

-- Bob's paid invoices
('850e8400-e29b-41d4-a716-446655440002', 'INV-2024-002', '650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'paid', 9.99, 0.90, 0, 10.89, 10.89, 10.89, '2024-10-20 14:30:00', '2024-10-27 14:30:00', '2024-10-21 09:15:00'),
('850e8400-e29b-41d4-a716-446655440003', 'INV-2024-003', '650e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'paid', 9.99, 0.90, 0, 10.89, 10.89, 10.89, '2024-09-20 14:30:00', '2024-09-27 14:30:00', '2024-09-21 10:00:00'),

-- Charlie's annual invoice
('850e8400-e29b-41d4-a716-446655440004', 'INV-2024-004', '650e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 'paid', 959.90, 86.39, 0, 1046.29, 1046.29, 1046.29, '2024-03-10 09:15:00', '2024-03-17 09:15:00', '2024-03-11 14:20:00'),

-- Diana's canceled subscription invoice
('850e8400-e29b-41d4-a716-446655440005', 'INV-2024-005', '650e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440004', 'paid', 29.99, 2.70, 0, 32.69, 32.69, 32.69, '2024-10-05 11:20:00', '2024-10-12 11:20:00', '2024-10-06 08:45:00'),

-- Evan's failed invoice
('850e8400-e29b-41d4-a716-446655440006', 'INV-2024-006', '650e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440005', 'open', 9.99, 0.90, 0, 10.89, 10.89, 0, '2024-11-12 15:45:00', '2024-11-19 15:45:00', NULL);

-- ============================================================================
-- INVOICE ITEMS
-- ============================================================================

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, tax_rate, tax_amount) VALUES
-- Alice's invoice items
('850e8400-e29b-41d4-a716-446655440001', 'Pro Plan - Monthly Subscription', 1, 29.99, 29.99, 9.00, 2.70),

-- Bob's invoice items
('850e8400-e29b-41d4-a716-446655440002', 'Basic Plan - Monthly Subscription', 1, 9.99, 9.99, 9.00, 0.90),
('850e8400-e29b-41d4-a716-446655440003', 'Basic Plan - Monthly Subscription', 1, 9.99, 9.99, 9.00, 0.90),

-- Charlie's invoice items
('850e8400-e29b-41d4-a716-446655440004', 'Enterprise Plan - Yearly Subscription', 1, 959.90, 959.90, 9.00, 86.39),

-- Diana's invoice items
('850e8400-e29b-41d4-a716-446655440005', 'Pro Plan - Monthly Subscription', 1, 29.99, 29.99, 9.00, 2.70),

-- Evan's invoice items
('850e8400-e29b-41d4-a716-446655440006', 'Basic Plan - Monthly Subscription', 1, 9.99, 9.99, 9.00, 0.90);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

INSERT INTO payments (id, user_id, invoice_id, subscription_id, amount, currency, status, payment_method, gateway, gateway_transaction_id, processed_at, retry_count, created_at) VALUES
-- Bob's successful payments
('950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 10.89, 'USD', 'succeeded', 'credit_card', 'stripe', 'ch_3QP1a2K5j6l7m8n9', '2024-10-21 09:15:00', 0, '2024-10-20 14:30:00'),
('950e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440002', 10.89, 'USD', 'succeeded', 'credit_card', 'stripe', 'ch_3QP1a2K5j6l7m8n0', '2024-09-21 10:00:00', 0, '2024-09-20 14:30:00'),

-- Charlie's successful payment
('950e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440003', 1046.29, 'USD', 'succeeded', 'credit_card', 'stripe', 'ch_3QP1a2K5j6l7m8n1', '2024-03-11 14:20:00', 0, '2024-03-10 09:15:00'),

-- Diana's successful payment
('950e8400-e29b-41d4-a716-446655440004', '650e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440004', 32.69, 'USD', 'succeeded', 'credit_card', 'stripe', 'ch_3QP1a2K5j6l7m8n2', '2024-10-06 08:45:00', 0, '2024-10-05 11:20:00'),

-- Evan's failed payments (with retries)
('950e8400-e29b-41d4-a716-446655440005', '650e8400-e29b-41d4-a716-446655440005', '850e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440005', 10.89, 'USD', 'failed', 'credit_card', 'stripe', NULL, NULL, 2, '2024-11-12 15:45:00');

UPDATE payments SET
    failure_code = 'card_declined',
    failure_message = 'Your card was declined. Please update your payment method.',
    failed_at = '2024-11-12 15:50:00',
    next_retry_at = '2024-11-13 15:45:00'
WHERE id = '950e8400-e29b-41d4-a716-446655440005';

-- ============================================================================
-- PAYMENT LOGS
-- ============================================================================

INSERT INTO payment_logs (payment_id, event_type, message, error_code, error_message, created_at) VALUES
-- Bob's successful payment logs
('950e8400-e29b-41d4-a716-446655440001', 'created', 'Payment initiated', NULL, NULL, '2024-10-20 14:30:00'),
('950e8400-e29b-41d4-a716-446655440001', 'processing', 'Payment processing', NULL, NULL, '2024-10-21 09:14:30'),
('950e8400-e29b-41d4-a716-446655440001', 'succeeded', 'Payment successful', NULL, NULL, '2024-10-21 09:15:00'),

-- Evan's failed payment logs
('950e8400-e29b-41d4-a716-446655440005', 'created', 'Payment initiated', NULL, NULL, '2024-11-12 15:45:00'),
('950e8400-e29b-41d4-a716-446655440005', 'processing', 'Payment processing', NULL, NULL, '2024-11-12 15:47:00'),
('950e8400-e29b-41d4-a716-446655440005', 'failed', 'Card declined', 'card_declined', 'Your card was declined. Please update your payment method.', '2024-11-12 15:50:00'),
('950e8400-e29b-41d4-a716-446655440005', 'retry_scheduled', 'Retry scheduled for 2024-11-13 15:45:00', NULL, NULL, '2024-11-12 15:50:05'),
('950e8400-e29b-41d4-a716-446655440005', 'retry_attempted', 'Retry attempt 1', NULL, NULL, '2024-11-13 15:45:00'),
('950e8400-e29b-41d4-a716-446655440005', 'failed', 'Card declined', 'card_declined', 'Your card was declined. Please update your payment method.', '2024-11-13 15:46:00'),
('950e8400-e29b-41d4-a716-446655440005', 'retry_scheduled', 'Retry scheduled for 2024-11-14 15:45:00', NULL, NULL, '2024-11-13 15:46:05');

-- ============================================================================
-- COUPONS
-- ============================================================================

INSERT INTO coupons (id, code, discount_type, discount_value, currency, valid_from, valid_until, is_active, max_redemptions, times_redeemed, max_redemptions_per_user, description) VALUES
-- Active coupons
('a50e8400-e29b-41d4-a716-446655440001', 'WELCOME20', 'percentage', 20.00, 'USD', '2024-01-01 00:00:00', '2024-12-31 23:59:59', true, 1000, 45, 1, '20% off first month for new users'),
('a50e8400-e29b-41d4-a716-446655440002', 'SAVE10', 'fixed_amount', 10.00, 'USD', '2024-01-01 00:00:00', NULL, true, NULL, 120, 1, '$10 off any plan'),
('a50e8400-e29b-41d4-a716-446655440003', 'ANNUAL50', 'percentage', 50.00, 'USD', '2024-01-01 00:00:00', '2024-12-31 23:59:59', true, 100, 12, 1, '50% off annual plans'),
('a50e8400-e29b-41d4-a716-446655440004', 'BLACKFRIDAY', 'percentage', 30.00, 'USD', '2024-11-20 00:00:00', '2024-11-30 23:59:59', true, 500, 234, 1, 'Black Friday - 30% off all plans'),

-- Expired coupon
('a50e8400-e29b-41d4-a716-446655440005', 'SUMMER23', 'percentage', 25.00, 'USD', '2023-06-01 00:00:00', '2023-08-31 23:59:59', false, 200, 200, 1, 'Summer 2023 promotion');

UPDATE coupons SET first_time_transaction_only = true WHERE code IN ('WELCOME20', 'ANNUAL50');

-- ============================================================================
-- COUPON REDEMPTIONS
-- ============================================================================

INSERT INTO coupon_redemptions (coupon_id, user_id, invoice_id, subscription_id, discount_amount, redeemed_at) VALUES
('a50e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 10.00, '2024-10-20 14:30:00');

-- Update invoice to reflect the discount (should have been applied)
-- (In real scenario, this would be done atomically during invoice creation)

-- ============================================================================
-- TAX RULES
-- ============================================================================

INSERT INTO tax_rules (country_code, state_code, tax_name, tax_rate, effective_from, is_active, description) VALUES
-- US Sales Tax
('US', 'CA', 'California Sales Tax', 9.00, '2024-01-01 00:00:00', true, 'California state sales tax'),
('US', 'NY', 'New York Sales Tax', 8.00, '2024-01-01 00:00:00', true, 'New York state sales tax'),
('US', 'TX', 'Texas Sales Tax', 6.25, '2024-01-01 00:00:00', true, 'Texas state sales tax'),
('US', 'FL', 'Florida Sales Tax', 6.00, '2024-01-01 00:00:00', true, 'Florida state sales tax'),

-- European VAT
('GB', NULL, 'VAT', 20.00, '2024-01-01 00:00:00', true, 'United Kingdom VAT'),
('DE', NULL, 'VAT', 19.00, '2024-01-01 00:00:00', true, 'Germany VAT'),
('FR', NULL, 'VAT', 20.00, '2024-01-01 00:00:00', true, 'France VAT'),
('ES', NULL, 'VAT', 21.00, '2024-01-01 00:00:00', true, 'Spain VAT'),
('IT', NULL, 'VAT', 22.00, '2024-01-01 00:00:00', true, 'Italy VAT'),

-- Other countries
('CA', 'ON', 'HST', 13.00, '2024-01-01 00:00:00', true, 'Ontario Harmonized Sales Tax'),
('CA', 'BC', 'GST + PST', 12.00, '2024-01-01 00:00:00', true, 'British Columbia GST + PST'),
('AU', NULL, 'GST', 10.00, '2024-01-01 00:00:00', true, 'Australia Goods and Services Tax'),
('IN', NULL, 'GST', 18.00, '2024-01-01 00:00:00', true, 'India Goods and Services Tax');

-- ============================================================================
-- REFRESH ANALYTICS VIEWS
-- ============================================================================

-- Refresh all materialized views with the seed data
SELECT refresh_analytics_views();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify the data:
-- SELECT COUNT(*) as total_users FROM users;
-- SELECT COUNT(*) as total_plans FROM subscription_plans;
-- SELECT COUNT(*) as total_subscriptions FROM subscriptions;
-- SELECT COUNT(*) as total_invoices FROM invoices;
-- SELECT COUNT(*) as total_payments FROM payments;
-- SELECT COUNT(*) as total_coupons FROM coupons;
-- SELECT COUNT(*) as total_tax_rules FROM tax_rules;
-- SELECT * FROM revenue_analytics ORDER BY month DESC LIMIT 3;
-- SELECT * FROM mrr_analytics ORDER BY month DESC LIMIT 3;
-- SELECT * FROM churn_analytics ORDER BY month DESC LIMIT 3;
