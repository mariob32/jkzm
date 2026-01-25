-- =====================================================
-- VYMAZANIE DUPLICITNÝCH ARÉN
-- Spusti v Supabase SQL Editor
-- =====================================================

-- 1. Pozri duplicity
SELECT name, COUNT(*) as cnt 
FROM arenas 
GROUP BY name 
HAVING COUNT(*) > 1;

-- 2. Vymaž duplicity - ponechaj len najnižšie ID pre každý názov
DELETE FROM arenas a
WHERE a.id NOT IN (
    SELECT MIN(id) 
    FROM arenas 
    GROUP BY name
);

-- 3. Skontroluj výsledok
SELECT * FROM arenas ORDER BY id;
