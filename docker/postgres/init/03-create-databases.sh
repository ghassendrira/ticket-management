#!/bin/bash
set -e

export PGPASSWORD="$POSTGRES_PASSWORD"

for DB in auth_db ticket_management notification_db assignment_db; do
  if ! psql -U "$POSTGRES_USER" -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = '$DB'" | grep -q 1; then
    echo "Creating database $DB"
    psql -U "$POSTGRES_USER" -h localhost -c "CREATE DATABASE $DB;"
    psql -U "$POSTGRES_USER" -h localhost -c "GRANT ALL PRIVILEGES ON DATABASE $DB TO $POSTGRES_USER;"
  else
    echo "Database $DB already exists"
  fi
done
