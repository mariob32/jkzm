/**
 * SJF Import Tool pre JKZM
 * Importuje a aktualizuje dáta z SJF exportov (evidencia.sjf.sk)
 * 
 * Použitie:
 *   node sjf-import.js --clubs kluby.csv
 *   node sjf-import.js --persons osoby.csv
 *   node sjf-import.js --horses kone.csv
 *   node sjf-import.js --all kluby.csv osoby.csv kone.csv
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Konfigurácia - nastaviť v .env alebo priamo
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// CSV Parser (jednoduchý, zvláda úvodzovky)
function parseCSV(content) {
    const lines = content.split('\n');
    const headers = parseCSVLine(lines[0]);
    const records = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            const record = {};
            headers.forEach((h, idx) => {
                record[h] = values[idx] || '';
            });
            records.push(record);
        }
    }
    return records;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

// Parsovanie dátumu zo slovenského formátu
function parseDate(dateStr) {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    return null;
}

// Import klubov
async function importClubs(csvPath) {
    console.log('📥 Importujem kluby z:', csvPath);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(content);
    
    let added = 0, updated = 0, unchanged = 0;
    
    for (const r of records) {
        const clubData = {
            name: r['Názov'],
            street: r['Ulica'],
            postal_code: r['PSČ'],
            house_number: r['Orientačné číslo'],
            region: r['Oblasť'] || '-',
            city: r['Mesto'],
            is_riding_school: r['Jazdecká škola'] === 'Áno',
            statutory: r['Štatutár'],
            contact_person: r['Kontaktná osoba'],
            phone: r['Telefón'],
            email: r['Email'],
            status: r['Stav klubu'],
            sjf_last_update: new Date().toISOString()
        };
        
        // Skontroluj či existuje
        const { data: existing } = await supabase
            .from('sjf_clubs')
            .select('id, name, status')
            .eq('name', clubData.name)
            .single();
        
        if (existing) {
            // Update
            const { error } = await supabase
                .from('sjf_clubs')
                .update(clubData)
                .eq('id', existing.id);
            
            if (!error) updated++;
        } else {
            // Insert
            const { error } = await supabase
                .from('sjf_clubs')
                .insert(clubData);
            
            if (!error) added++;
        }
    }
    
    console.log(`✅ Kluby: ${added} pridaných, ${updated} aktualizovaných`);
    
    // Log
    await supabase.from('sjf_sync_log').insert({
        sync_type: 'clubs',
        records_total: records.length,
        records_added: added,
        records_updated: updated,
        records_unchanged: records.length - added - updated
    });
    
    return { added, updated, total: records.length };
}

// Import osôb
async function importPersons(csvPath) {
    console.log('📥 Importujem osoby z:', csvPath);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(content);
    
    let added = 0, updated = 0;
    
    for (const r of records) {
        const personData = {
            surname: r['Priezvisko'],
            first_name: r['Meno'],
            birth_date: parseDate(r['Dátum narodenia']),
            club_name: r['Klub'],
            region: r['Oblasť'] || '-',
            sjf_license_status: r['Stav licencie SJF'],
            sjf_license_number: r['Číslo licencie SJF'],
            fei_license_status: r['Stav licencie FEI'],
            is_talented_athlete: r['Talentovaný športovec'] === 'Áno',
            badge_gold: r['Zlatý odznak'] === 'Áno',
            badge_silver: r['Strieborný odznak'] === 'Áno',
            badge_bronze: r['Bronzový odznak'] === 'Áno',
            is_riding_school_student: r['Žiak JŠ'] === 'Áno',
            general_rules: r['Všeobecné pravidlá'] === 'Áno',
            rider_license: r['Jazdec'] || null,
            judge_license: r['Rozhodca'] || null,
            trainer_license: r['Tréner'] || null,
            course_builder_license: r['Staviteľ parkúrov/tratí'] || null,
            steward_license: r['Steward'] || null,
            fei_vet_license: r['FEI Veterinárny lekár'] || null,
            sjf_vet_judge_license: r['SJF Vet. lekár-rozhodca'] || null,
            technical_delegate: r['Technický delegát'] || null,
            sjf_official: r['Funkcionár SJF'] || null,
            mcras_official: r['Funkcionár MCRaŠ'] || null,
            fei_treating_vet: r['FEI Ošetrujúci veterinár'] || null,
            member_type: r['Člen'] || null,
            lunger_license: r['Lonžér'] || null,
            main_discipline: r['Hlavná disciplína'] || null,
            secondary_discipline: r['Vedlajšia disciplína'] || null,
            voltiz: r['Voltíž'] || null,
            sjf_last_update: new Date().toISOString()
        };
        
        // Skontroluj či existuje (podľa licenčného čísla)
        const { data: existing } = await supabase
            .from('sjf_persons')
            .select('id')
            .eq('sjf_license_number', personData.sjf_license_number)
            .single();
        
        if (existing) {
            const { error } = await supabase
                .from('sjf_persons')
                .update(personData)
                .eq('id', existing.id);
            if (!error) updated++;
        } else {
            const { error } = await supabase
                .from('sjf_persons')
                .insert(personData);
            if (!error) added++;
        }
    }
    
    console.log(`✅ Osoby: ${added} pridaných, ${updated} aktualizovaných`);
    
    await supabase.from('sjf_sync_log').insert({
        sync_type: 'persons',
        records_total: records.length,
        records_added: added,
        records_updated: updated,
        records_unchanged: records.length - added - updated
    });
    
    return { added, updated, total: records.length };
}

// Import koní
async function importHorses(csvPath) {
    console.log('📥 Importujem kone z:', csvPath);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(content);
    
    let added = 0, updated = 0;
    
    for (const r of records) {
        const horseData = {
            sjf_license_number: r['Číslo licencie SJF'],
            name: r['Meno koňa'],
            owner_name: r['Majitel koňa'],
            life_number: r['Životné číslo'],
            club_name: r['Klub'],
            gender: r['Pohlavie'],
            sjf_license_status: r['Stav Licencie SJF'],
            fei_license_status: r['Stav Licencie FEI'],
            fei_license_number: r['Číslo licencie FEI'] || null,
            birth_date: parseDate(r['Dátum narodenia']),
            color: r['Farba'],
            breed: r['Plemeno'],
            sire: r['Otec'],
            dam: r['Matka'],
            disciplines: r['Disciplína'],
            sjf_last_update: new Date().toISOString()
        };
        
        // Skontroluj podľa životného čísla alebo mena
        const { data: existing } = await supabase
            .from('sjf_horses')
            .select('id')
            .or(`life_number.eq.${horseData.life_number},and(name.eq.${horseData.name},owner_name.eq.${horseData.owner_name})`)
            .single();
        
        if (existing) {
            const { error } = await supabase
                .from('sjf_horses')
                .update(horseData)
                .eq('id', existing.id);
            if (!error) updated++;
        } else {
            const { error } = await supabase
                .from('sjf_horses')
                .insert(horseData);
            if (!error) added++;
        }
    }
    
    console.log(`✅ Kone: ${added} pridaných, ${updated} aktualizovaných`);
    
    await supabase.from('sjf_sync_log').insert({
        sync_type: 'horses',
        records_total: records.length,
        records_added: added,
        records_updated: updated,
        records_unchanged: records.length - added - updated
    });
    
    return { added, updated, total: records.length };
}

// Štatistiky
async function printStats() {
    console.log('\n📊 ŠTATISTIKY SJF REGISTROV:\n');
    
    const { count: clubsTotal } = await supabase.from('sjf_clubs').select('*', { count: 'exact', head: true });
    const { count: clubsActive } = await supabase.from('sjf_clubs').select('*', { count: 'exact', head: true }).eq('status', 'Aktívny');
    console.log(`Kluby: ${clubsTotal} celkom, ${clubsActive} aktívnych`);
    
    const { count: personsTotal } = await supabase.from('sjf_persons').select('*', { count: 'exact', head: true });
    const { count: personsActive } = await supabase.from('sjf_persons').select('*', { count: 'exact', head: true }).eq('sjf_license_status', 'Aktívny');
    console.log(`Osoby: ${personsTotal} celkom, ${personsActive} aktívnych`);
    
    const { count: horsesTotal } = await supabase.from('sjf_horses').select('*', { count: 'exact', head: true });
    console.log(`Kone: ${horsesTotal} celkom`);
    
    // Posledná synchronizácia
    const { data: lastSync } = await supabase
        .from('sjf_sync_log')
        .select('*')
        .order('sync_date', { ascending: false })
        .limit(3);
    
    if (lastSync && lastSync.length > 0) {
        console.log('\nPosledné synchronizácie:');
        lastSync.forEach(s => {
            console.log(`  ${s.sync_type}: ${new Date(s.sync_date).toLocaleString('sk-SK')} - ${s.records_added} nových, ${s.records_updated} aktualizovaných`);
        });
    }
}

// Main
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
SJF Import Tool pre JKZM
========================

Použitie:
  node sjf-import.js --clubs <súbor.csv>     Import klubov
  node sjf-import.js --persons <súbor.csv>   Import osôb
  node sjf-import.js --horses <súbor.csv>    Import koní
  node sjf-import.js --stats                 Zobraz štatistiky

Príklad:
  node sjf-import.js --clubs SJF-Export_kluby.csv
  node sjf-import.js --persons SJF-Export_osoby.csv
  node sjf-import.js --horses SJF-Export-kone.csv
        `);
        return;
    }
    
    try {
        if (args[0] === '--stats') {
            await printStats();
        } else if (args[0] === '--clubs' && args[1]) {
            await importClubs(args[1]);
        } else if (args[0] === '--persons' && args[1]) {
            await importPersons(args[1]);
        } else if (args[0] === '--horses' && args[1]) {
            await importHorses(args[1]);
        } else {
            console.error('Neznámy príkaz alebo chýba súbor');
        }
    } catch (error) {
        console.error('Chyba:', error.message);
    }
}

main();
