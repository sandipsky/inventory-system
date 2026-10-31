# Inventory System — Backend

A REST API for managing inventory: products, purchases, sales, stock, and accounting (journals, ledgers, payments, reports). Built with **Spring Boot 3** and **Java 25**, using **SQLite** as the database — so there's no database server to install.

## What you need

You can run this app in one of two ways — pick whichever suits you:

| | You need |
|---|---|
| **Option A: Docker** (recommended) | Just [Docker](https://docs.docker.com/get-docker/) (or Docker Desktop) |
| **Option B: Run from source** | Java 25 (JDK) and `sqlite3` on your PATH |

---

## Option A: Run with Docker (easiest)

The Docker image is fully self-contained — it builds the app **and** prepares a ready-to-use database with all the required master data. No manual setup.

**1. Build the image** (from the repo root):

```bash
docker build -t inventory-system-be .
```

The first build takes a few minutes while Maven downloads dependencies. Later builds are much faster because those get cached.

**2. Run it:**

```bash
docker run -d --name inventory-system-be -p 8080:8080 \
  -v inventory-data:/app/data \
  -v inventory-uploads:/app/uploads \
  --restart unless-stopped \
  inventory-system-be
```

That's it. The API is now at **http://localhost:8080**.

On the very first start the container creates and seeds its database automatically. Your data lives in the `inventory-data` volume (and uploaded images in `inventory-uploads`), **not** inside the container — so you can stop, remove, and recreate the container without losing anything.

> **Prefer Docker Compose?** The repo includes a [docker-compose.yml](docker-compose.yml) that does the same thing:
> ```bash
> docker compose up -d --build
> ```

**Everyday commands:**

```bash
docker logs -f inventory-system-be    # watch the logs
docker stop inventory-system-be      # stop
docker start inventory-system-be     # start again (data intact)
```

**Made a code change?** Rebuild the image and recreate the container (your data is safe in the volumes):

```bash
docker build -t inventory-system-be .
docker rm -f inventory-system-be
docker run -d --name inventory-system-be -p 8080:8080 \
  -v inventory-data:/app/data -v inventory-uploads:/app/uploads \
  --restart unless-stopped inventory-system-be
```

(or simply `docker compose up -d --build` if you use Compose)

**Want to run it on another machine that has no internet/registry access?** Export the image to a file, copy it over, and load it:

```bash
# on your machine
docker save inventory-system-be | gzip > inventory-system-be.tar.gz

# on the target machine
docker load -i inventory-system-be.tar.gz
# then use the same `docker run` command as above
```

---

## Option B: Run from source (no Docker)

**1. Create the database.** The app needs a SQLite database pre-loaded with master data (accounts, document numbering, permissions). A helper script does this for you:

```bash
./reset.sh        # Linux / macOS
./reset.ps1       # Windows (PowerShell)
```

This creates `inventory_system.db` in the repo root from [database.sql](database.sql). Run it again any time you want a fresh, empty database (it deletes the old one — careful!).

**2. Start the app.** The Maven wrapper is included, so you don't need Maven installed:

```bash
./mvnw spring-boot:run     # Linux / macOS
mvnw.cmd spring-boot:run   # Windows
```

The API starts at **http://localhost:8080**. Uploaded profile images are stored in the `uploads/` folder.

**To build a deployable package** instead of running directly:

```bash
./mvnw clean package
```

This produces a WAR file in `target/` which you can either run directly (`java -jar target/*.war`) or deploy to an external Tomcat.

---

## Logging in

On first start the app creates a default admin user:

| Username | Password |
|---|---|
| `admin` | `Admin@123` |

Authenticate by POSTing to `/login`:

```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123"}'
```

You'll get back a JWT token. Send it on every other request as a header:

```
Authorization: Bearer <your-token>
```

All endpoints except `POST /login` and `GET /configurations` require this token. After 5 wrong password attempts an account is locked for 1 hour.

## Configuration

The defaults work out of the box. To change something, set these environment variables (or edit `src/main/resources/application.properties`):

| Variable | What it does | Default |
|---|---|---|
| `SPRING_DATASOURCE_URL` | Where the SQLite file lives | `jdbc:sqlite:inventory_system.db` |
| `FILE_UPLOAD_DIR` | Where uploaded images are stored | `uploads/` |
| `JWT_SECRET_KEY` | Secret used to sign auth tokens — **change this for any real deployment** | (development value) |

The Docker setup already points the database and uploads at the mounted volumes; for real deployments, set `JWT_SECRET_KEY` (there's a commented example in [docker-compose.yml](docker-compose.yml)).

## What's in the box

A quick map of the main API areas:

- **Masters** — products, categories, units, packings, tax types
- **Purchases** — vendors, purchase entries, purchase returns
- **Sales** — customers, sales entries, sales returns (entries are *cancelled*, not deleted)
- **Inventory** — stock adjustments, stock edits, opening stock
- **Accounting** — chart of accounts, journal vouchers, payments, opening balances
- **Reports** — purchase/sales registers, stock, ledgers, trial balance, dues
- **Admin** — users (with profile images), roles & permissions, document numbering, settings

Saving a purchase or sales entry automatically updates stock **and** posts the matching accounting journal — everything stays in balance without extra steps.

## Running tests

```bash
./mvnw test
```

## Troubleshooting

- **"Not enough Quantity In Stock"** — you're trying to sell/return more than is available; check the stock report.
- **Errors about missing accounts (e.g. "VAT Purchase")** — the database wasn't seeded. With Docker this can't normally happen; from source, run `./reset.sh` before first start.
- **Port 8080 already in use** — map a different one: `-p 9090:8080` (Docker) and use `http://localhost:9090`.
- **Fresh start wanted (Docker)** — `docker rm -f inventory-system-be && docker volume rm inventory-data inventory-uploads`, then run again. ⚠️ This deletes all data.
