# SJF Register - Prehľad dát

**Zdroj:** evidencia.sjf.sk  
**Dátum exportu:** 20. január 2025

---

## 📊 Štatistiky

| Kategória | Celkom | Aktívnych |
|-----------|--------|-----------|
| Kluby | 321 | 50 |
| Osoby | 7 142 | ~500 |
| Kone | 5 824 | 0* |
| Rozhodcovia | 136 | 41 |
| Tréneri | 465 | 97 |
| Stavitelia parkúrov | 28 | 6 |
| Stewardi | 92 | ~25 |

*Poznámka: Všetky kone v registri majú stav "Neaktívny" - licencie sa obnovujú ročne.*

---

## 🏆 Aktívni stavitelia parkúrov

| Meno | Klub | Licencia |
|------|------|----------|
| Radka Hermély | GREENFIELD SPORT HORSES Hôrka | SS2 |
| Zdenek Kuchár | JK SLÁVIA Spišská Nová Ves | SS2 |
| Maroš Kuchár | JK SLÁVIA Spišská Nová Ves | SS2 |
| Zdeno Malík | TJ ŽREBČÍN Motešice | SS2, SC2 |
| Ľubomír Paučo | JK MASARYKOV DVOR Vígľaš - Pstruša | SS4, SC3 |
| Ján Skatulla | JK ALEXANDRIA Hviezdoslavov | SS4 |

**Legenda licencií:**
- SS = Skoky (1-4 úroveň)
- SC = Všestrannosť Cross (1-4 úroveň)
- SA = Všestrannosť/Areál (1-4 úroveň)

---

## ⚖️ Aktívni rozhodcovia (výber najvyšších licencií)

### Medzinárodní (FEI)
| Meno | Klub | Licencia |
|------|------|----------|
| Zuzana Bačiak Masaryková | JK SŠ Ivanka pri Dunaji | FRV3 |
| Pavla Krauspe | JK SŠ Ivanka pri Dunaji | FRV4 |
| Iľja Vietor | JK SŠ Ivanka pri Dunaji | FRD3 |

### Národní - Skoky (RS)
| Meno | Klub | Licencia |
|------|------|----------|
| Jozef Halgoš | JK TJ SLÁVIA STU Bratislava | RS4 |
| Ján Kuchár | JK SLÁVIA Spišská Nová Ves | RS4 |
| Peter Mikulášik | HORSE AREA Vysoké Tatry | RS4, RC4, RA4 |
| Ľubomír Paučo | JK MASARYKOV DVOR Vígľaš - Pstruša | RS4 |
| Jozef Paulovič | JK MASARYKOV DVOR Vígľaš - Pstruša | RS4 |

### Národní - Drezúra (RD)
| Meno | Klub | Licencia |
|------|------|----------|
| Nadežda Ivaničová | JK ALEXANDRIA Hviezdoslavov | RD4 |
| Silvia Poláková | JK SŠ Ivanka pri Dunaji | RD4, RA2 |
| Zdeno Malík | TJ ŽREBČÍN Motešice | RS2, RC4 |

### Národní - Voltíž (RV)
| Meno | Klub | Licencia |
|------|------|----------|
| Vladimíra Lenčéšová | FARAO Trnovec nad Váhom | RV4, RPV4 |
| Ľubica Lukáčová | JK FREESTYLE Poprad | RV4, RPV4 |
| Martina Sýkorová | FARAO Trnovec nad Váhom | RV4, RPV4 |
| Martina Vargová | FARAO Trnovec nad Váhom | RV4, RPV4 |
| Petra Masácová | JK SŠ Ivanka pri Dunaji | RV4 |

---

## 🏫 Aktívne jazdecké školy (22)

| Klub | Mesto | Kontakt |
|------|-------|---------|
| AL ASIL | Liptovský Mikuláš | 0944/940023 |
| CRAZY TEAM | Hajnáčka | 0908/940893 |
| FARAO | Trnovec nad Váhom | 0907/050355 |
| JA TARTAROS | Pečeňany | 0948/837401 |
| JK ACER | Prešov | 0918/282096 |
| JK EL ZORRO | Veľký Kýr | 0907/212787 |
| JK EQUIDA | Prievidza | 0915/288941 |
| JK FADEX | Miloslavov | 0908/628231 |
| JK FREESTYLE | Betlanovce | 0903/624847 |
| JK LARISA | Hriadky | 0908/210281 |
| JK LIMIT | Bratislava | 0911/357511 |
| JK MASARYKOV DVOR | Vígľaš | 0915/805634 |
| JK NAPOLI | Šamorín | 0903/614922 |
| JK Podtureň | Podtureň | 0905/523870 |
| JK ROLLERS | Rakúsy | 0905/730940 |
| JK SCARLETT | Šamorín | 0948/328811 |
| JK TAMARIS | Teplička | 0905/252604 |
| SPOLOK PRIATEĽOV KONÍ | Trnava | 0905/260589 |
| VIDA | Bratislava | 0905/599234 |
| VOLTILAND | Opiná | 0903/167744 |
| WAVO HORSES | Slovenská Ľupča | 0915/808636 |

---

## 📍 Kluby podľa regiónov

| Región | Počet aktívnych |
|--------|-----------------|
| B - Bratislavský | 14 |
| Z - Západné Slovensko | 13 |
| S - Stredné Slovensko | 9 |
| V - Východné Slovensko | 9 |
| Neurčené (-) | 5 |

---

## 🔄 Aktualizácia dát

### Postup pre manuálnu aktualizáciu:

1. **Export z SJF:**
   - Kluby: https://evidencia.sjf.sk/kluby → Export XLS
   - Osoby: https://evidencia.sjf.sk/osoby → Export XLS
   - Kone: https://evidencia.sjf.sk/kone → Export XLS

2. **Konverzia na CSV:**
   ```bash
   libreoffice --headless --convert-to csv SJF-Export_kluby.xls
   libreoffice --headless --convert-to csv SJF-Export_osoby.xls
   libreoffice --headless --convert-to csv SJF-Export-kone.xls
   ```

3. **Import do databázy:**
   ```bash
   node sjf-import.js --clubs SJF-Export_kluby.csv
   node sjf-import.js --persons SJF-Export_osoby.csv
   node sjf-import.js --horses SJF-Export-kone.csv
   ```

4. **Kontrola:**
   ```bash
   node sjf-import.js --stats
   ```

### Odporúčaná frekvencia:
- **Kluby:** 1x mesačne
- **Osoby:** Pred sezónou (marec) a po sezóne (november)
- **Kone:** Podľa potreby

---

## 📞 Kontakt na SJF

**Slovenská jazdecká federácia**  
Olympijské námestie 14290/1  
831 04 Bratislava

- Tel: +421 905 643 661
- Email: info@sjf.sk
- Web: www.sjf.sk
- Evidencia: evidencia.sjf.sk
