#!/bin/sh
set -e

# First boot on an empty data volume: initialize from the seed database
# baked into the image (schema + required master data from database.sql).
if [ ! -f /app/data/inventory_system.db ]; then
    echo "No database found at /app/data — initializing from bundled seed"
    cp /app/seed/inventory_system.db /app/data/inventory_system.db
fi

exec java -jar /app/app.war "$@"
