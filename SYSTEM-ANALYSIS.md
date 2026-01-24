# JKZM Systém - Kompletná analýza

## 📊 STAV DATABÁZOVÝCH TABULIEK

### Hlavné entity (database.sql)
| Tabuľka | PK | Foreign Keys | Stav |
|---------|-----|--------------|------|
| horses | SERIAL | - | ✅ OK |
| vet_records | SERIAL | horse_id → horses | ✅ OK |
| riders | SERIAL | - | ✅ OK |
| trainers | SERIAL | - | ✅ OK |
| trainings | SERIAL | rider_id, horse_id, trainer_id | ✅ OK |
| employees | SERIAL | - | ✅ OK |
| feeding | SERIAL | horse_id, fed_by → employees | ✅ OK |
| feeding_items | SERIAL | feeding_id → feeding | ✅ OK |
| competitions | SERIAL | - | ✅ OK |
| competition_entries | SERIAL | competition_id, rider_id, horse_id | ✅ OK |
| payments | SERIAL | rider_id → riders | ✅ OK |
| memberships | SERIAL | rider_id → riders | ✅ OK |
| notifications | SERIAL | assigned_trainer_id, assigned_horse_id | ✅ OK |
| contacts | SERIAL | - | ✅ OK |
| bookings | SERIAL | - | ⚠️ Legacy |
| admin_users | SERIAL | - | ✅ OK |

### SJF Register
| Tabuľka | PK | Popis | Stav |
|---------|-----|-------|------|
| sjf_clubs | SERIAL | Kluby zo SJF | ✅ OK |
| sjf_persons | SERIAL | Osoby zo SJF | ✅ OK |
| sjf_horses | SERIAL | Kone zo SJF | ⚠️ Nepoužívané |

### CMS (database-cms.sql)
| Tabuľka | PK | Foreign Keys | Stav |
|---------|-----|--------------|------|
| albums | SERIAL | - | ✅ OK |
| photos | SERIAL | album_id → albums | ✅ OK |
| article_categories | SERIAL | - | ✅ OK |
| articles | SERIAL | category_id → article_categories | ✅ OK |
| pages | SERIAL | - | ✅ OK |
| documents | SERIAL | - | ✅ OK |
| partners | SERIAL | - | ✅ OK |
| services | SERIAL | - | ✅ OK |
| horse_rider_history | SERIAL | horse_id, rider_id | ⚠️ Chýba API |
| competition_results | SERIAL | competition_id, rider_id, horse_id | ⚠️ Chýba UI |
| training_participants | SERIAL | training_id, rider_id | ⚠️ Chýba API |

### Rezervačný systém
| Tabuľka | PK | Foreign Keys | Stav |
|---------|-----|--------------|------|
| arenas | SERIAL | - | ✅ OK |
| arena_schedules | SERIAL | arena_id → arenas | ✅ OK |
| arena_exceptions | SERIAL | arena_id → arenas | ⚠️ Chýba UI |
| reservations | SERIAL | arena_id, horse_id | ❌ horse_id je UUID! |

---

## 🔴 KRITICKÉ PROBLÉMY

### 1. Nekonzistentný typ horse_id v reservations
```sql
-- Aktuálne (ZLE):
horse_id UUID,

-- Má byť:
horse_id INTEGER REFERENCES horses(id),
```

### 2. Duplicitné tabuľky settings
- Existuje v database.sql aj database-cms.sql
- **Riešenie:** Použiť len jednu definíciu

### 3. Nevyužité tabuľky training_spaces + time_slots
- Nahradené systémom arenas + arena_schedules
- **Riešenie:** Odstrániť alebo migrovať

---

## 🟡 CHÝBAJÚCE KOMPONENTY

### API Endpointy
| Endpoint | Súbor | Stav |
|----------|-------|------|
| /api/notifications | notifications.js | ❌ CHÝBA |
| /api/notifications/:id | notifications-id.js | ❌ CHÝBA |
| /api/memberships/:id | memberships-id.js | ❌ CHÝBA |
| /api/arenas/:id | arenas-id.js | ❌ CHÝBA |
| /api/reservations/:id | reservations-id.js | ❌ CHÝBA |
| /api/arena-exceptions | arena-exceptions.js | ❌ CHÝBA |

### Vercel Routes
```json
{ "src": "/api/notifications/([^/]+)", "dest": "/api/notifications-id.js?id=$1" },
{ "src": "/api/notifications", "dest": "/api/notifications.js" },
{ "src": "/api/memberships/([^/]+)", "dest": "/api/memberships-id.js?id=$1" },
{ "src": "/api/arenas/([^/]+)", "dest": "/api/arenas-id.js?id=$1" },
{ "src": "/api/reservations/([^/]+)", "dest": "/api/reservations-id.js?id=$1" },
{ "src": "/api/arena-exceptions", "dest": "/api/arena-exceptions.js" }
```

---

## 🔧 ADMIN PANEL - STAV MODULOV

| Modul | Sekcia | Načítanie | CRUD | Väzby |
|-------|--------|-----------|------|-------|
| Dashboard | dashboard | ✅ | - | ✅ |
| Kone | horses | ✅ | ✅ | - |
| Jazdci | riders | ✅ | ✅ | - |
| Tréneri | trainers | ✅ | ✅ | - |
| Zamestnanci | employees | ✅ | ✅ | - |
| Tréningy | trainings | ✅ | ✅ | ⚠️ rider/horse/trainer select |
| Veterinár | vet | ✅ | ✅ | ⚠️ horse select |
| Kŕmenie | feeding | ✅ | ✅ | ⚠️ horse/employee select |
| Preteky | competitions | ✅ | ✅ | ⚠️ entries chýbajú |
| Licencie | licenses | ⚠️ | ⚠️ | - |
| SJF Register | sjf-register | ✅ | READ | - |
| Platby | payments | ✅ | ✅ | ⚠️ rider select |
| Členstvá | memberships | ✅ | ⚠️ | ⚠️ rider select |
| Notifikácie | notifications | ❌ | ❌ | - |
| Arény | arenas | ✅ | ✅ | ✅ schedules |
| Rezervácie | bookings | ✅ | ✅ | ⚠️ arena select |
| Správy | messages | ✅ | ✅ | - |
| Články | articles | ✅ | ✅ | ⚠️ category select |
| Galéria | gallery | ✅ | ✅ | ✅ photos |
| Stránky | pages | ✅ | ✅ | - |
| Dokumenty | documents | ✅ | ✅ | - |
| Partneri | partners | ✅ | ✅ | - |
| Služby | services | ✅ | ✅ | - |
| Nastavenia | web-settings | ✅ | ✅ | - |

---

## 📋 PLÁN OPRÁV

### Fáza 1: Kritické opravy
1. ✅ Opraviť reservations.horse_id na INTEGER
2. ✅ Vytvoriť chýbajúce API (-id.js súbory)
3. ✅ Aktualizovať vercel.json routes

### Fáza 2: Prepojenia v admin paneli
1. Pridať selecty pre väzby (horse, rider, trainer)
2. Implementovať notifikácie modul
3. Opraviť memberships CRUD

### Fáza 3: Vyčistenie
1. Odstrániť nevyužité API (training-spaces, time-slots)
2. Zjednotiť databázové súbory
3. Dokumentácia

---

## 🗂️ SÚBORY NA ÚPRAVU

1. `database-complete-setup.sql` - oprava horse_id typu
2. `api/arenas-id.js` - NOVÝ
3. `api/reservations-id.js` - NOVÝ  
4. `api/notifications.js` - NOVÝ
5. `api/notifications-id.js` - NOVÝ
6. `api/memberships-id.js` - NOVÝ
7. `api/arena-exceptions.js` - NOVÝ
8. `vercel.json` - pridať routes
9. `public/admin/index.html` - opraviť moduly
