#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
db_path="$root/inventory_system.db"
sql_path="$root/database.sql"

if [ -f "$db_path" ]; then
    rm -f "$db_path"
    echo "Deleted existing $db_path"
fi

: > "$db_path"
echo "Created $db_path"

sqlite3 "$db_path" ".read $sql_path"
echo "Loaded schema from $sql_path"
