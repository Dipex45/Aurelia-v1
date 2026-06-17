# Aurelia Ops: Enterprise Database Backup, Snapshot, and PITR Policy

To safeguard core tenant records, attachment configurations, and message databases, Aurelia Ops implements a multi-tier database recovery strategy combining **Automated Daily/Hourly Backups**, **Point-In-Time Recovery (PITR)**, and **Semi-Annual Restore Drills**.

---

## 1. Automated Backups & Snapshot Policy

For managed postgres deployments (GCP Cloud SQL, AWS RDS, or Azure Database for PostgreSQL), snapshots are configured to run natively with zero impact on production latency.

| Backup Class | Frequency | Retention Period | Description | Storage Class |
| :--- | :--- | :--- | :--- | :--- |
| **Transaction Logs (WAL)** | Continuous (Every 5 mins) | 14 Days | Used for Point-in-Time Recovery (PITR) | Ultra-durable Cloud Storage (object-locked) |
| **Daily Full Snapshot** | Every 24 hours (Off-peak) | 30 Days | Complete hot snapshot of state | Standard Regional Cloud Storage |
| **Weekly Snapshot** | Sunday (Off-peak) | 12 Weeks | Weekly reference backup | Cool Cloud Storage |
| **Monthly Snapshot** | 1st of each month | 12 Months | Compliance/Historical archivals | Cold / Archive Storage |

---

## 2. Point-in-Time Recovery (PITR)

PITR allows Aurelia Ops to restore databases to any precise millisecond within the backup retention window (minimum 14 days), mitigating unintended deletions, tenant data corruption, or script injection issues.

### How it Works:
1. **Continuous WAL Archiving**: PostgreSQL Write-Ahead Logs (WAL) are streamed immediately and continuously to a highly available Object Storage bucket (e.g., GCS or S3) via `pg_receivewal` or managed Cloud SQL streaming.
2. **Reconstitution**: During restoration, the orchestrator retrieves the closest complete base backup *prior* to the target recovery time and starts PostgreSQL with `recovery_target_time` configured. PostgreSQL then replays WAL logs sequentially until the precise microsecond of the rollback target.

---

## 3. Disaster Recovery & Manual Backup Commands

Under self-hosted or dedicated PostgreSQL clusters, backups are automated via system cron using `pg_dump` and pgBackRest.

### Complete Hot Backup Script (`backup.sh`):
```bash
#!/usr/bin/env bash
set -euo pipefail

# Configurations
BACKUP_DIR="/var/backups/aureliaops"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/aureliaops_${TIMESTAMP}.sql.gz"

echo "[Backup] Starting hot backup for Aurelia Ops at ${TIMESTAMP}..."
mkdir -p "$BACKUP_DIR"

# Perform compressed schema-and-data dump
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

# Upload to Object Storage with customer-managed KMS key
gsutil cp "$BACKUP_FILE" "gs://aurelia-ops-vault-backups/"

echo "[Backup] Successfully verified and uploaded snapshot: aureliaops_${TIMESTAMP}.sql.gz"
```

### Complete Emergency Restore Script (`restore.sh`):
```bash
#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: ./restore.sh <GCS_SNAPSHOT_FILE_NAME>"
  exit 1
fi

SNAPSHOT=$1
LOCAL_FILE="/tmp/restore_${SNAPSHOT}"

echo "[Restore] Downloading snapshot ${SNAPSHOT}..."
gsutil cp "gs://aurelia-ops-vault-backups/${SNAPSHOT}" "$LOCAL_FILE"

echo "[Restore] WARNING: This will drop the current database schema. Proceed? (y/N)"
read -r CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "[Restore] Aborted by administrator."
  exit 1
fi

echo "[Restore] Disconnecting active application threads and running database rebuild..."
# Run full schema drop/rollback using the build scripts
npm run db:rollback

echo "[Restore] Reassembling database tables..."
gunzip -c "$LOCAL_FILE" | psql "$DATABASE_URL"

echo "[Restore] Running migration validation..."
npm run db:migrate

echo "[Restore] Database restore complete and validated."
```

---

## 4. Disaster Recovery (DR) and Restore testing

### Restore Verification Drills (Run Semi-Annually)
A backup is only as good as its restore execution time. The operations team carries out these drills:
1. **Isolate a Drill Sandbox**: Instantiate a secondary, isolated PostgreSQL container/instance.
2. **Retrieve Random Snapshot**: Programmatically pick a backup snapshot from the storage bucket dating back 7–14 days.
3. **Execute Restore Pipeline**: Stream and run the restore scripts inside the sandbox.
4. **Integrity Check Validation**: Run automatic validation queries to verify the row counts of accounts, tickets, workspace_members, and messages.
5. **Report Performance Metrics**: Capture and document the time elapsed (RTO/RPO stats) in the compliance logs.
