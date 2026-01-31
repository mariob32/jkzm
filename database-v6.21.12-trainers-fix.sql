-- =====================================================
-- JKZM v6.21.12 - Trainers tabuľka migrácia
-- Spustiť v Supabase SQL Editor ak chýbajú stĺpce
-- =====================================================

-- Pridanie chýbajúcich stĺpcov do trainers tabuľky
-- (ALTER TABLE IF NOT EXISTS column - PostgreSQL 9.6+)

-- SJF kvalifikácia
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='sjf_license_number') THEN
        ALTER TABLE trainers ADD COLUMN sjf_license_number VARCHAR(20);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='sjf_trainer_level') THEN
        ALTER TABLE trainers ADD COLUMN sjf_trainer_level INTEGER CHECK (sjf_trainer_level BETWEEN 1 AND 4);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='sjf_license_valid_until') THEN
        ALTER TABLE trainers ADD COLUMN sjf_license_valid_until DATE;
    END IF;
END $$;

-- Špecializácie
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='specializations') THEN
        ALTER TABLE trainers ADD COLUMN specializations TEXT[];
    END IF;
END $$;

-- Typ zamestnania
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='employment_type') THEN
        ALTER TABLE trainers ADD COLUMN employment_type VARCHAR(50) DEFAULT 'full_time';
    END IF;
END $$;

-- Bio
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='bio') THEN
        ALTER TABLE trainers ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='status') THEN
        ALTER TABLE trainers ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

-- Updated at
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='updated_at') THEN
        ALTER TABLE trainers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Hodinová sadzba (ak neexistuje)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='hourly_rate') THEN
        ALTER TABLE trainers ADD COLUMN hourly_rate DECIMAL(10,2);
    END IF;
END $$;

-- Notes (ak neexistuje)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainers' AND column_name='notes') THEN
        ALTER TABLE trainers ADD COLUMN notes TEXT;
    END IF;
END $$;

-- =====================================================
-- Podobne pre employees tabuľku
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='employment_type') THEN
        ALTER TABLE employees ADD COLUMN employment_type VARCHAR(50) DEFAULT 'full_time';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='status') THEN
        ALTER TABLE employees ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='updated_at') THEN
        ALTER TABLE employees ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Hotovo
SELECT 'Migrácia dokončená' as status;
