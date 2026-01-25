# JKZM - SJF Import Tool

Import dát z SJF evidencie (evidencia.sjf.sk) do JKZM systému.

## Inštalácia

```bash
npm install
```

## Konfigurácia

Nastav environment premenné:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-anon-key"
```

## Použitie

### 1. Najprv spusti SQL schému v Supabase:
- `database-sjf-registry.sql` - vytvorí tabuľky a funkcie
- `database-sjf-seed.sql` - naplní aktuálnymi dátami (voliteľné)

### 2. Import nových dát:
```bash
npm run import:clubs
npm run import:persons
npm run import:horses
```

### 3. Kontrola štatistík:
```bash
npm run stats
```

## Súbory

- `database-sjf-registry.sql` - SQL schéma pre SJF tabuľky
- `database-sjf-seed.sql` - Aktuálne aktívne dáta (50 klubov, 41 rozhodcov, 6 staviteľov)
- `sjf-import.js` - Node.js import nástroj
- `SJF-PREHLAD.md` - Prehľad dát a štatistiky
- `*.csv` - Exportované dáta z SJF

## Dátové zdroje

- Kluby: https://evidencia.sjf.sk/kluby
- Osoby: https://evidencia.sjf.sk/osoby  
- Kone: https://evidencia.sjf.sk/kone

## Licencie rozhodcov/staviteľov

- **R** = Rozhodca (S=Skoky, D=Drezúra, V=Voltíž, C=Všestrannosť, A=Areál, E=Endurance, P=Pony)
- **S** = Staviteľ parkúrov (S=Skoky, C=Cross, A=Areál)
- **K** = Steward
- Číslo = úroveň (1-4, kde 4 je najvyššia)
- **F** = FEI medzinárodná licencia
