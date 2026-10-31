# Inventory System

An inventory management app for keeping track of products, purchases, sales and stock, with the accounting built in. When you save a purchase or a sale, the stock updates and the matching accounting entry is posted for you.

The project has two parts:

| Folder | What it is | Built with |
|---|---|---|
| [`backend/`](backend/) | REST API: the business logic and the database | Spring Boot 3, Java 25, SQLite |
| [`frontend/`](frontend/) | Web app that people use in the browser | Angular 22 |

> The backend is finished. The frontend is still being built: right now it's a fresh Angular project.

## What it does

- **Masters**: products, categories, units, packings and tax types
- **Purchases**: vendors, purchase entries and purchase returns
- **Sales**: customers, sales entries and sales returns
- **Inventory**: stock adjustments, stock edits and opening stock
- **Accounting**: chart of accounts, journal vouchers, payments and opening balances
- **Reports**: purchase/sales registers, stock, ledgers, trial balance and dues
- **Admin**: users, roles and permissions, document numbering and settings

---

## Running the backend

The database is SQLite, which is just a file, so you don't need to install a database server.

You can run the backend with **Docker** (easiest) or **straight from the source code**.

### Option 1: With Docker (recommended)

You only need [Docker](https://docs.docker.com/get-docker/) installed.

```bash
cd backend
docker compose up -d --build
```

That's it. The API runs at **http://localhost:8080**.

- The first build takes a few minutes while it downloads dependencies. Later builds are faster.
- On first start, the database is created and filled with the required starting data for you.
- Your data is kept in Docker volumes (`inventory-data` and `inventory-uploads`), so stopping or rebuilding the container won't delete it.

Useful commands (run them inside `backend/`):

```bash
docker compose logs -f          # watch the logs
docker compose down             # stop it
docker compose up -d --build    # rebuild after changing code
```

<details>
<summary>Without Docker Compose (plain <code>docker</code> commands)</summary>

```bash
cd backend
docker build -t inventory-system-be .
docker run -d --name inventory-system-be -p 8080:8080 \
  -v inventory-data:/app/data \
  -v inventory-uploads:/app/uploads \
  --restart unless-stopped \
  inventory-system-be
```

</details>

### Option 2: From the source code

You need **Java 25 (JDK)** and **`sqlite3`**. You don't need to install Maven because the project includes its own Maven wrapper (`mvnw`).

**Step 1: Create the database** (only the first time, or when you want a clean start):

```bash
cd backend
./reset.sh          # Linux / macOS
.\reset.ps1         # Windows (PowerShell). Uses the bundled sqlite3.exe
```

This creates `inventory_system.db` and loads the starting data into it.
⚠️ Running it again **deletes** the existing database and all its data.

**Step 2: Start the app:**

```bash
./mvnw spring-boot:run     # Linux / macOS   (or ./run.sh)
mvnw.cmd spring-boot:run   # Windows         (or run.bat / run.ps1)
```

The API runs at **http://localhost:8080**.

### Logging in and trying the API

The first time it starts, the backend creates an admin user:

| Username | Password |
|---|---|
| `admin` | `Admin@123` |

- **API docs (Swagger UI):** http://localhost:8080/swagger-ui.html. You can browse and try every endpoint there.
- To log in, send the username and password to `POST /login`. You get back a token. Send that token on every other request as `Authorization: Bearer <token>`.

**How to call each endpoint, with example requests and responses:** see [`backend/endpoints.md`](backend/endpoints.md).

For more detail, like configuration options, building a WAR file, running tests and troubleshooting, see [`backend/README.md`](backend/README.md).

---

## Running the frontend

You need [Node.js](https://nodejs.org/) installed (an LTS version; this project was set up with Node 24). npm comes with Node.

**Step 1: Install dependencies** (only the first time, or after `package.json` changes):

```bash
cd frontend
npm install
```

**Step 2: Start the development server:**

```bash
npm start
```

Open **http://localhost:4200** in your browser. The page reloads automatically when you change the code.

Other useful commands:

```bash
npm run build    # production build, output goes to frontend/dist/
npm test         # run the unit tests (Vitest)
```

---

## Running everything together

1. Start the backend (Docker or from source). It runs on **http://localhost:8080**.
2. Start the frontend with `npm start`. It runs on **http://localhost:4200**.
3. Open http://localhost:4200 in your browser.

The backend already allows requests from the frontend (CORS is set up), so you don't need any extra configuration for local development.

## Project structure

```
inventory-system/
├── backend/             Spring Boot API
│   ├── src/             Java source code
│   ├── endpoints.md     API guide with example requests
│   ├── database.sql     Database structure and starting data
│   ├── Dockerfile       Docker image definition
│   ├── docker-compose.yml
│   └── reset.sh / run.sh and the Windows versions
├── frontend/            Angular web app
│   ├── src/             Angular source code
│   └── package.json
├── .gitignore
└── README.md
```
