# Jazdecký klub Zelená míľa - Profesionálny systém
## Manažment podľa pravidiel SJF, ŠVPS SR a FEI

---

## 📋 Prehľad systému

Kompletný profesionálny manažment systém pre jazdecký klub, navrhnutý v súlade s pravidlami:

- **SJF** (Slovenská jazdecká federácia) - Národné pravidlá jazdeckého športu
- **ŠVPS SR** (Štátna veterinárna a potravinová správa) - Veterinárne požiadavky
- **FEI** (Federation Equestre Internationale) - Medzinárodné pravidlá

---

## 🏇 Moduly systému

### 1. Evidencia koní
- Kompletná identifikácia podľa ŠVPS:
  - Pas koňa (povinný)
  - Životné číslo (UELN)
  - Mikročip ISO 11784 (povinný od 2013)
- SJF registrácia a licencia
- FEI registrácia a FEI pas
- Veterinárny status a očkovania

### 2. Evidencia jazdcov
- SJF licencie:
  - SZVJ (Skúšky základného výcviku jazdca)
  - Národná licencia
  - Medzinárodná licencia
- FEI registrácia a FEI ID
- Kategórie: Deti, Pony, Junior, Mladý jazdec, Senior, Amatér
- Zdravotná spôsobilosť

### 3. Tréneri
- SJF kvalifikácia (1.-4. stupeň)
- Špecializácie: skoky, drezúra, voltíž, vytrvalosť
- Bezúhonnosť (výpis z registra trestov pri práci s mládežou)
- Certifikát prvej pomoci

### 4. Veterinárne záznamy
- **Očkovania:**
  - Chrípka (FEI: každých 6 mesiacov)
  - Tetanus
  - EHV-1 (herpesvírus)
- **Vyšetrenia:**
  - IAE test (infekčná anémia) - každé 2-3 roky
  - Coggins test
  - FEI veterinárna kontrola
- **Starostlivosť:**
  - Odčervenie
  - Zuby
  - Podkovanie (každých 6-8 týždňov)
- Automatické upozornenia na blížiace sa termíny

### 5. Tréningy
- Typy: Individuálny, skupinový, lonžovanie, skoky, drezúra, terén
- Príprava na SZVJ
- Príprava na preteky
- Rezervačný systém

### 6. Preteky a súťaže
- Národné a medzinárodné preteky
- SJF a FEI kódy pretekov
- Disciplíny: Skoky, drezúra, všestrannosť, vytrvalosť
- Stupne: ZM (80cm), Z (100cm), ZL (110cm), L (120cm), S (130cm), ST (140cm), T (150cm), TT (160cm)
- Prihlášky a termíny

### 7. Platby a členstvá
- Členské poplatky
- Tréningy
- Ustajnenie
- SJF/FEI licencie a registrácie

### 8. Kŕmenie
- Denné záznamy
- Kŕmne dávky (25% ráno, 25% obed, 50% večer)
- Evidencia kŕmenia

### 9. Rezervácie z webu
- Online formulár
- Automatické notifikácie
- Potvrdenia rezervácií

---

## 🔒 SJF Pravidlá - implementované v systéme

### Licencie jazdcov
- **SZVJ** - minimálny vek 9 rokov, výška 140cm
- **Teoretická skúška**: 30 otázok, 60 minút, min. 25 správnych
- **Praktická skúška**: základné chody, prekážky
- Potrebné: lekárske potvrdenie, registrovaný tréner

### Kategórie jazdcov
- Deti: do 12 rokov
- Pony jazdci
- Juniori: 14-18 rokov
- Mladí jazdci: 16-21 rokov
- Seniori: 21+

### Kvalifikácia trénerov
- 1.-4. kvalifikačný stupeň SJF
- Výpis z registra trestov pri práci s mládežou
- Školenia a certifikácie

---

## 🏥 ŠVPS Pravidlá - implementované v systéme

### Identifikácia koňa (povinné)
- Pas koňa
- Životné číslo (UELN)
- Mikročip ISO 11784 (od 2013)

### Veterinárne požiadavky
- Evidencia očkovaní
- Test IAE (infekčná anémia)
- Zdravotné prehliadky

---

## 🌍 FEI Pravidlá - implementované v systéme

### Registrácia
- FEI ID pre jazdcov
- FEI pas pre kone
- Mikročip povinný od 2013
- FEI HorseApp (evidencia teplôt)

### Očkovania pre medzinárodné preteky
- Chrípka: každých 6 mesiacov
- Záznam v FEI HorseApp

### Veterinárne kontroly
- Pred príjazdom na preteky
- Pred štartom
- Po skončení

---

## 💻 Technológie

- **Frontend**: HTML5, CSS3, JavaScript (vanilla)
- **Backend**: Node.js, Vercel Serverless Functions
- **Databáza**: Supabase (PostgreSQL)
- **Hosting**: Vercel

---

## 🚀 Inštalácia

### 1. Supabase
1. Vytvorte projekt na supabase.com
2. Spustite `database.sql` v SQL editore
3. Získajte URL a Service Key

### 2. Vercel
1. Import projektu z GitHub
2. Nastavte environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. Deploy

### 3. Prihlasovacie údaje
- Email: `admin@jkzm.sk`
- Heslo: `admin123`

---

## 📱 Prístupové URL

- **Webstránka**: https://jkzm.vercel.app
- **Admin panel**: https://jkzm.vercel.app/admin

---

## 📞 Kontakt

**Jazdecký klub Zelená míľa Jaslovské Bohunice, o.z.**

- **Adresa**: Areál PD Jaslovské Bohunice, Hlavná Jaslovce 124/127, 919 30
- **Telefón**: +421 905 523 022
- **Email**: apilera@apilera.com
- **Facebook**: facebook.com/JKZMJB

---

© 2025 Jazdecký klub Zelená míľa Jaslovské Bohunice, o.z.

---

## 🏇 SJF Register (nové!)

Systém obsahuje synchronizáciu s evidencia.sjf.sk:
- 50 aktívnych klubov
- 41 aktívnych rozhodcov
- 6 aktívnych staviteľov parkúrov

### Tabuľky
- `sjf_clubs` - Všetky jazdecké kluby
- `sjf_persons` - Rozhodcovia, tréneri, stavitelia
- `sjf_horses` - Register koní
- `sjf_sync_log` - Log synchronizácií

### Aktualizácia dát
```bash
cd tools/sjf-import
npm install
node sjf-import.js --clubs SJF-Export_kluby.csv
node sjf-import.js --persons SJF-Export_osoby.csv
```

Viac info: `SJF-PREHLAD.md`

---

## 📰 CMS Systém (nové!)

### Nové tabuľky
- `albums` - Fotoalbumy
- `photos` - Fotky s väzbami na kone/jazdcov/súťaže
- `articles` - Články a novinky
- `article_categories` - Kategórie článkov
- `pages` - Statické stránky
- `documents` - Dokumenty na stiahnutie
- `partners` - Partneri a sponzori
- `competition_results` - Výsledky súťaží
- `horse_rider_history` - História kôň-jazdec
- `settings` - Nastavenia webu

### Nové API endpointy
- `/api/articles` - CRUD články
- `/api/albums` - CRUD albumy
- `/api/photos` - CRUD fotky
- `/api/pages` - CRUD stránky
- `/api/documents` - CRUD dokumenty
- `/api/partners` - CRUD partneri
- `/api/settings` - Nastavenia
- `/api/competition-results` - Výsledky

### Admin panel sekcie
- 📰 Články - správa noviniek s kategóriami
- 🖼️ Galéria - albumy a fotky
- 📄 Stránky - statický obsah
- 📎 Dokumenty - súbory na stiahnutie
- 🤝 Partneri - sponzori a partneri
- ⚙️ Nastavenia - konfigurácia webu

### SQL pre CMS
Spusti `database-cms.sql` v Supabase SQL Editor.

---

## 🆕 Verzia 5.1.0 (2026-01-22)

### Nové funkcie
- ✅ **WYSIWYG editor** - Quill.js pre články a stránky
- ✅ **Správa fotiek** - Multi-upload do albumov
- ✅ **Emoji picker** - 30+ ikon pre služby
- ✅ **Štítky služieb** - Obsadené, Pripravujeme, Novinka, Akcia
- ✅ **URL hash** - Pamätanie sekcie po refreshi
- ✅ **SEO optimalizácia** - Meta tagy, Open Graph
- ✅ **PWA manifest** - Podpora pre mobilné zariadenia

### Opravy
- Odstránené všetky console.log
- Implementované TODO funkcie
- Vylepšený error handling

---

## 📋 O klube stránka (v5.2.0)

Nová stránka `/o-klube.html` obsahuje:

### Registračné údaje
- IČO: 53536002
- Názov: Jazdecký klub Zelená míľa Jaslovské Bohunice
- Právna forma: Občianske združenie (o.z.)
- SJF oblasť: Z (Západoslovenská)

### 2% z dane sekcia
- QR kód pre rýchly prístup
- Predvyplnené údaje pre tlačivá
- Postup pre zamestnancov, FO a PO
- Termíny 2026
- Odkazy na oficiálne tlačivá FS SR

### Navigácia
Odkaz "O klube" je pridaný do hlavnej navigácie aj do pätičky.

---

## 📋 Verzia 6.5.0 (2026-01-25)

### Admin UI vylepsenia
- **Vaccinations CRUD** - Edit a Delete tlacidla v admin paneli
- **Feeding Items** - Nested CRUD pre polozky krmenia (Detail modal)
- **Admin Users** - Sprava admin pouzivatelov (role, is_active)
- **Compliance Dashboard** - Expirujuce SJF licencie a ockovania

### Nove API endpointy (v6.4)
- `/api/feeding-items` - CRUD polozky krmenia
- `/api/vaccinations` - CRUD ockovania
- `/api/competition-entries` - CRUD prihlasky na preteky
- `/api/admin-users` - CRUD admin pouzivatelia
- `/api/health` - System health check (public)

### Technicke zmeny
- Vet sekcia ma teraz taby (Vet zaznamy / Ockovania)
- Feeding tabulka ma tlacidlo Detail pre nested CRUD
- Compliance dashboard zobrazuje expirujuce licencie a ockovania

---

## 📋 Verzia 6.21.7 (2026-01-29)

### Calendar Attendance + Billing Workflow
- **Slot detail modal** - zobrazuje rezervácie s charge info
- **Mark attended** - vytvorí tréning + automaticky vygeneruje charge podľa cenníka
- **Inline payment** - priamo v modali: [Hotovosť/Karta/Prevod] [Ref] [Uhradiť]
- **Storno charge** - s povinným dôvodom
- **No-cache headers** - slot detail endpoint vždy vracia čerstvé dáta

### ⚠️ Supabase RLS Poznámka
Tabuľka `billing_charges` má RLS (Row Level Security) zapnuté. Pre správne fungovanie charge lookup v kalendári je potrebné:
- **Možnosť 1**: `ALTER TABLE billing_charges DISABLE ROW LEVEL SECURITY;`
- **Možnosť 2**: Pridať policy: `CREATE POLICY "Allow all for service" ON billing_charges FOR ALL USING (true) WITH CHECK (true);`

Bez tohto nastavenia calendar charge lookup nebude fungovať (queries vrátia prázdne výsledky).
