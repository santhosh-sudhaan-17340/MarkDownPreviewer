-- Sample Subscription Plans
INSERT INTO subscription_plans (id, name, description, billing_period, price, trial_days, features) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Basic Monthly', 'Basic plan with essential features', 'monthly', 9.99, 14, '{"max_users": 1, "storage_gb": 5, "support": "email"}'),
    ('22222222-2222-2222-2222-222222222222', 'Basic Yearly', 'Basic plan with essential features (annual)', 'yearly', 99.99, 14, '{"max_users": 1, "storage_gb": 5, "support": "email"}'),
    ('33333333-3333-3333-3333-333333333333', 'Pro Monthly', 'Professional plan with advanced features', 'monthly', 29.99, 14, '{"max_users": 5, "storage_gb": 50, "support": "priority"}'),
    ('44444444-4444-4444-4444-444444444444', 'Pro Yearly', 'Professional plan with advanced features (annual)', 'yearly', 299.99, 14, '{"max_users": 5, "storage_gb": 50, "support": "priority"}'),
    ('55555555-5555-5555-5555-555555555555', 'Enterprise Monthly', 'Enterprise plan with all features', 'monthly', 99.99, 30, '{"max_users": -1, "storage_gb": 500, "support": "24/7"}'),
    ('66666666-6666-6666-6666-666666666666', 'Enterprise Yearly', 'Enterprise plan with all features (annual)', 'yearly', 999.99, 30, '{"max_users": -1, "storage_gb": 500, "support": "24/7"}');

-- Sample Tax Rules
INSERT INTO tax_rules (country_code, state_code, tax_rate, tax_name) VALUES
    ('US', 'CA', 0.0725, 'California Sales Tax'),
    ('US', 'NY', 0.0400, 'New York Sales Tax'),
    ('US', 'TX', 0.0625, 'Texas Sales Tax'),
    ('GB', NULL, 0.2000, 'UK VAT'),
    ('DE', NULL, 0.1900, 'German VAT'),
    ('FR', NULL, 0.2000, 'French VAT'),
    ('CA', 'ON', 0.1300, 'Ontario HST'),
    ('CA', 'BC', 0.1200, 'BC Combined Tax');

-- Sample Coupons
INSERT INTO coupons (code, discount_type, discount_value, max_redemptions, valid_from, valid_until, applicable_plans) VALUES
    ('WELCOME20', 'percentage', 20.00, 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '90 days', NULL),
    ('SUMMER50', 'percentage', 50.00, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', '["33333333-3333-3333-3333-333333333333", "44444444-4444-4444-4444-444444444444"]'),
    ('FIRST10', 'fixed', 10.00, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '365 days', NULL),
    ('ANNUAL100', 'fixed', 100.00, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '60 days', '["22222222-2222-2222-2222-222222222222", "44444444-4444-4444-4444-444444444444", "66666666-6666-6666-6666-666666666666"]');
