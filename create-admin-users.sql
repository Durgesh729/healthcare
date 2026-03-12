-- ============================================================
-- ADMIN USER SETUP SCRIPT
-- ============================================================
-- Run this AFTER creating users through Supabase Dashboard
-- This creates the healthcare_workers records for admin access

-- First, create these users in Supabase Dashboard > Authentication > Users:
-- 1. Email: admin@healthsync.org, Password: admin123456
-- 2. Email: worker@healthsync.org, Password: worker123456

-- Then run this SQL to create their healthcare worker profiles:

DO $$
DECLARE
    admin_id UUID;
    worker_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@healthsync.org';
    
    -- Get worker user ID  
    SELECT id INTO worker_id FROM auth.users WHERE email = 'worker@healthsync.org';
    
    -- Insert admin healthcare worker record
    IF admin_id IS NOT NULL THEN
        INSERT INTO healthcare_workers (
            id, 
            full_name, 
            employee_id, 
            phone_number, 
            designation, 
            is_active, 
            preferred_language
        ) VALUES (
            admin_id, 
            'System Administrator', 
            'ADMIN001', 
            '+1234567890', 
            'Administrator', 
            true, 
            'en'
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Admin user profile created successfully';
    ELSE
        RAISE NOTICE 'Admin user not found. Please create admin@healthsync.org in Authentication > Users first';
    END IF;
    
    -- Insert field worker record
    IF worker_id IS NOT NULL THEN
        INSERT INTO healthcare_workers (
            id, 
            full_name, 
            employee_id, 
            phone_number, 
            designation, 
            is_active, 
            preferred_language
        ) VALUES (
            worker_id, 
            'Field Worker', 
            'WORKER001', 
            '+1234567890', 
            'Field Worker', 
            true, 
            'en'
        ) ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Worker user profile created successfully';
    ELSE
        RAISE NOTICE 'Worker user not found. Please create worker@healthsync.org in Authentication > Users first';
    END IF;
    
    -- Insert a test village
    INSERT INTO villages (id, name, district, taluka) 
    VALUES ('village_001', 'Test Village', 'Test District', 'Test Taluka')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Test village created';
    
END $$;

-- Verify the setup
SELECT 
    u.email,
    hw.full_name,
    hw.designation,
    hw.employee_id
FROM auth.users u
JOIN healthcare_workers hw ON u.id = hw.id
WHERE u.email IN ('admin@healthsync.org', 'worker@healthsync.org');