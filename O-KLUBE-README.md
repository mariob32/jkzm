# JKZM - Stránka "O klube" s 2% dane

## 📁 Nové súbory

### o-klube.html
Kompletná stránka obsahujúca:
- ✅ Registračné údaje klubu (IČO, právna forma, sídlo, SJF registrácia)
- ✅ Sekcia 2% dane s QR kódom
- ✅ Predvyplnené údaje pre tlačivá
- ✅ Postup pre zamestnancov, FO a PO (prepínateľné taby)
- ✅ Termíny pre rok 2026
- ✅ Odkazy na oficiálne tlačivá Finančnej správy
- ✅ História klubu
- ✅ Kontaktné údaje

---

## 🔧 Integrácia do existujúcej stránky

### 1. Nahrajte súbor `o-klube.html` do `/public/`

### 2. Pridajte odkaz do navigácie v `index.html`

Nájdite sekciu `<nav id="mainNav">` a pridajte nový odkaz:

```html
<nav id="mainNav">
    <a href="#services">Služby</a>
    <a href="#news">Novinky</a>
    <a href="#gallery">Galéria</a>
    <a href="/o-klube.html">O klube</a>  <!-- NOVÉ -->
    <a href="#contact">Kontakt</a>
</nav>
```

### 3. Pridajte odkaz do pätičky v `index.html`

V sekcii footer pridajte:

```html
<div class="footer-col">
    <h4>Rýchle odkazy</h4>
    <a href="#services">Služby</a>
    <a href="#news">Novinky</a>
    <a href="#gallery">Galéria</a>
    <a href="/o-klube.html">O klube</a>  <!-- NOVÉ -->
    <a href="#contact">Kontakt</a>
</div>
```

---

## 📥 Tlačivá pre 2% dane

Stránka obsahuje odkazy na oficiálne tlačivá Finančnej správy SR:

| Tlačivo | Určené pre | Link |
|---------|------------|------|
| Vyhlásenie o poukázaní 2% | Zamestnanci | [FS SR](https://www.financnasprava.sk/_img/pfsedit/Dokumenty_PFS/Zverejnovanie_dok/Vzory_tlaciv/Zavisla_cinnost_5ZD/2024/2024.12.03_V2Pv25.pdf) |
| Potvrdenie o zaplatení dane | Zamestnanci | [FS SR](https://www.financnasprava.sk/_img/pfsedit/Dokumenty_PFS/Zverejnovanie_dok/Vzory_tlaciv/Zavisla_cinnost_5ZD/2024/2024.12.03_POT39_5ZDv25.pdf) |
| Daňové priznanie FO typ A | Fyzické osoby | [FS SR - katalóg](https://www.financnasprava.sk/sk/elektronicke-sluzby/verejne-sluzby/katalog-danovych-a-colnych/zoznam_vzorov_vydanych_fr_sr/dan-z-prijmov-fo-typ-a) |
| Daňové priznanie FO typ B | SZČO | [FS SR - katalóg](https://www.financnasprava.sk/sk/elektronicke-sluzby/verejne-sluzby/katalog-danovych-a-colnych/zoznam_vzorov_vydanych_fr_sr/dan-z-prijmov-fo-typ-b) |

---

## 📱 QR kód

Stránka obsahuje dynamicky generovaný QR kód (cez api.qrserver.com) odkazujúci na:
```
https://jkzm.vercel.app/o-klube.html
```

QR kód môžete vytlačiť a použiť na letáky, plagáty alebo faktúry.

---

## 📋 Údaje pre vyplnenie tlačív

```
IČO:          53536002
Názov:        Jazdecký klub Zelená míľa Jaslovské Bohunice
Právna forma: Občianske združenie
Rok:          2025
```

---

## 📅 Termíny 2026

| Dátum | Čo je potrebné urobiť |
|-------|----------------------|
| 17.2.2026 | Požiadať zamestnávateľa o ročné zúčtovanie |
| 31.3.2026 | Termín podania DP (FO, PO) |
| 30.4.2026 | Termín pre zamestnancov (Vyhlásenie + Potvrdenie) |
| 30.6.2026 | Predĺžená lehota DP |

---

## 🏇 Registračné údaje klubu

| Údaj | Hodnota |
|------|---------|
| Názov | Jazdecký klub Zelená míľa Jaslovské Bohunice |
| Právna forma | Občianske združenie (o.z.) |
| IČO | 53536002 |
| Sídlo | Areál PD Jaslovské Bohunice, Hlavná Jaslovce 124/127, 919 30 |
| Región | Trnavský kraj |
| SJF oblasť | Z (Západoslovenská) |
| Predchodca | JK AXA Jaslovské Bohunice (IČO: 35627140) |

---

© 2025 Jazdecký klub Zelená míľa Jaslovské Bohunice, o.z.
