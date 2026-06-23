# Katalog OOPP – Engel-Gematex s.r.o.

Webová aplikace pro správu katalogu osobních ochranných pracovních prostředků.  
Běží jako Docker kontejner, data přežijí restartování i aktualizaci aplikace.

---

## Požadavky na server

| Software | Verze | Poznámka |
|---|---|---|
| Docker | 20+ | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose | v2+ | součástí novějšího Dockeru |

Nic jiného není potřeba – Node.js ani npm se neinstalují ručně, jsou uvnitř kontejneru.

---

## Struktura projektu

```
Katalog OOPP_html/
│
├── server.js               ← webový server (Node.js / Express)
├── package.json            ← závislosti (express, multer)
├── Dockerfile              ← návod pro sestavení Docker image
├── docker-compose.yml      ← konfigurace kontejneru, hesla, porty, volumes
├── .dockerignore           ← co se NEkopíruje do image
│
├── public/                 ← soubory přístupné z prohlížeče
│   ├── index.html          ← katalog (veřejná stránka)
│   ├── admin.html          ← správa katalogu (po přihlášení)
│   ├── logo.png            ← logo firmy
│   └── uploads/            ← ← ← OBRÁZKY POLOŽEK (spravuje Docker volume)
│
└── data/                   ← ← ← DATA APLIKACE (spravuje Docker volume)
    ├── default.json        ← výchozí data katalogu (záloha, nikdy se nepřepíše)
    ├── products.json       ← aktuální data (vznikne po prvním uložení v adminu)
    └── auth.json           ← uložené heslo (vznikne po první změně hesla)
```

---

## Co lze spravovat v admin panelu

Admin panel (`/admin`) obsahuje čtyři sekce:

### 📦 Produkty
- Přidání / editace / smazání jednotlivých OOPP položek
- Každá položka: katalogové číslo, název, dodavatel, výrobní kód, velikosti, nárok / četnost, obrázek, volitelný max. finanční strop s výběrem měny (CZK, EUR, USD, GBP)
- Nahrání obrázku (přetažení nebo výběr souboru, max 10 MB) nebo zadání URL
- **Max. finanční strop** — nepovinné pole; zobrazí se červeně a tučně u položky v katalogu i ve správě (např. `Max. 2 500 CZK`)
- **Kopírování položky** — tlačítko 📋 Kopírovat na kartě položky uloží položku do schránky; tlačítko 📋 Vložit zkopírovanou položku se zobrazí u každé kategorie a umožní přidat kopii do jiného oddělení bez opětovného vypisování
- **Přesouvání pořadí** — tlačítka ↑ ↓ umožňují měnit pořadí oddělení, kategorií i jednotlivých položek
- Přidání / přejmenování / smazání kategorií v rámci oddělení (přejmenování se automaticky synchronizuje do všech oddělení se stejným názvem kategorie)
- Přidání / smazání celých oddělení; název a krátký název záložky lze upravit přímo na stránce Produkty bez nutnosti otevírat sekci Texty
- Synchronizace názvu a obrázku: při uložení položky se název a obrázek automaticky synchronizují do všech položek se stejným katalogovým číslem napříč odděleními

### 📊 Přehled nároků OOPP
- Přehledná tabulka všech položek rozdělená po odděleních (odpovídá tabulce v katalogu)
- Přímá editace katalogového čísla a nároku / četnosti výdeje
- Změna katalogového čísla se automaticky projeví i v detailu produktu (sdílená data)

### 📝 Texty a popis
- Název a podtitulek katalogu, úvodní text
- Kroky objednávky (text + volitelná vysvětlující poznámka pod každým krokem)
- Pro každé oddělení: ikona (výběr z nabídky emoji), krátký název záložky, celý název, krátký popis a informační box
- Textová pole podporují HTML — lze vkládat tučný text a hypertextové odkazy:

| Co | Zápis |
|---|---|
| Tučný text | `<b>tučný text</b>` |
| Odkaz na web | `<a href="https://www.strauss.com">www.strauss.com</a>` |
| Odkaz na e-mail | `<a href="mailto:sklad@firma.cz">sklad@firma.cz</a>` |

### ⚙️ Nastavení
- Změna přihlašovacího hesla (nutné znát současné heslo)
- Postup obnovení hesla pomocí záchranného kódu (viz níže)
- Stažení zálohy dat (JSON)

### Kde se ukládají data při self-hostingu

Aplikace používá dva **Docker named volumes** — to jsou speciální úložiště spravovaná Dockerem, která existují mimo kontejner a přežijí jeho restart i smazání:

| Volume | Co obsahuje | Cesta uvnitř kontejneru |
|---|---|---|
| `katalog_data` | produkty, heslo | `/app/data/` |
| `katalog_uploads` | nahrané obrázky | `/app/public/uploads/` |

> **Důležité:** Pokud kontejner smažete a znovu vytvoříte (`docker-compose up --build`), data a obrázky zůstanou zachovány, protože jsou ve volumes, ne v kontejneru.

---

## Nasazení (první spuštění)

### 1. Zkopírujte projekt na server

```bash
# přes SCP, FTP, Git nebo ručně přes správce souborů
# výsledná složka na serveru např.:
/opt/katalog-oopp/
```

### 2. Upravte hesla v docker-compose.yml

Otevřete soubor `docker-compose.yml` a změňte:

```yaml
environment:
  - ADMIN_USERNAME=Gematex          # přihlašovací jméno (lze změnit)
  - ADMIN_PASSWORD=VašeHeslo        # ← ZMĚŇTE před nasazením
  - ADMIN_RESET_CODE=VášKód         # ← ZMĚŇTE – záchranný kód při zapomenutém heslu
```

> `ADMIN_RESET_CODE` si zapište na bezpečné místo (papír, sdílený dokument).  
> Slouží k obnovení hesla přes webový prohlížeč, bez přístupu na server.

### 3. Sestavte a spusťte

```bash
cd /opt/katalog-oopp
docker-compose up -d --build
```

Aplikace poběží na portu **3000**. Přístup:
- Katalog (veřejný): `http://IP-serveru:3000`
- Správa: `http://IP-serveru:3000/admin`

### 4. (Volitelné) Zpřístupnění přes doménu s HTTPS

Doporučujeme použít **Nginx** jako reverse proxy před aplikací:

```nginx
server {
    listen 80;
    server_name katalog.vase-firma.cz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Pro HTTPS použijte [Certbot / Let's Encrypt](https://certbot.eff.org/).

---

## Správa aplikace

### Zastavení

```bash
docker-compose stop
```

### Spuštění (po zastavení)

```bash
docker-compose start
```

### Aktualizace aplikace (data zůstanou)

```bash
docker-compose down        # zastaví a odstraní kontejner (volumes zůstanou!)
docker-compose up -d --build   # sestaví nový image a spustí
```

> ⚠️ `docker-compose down` **nesmaže volumes** (data a obrázky zůstanou).  
> Ke smazání volumes by bylo potřeba `docker-compose down -v` — to nedělejte, pokud nechcete ztratit data.

### Zobrazení logů (ladění)

```bash
docker-compose logs -f katalog
```

---

## Záloha dat

### Záloha produktů a hesla

```bash
docker cp katalog-oopp:/app/data/. ./zaloha-data/
```

### Záloha nahraných obrázků

```bash
docker cp katalog-oopp:/app/public/uploads/. ./zaloha-obrazky/
```

### Obnovení dat ze zálohy

```bash
docker cp ./zaloha-data/. katalog-oopp:/app/data/
docker cp ./zaloha-obrazky/. katalog-oopp:/app/public/uploads/
```

> Zálohu dat lze také stáhnout přímo z admin panelu:  
> **Admin → Nastavení → Stáhnout zálohu (JSON)**

---

## Správa hesel

### Změna hesla (z admin panelu)

1. Přihlaste se do správy katalogu.
2. Přejděte do **Nastavení → Změna hesla**.
3. Zadejte současné heslo, nové heslo a potvrďte.
4. Klikněte **Změnit heslo**.

Heslo se uloží do `data/auth.json` (do Docker volume `katalog_data`).

### Zapomenuté heslo (bez přístupu na server)

1. Otevřete přihlašovací stránku v prohlížeči.
2. Klikněte na **„🔑 Zapomenuté heslo?"**.
3. Zadejte **záchranný kód** (hodnota `ADMIN_RESET_CODE` z docker-compose.yml).
4. Zadejte nové heslo a potvrďte.
5. Přihlaste se novým heslem.

### Reset hesla přes server (krajní případ)

Pokud neznáte ani záchranný kód, smažte soubor s uloženým heslem:

```bash
docker exec katalog-oopp rm -f /app/data/auth.json
```

Systém se vrátí k heslu z `ADMIN_RESET_CODE` v docker-compose.yml.  
Poté heslo znovu nastavte přes admin panel.

---

## Proměnné prostředí (docker-compose.yml)

| Proměnná | Výchozí hodnota | Popis |
|---|---|---|
| `PORT` | `3000` | Port, na kterém server naslouchá |
| `ADMIN_USERNAME` | `Gematex` | Přihlašovací jméno do správy |
| `ADMIN_PASSWORD` | `*(vaše heslo)*` | Heslo do správy (výchozí, přepíše auth.json) |
| `ADMIN_RESET_CODE` | `*(váš záchranný kód)*` | Záchranný kód pro reset hesla z prohlížeče |

---

## Rychlý přehled – co přežije restart/aktualizaci

| Co | Přežije restart? | Přežije aktualizaci? |
|---|---|---|
| Produkty a texty katalogu | ✅ ano (volume) | ✅ ano (volume) |
| Nahrané obrázky | ✅ ano (volume) | ✅ ano (volume) |
| Uložené heslo | ✅ ano (volume) | ✅ ano (volume) |
| Výchozí data (default.json) | ✅ ano (v image) | ✅ ano (v image) |
| Přihlašovací sessions | ❌ ne (in-memory) | ❌ ne | 

> Sessions jsou uloženy v paměti kontejneru — po restartu je potřeba se znovu přihlásit. Toto je záměrné chování z bezpečnostních důvodů.
