# Production Database Migration Guide

## Overview

This guide explains how to safely add the `deletedAt` column to existing production PostgreSQL databases for the soft delete functionality.

## Automatic Migration (Recommended)

The application now includes automatic migration logic that will:

1. Check if the `deletedAt` column exists
2. Add it if missing during application startup
3. Create an index for better query performance
4. Continue startup even if migration fails (with warnings)

### How it works:

- On application startup, the `EnvironmentDatabase.runMigrations()` method is called
- It safely adds the `deletedAt` column without affecting existing data
- All existing records will have `deletedAt = NULL` (not deleted)

## Manual Migration (For DBAs)

If you prefer to run migrations manually or the automatic migration fails, use these SQL scripts:

### PostgreSQL Production Migration

```sql
-- 1. Add deletedAt column to environments table
ALTER TABLE environments
ADD COLUMN "deletedAt" TIMESTAMP NULL DEFAULT NULL;

-- 2. Create index for better query performance (use CONCURRENTLY for production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS environments_deleted_at_idx
ON environments ("deletedAt");

-- 3. Verify the migration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'environments' AND column_name = 'deletedAt';

-- 4. Check index creation
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'environments' AND indexname = 'environments_deleted_at_idx';
```

### SQLite Migration (if used in production)

```sql
-- Add deletedAt column to environments table
ALTER TABLE environments
ADD COLUMN deletedAt DATETIME NULL DEFAULT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS environments_deleted_at_idx
ON environments (deletedAt);

-- Verify the migration
PRAGMA table_info(environments);
```

## Pre-Migration Checklist

### 1. Backup Database

```bash
# PostgreSQL backup
pg_dump -h your-host -U your-user -d your-database > backup_before_migration.sql

# Or for compressed backup
pg_dump -h your-host -U your-user -d your-database | gzip > backup_before_migration.sql.gz
```

### 2. Test Migration on Staging

- Run the migration on a staging environment first
- Verify the application starts successfully
- Test soft delete functionality
- Ensure existing environments still work

### 3. Plan Downtime (if needed)

- The `ALTER TABLE` operation should be quick for most table sizes
- Using `CREATE INDEX CONCURRENTLY` minimizes lock time
- Consider maintenance window if you have a very large environments table

## Post-Migration Verification

### 1. Check Column Exists

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'environments' AND column_name = 'deletedAt';
```

### 2. Check Index Performance

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM environments WHERE "deletedAt" IS NULL;
```

### 3. Test Soft Delete Functionality

```javascript
// Test through your API
// 1. Create test environment
const env = await broker.call('environments-store.create', {
  environment: testData
});

// 2. Soft delete it
await broker.call('environments-store.remove', { uuid: env.environment.uuid });

// 3. Verify it's not in regular list
const envs = await broker.call('environments-store.list');
// Should not contain the deleted environment

// 4. Check it appears in deleted list
const deletedEnvs = await broker.call('environments-store.listDeleted');
// Should contain the deleted environment

// 5. Restore it
await broker.call('environments-store.restore', { uuid: env.environment.uuid });

// 6. Verify it's back in regular list
const restoredEnvs = await broker.call('environments-store.list');
// Should contain the restored environment
```

## Rollback Plan (Emergency)

If you need to rollback the migration:

```sql
-- Remove the deletedAt column (THIS WILL LOSE SOFT DELETE DATA)
ALTER TABLE environments DROP COLUMN "deletedAt";

-- Remove the index
DROP INDEX IF EXISTS environments_deleted_at_idx;
```

**⚠️ Warning**: Rolling back will permanently delete all soft-delete information. Make sure to export any needed data first.

## Monitoring

### Check Migration Status in Application Logs

Look for these log messages during startup:

- `🔄 Adding deletedAt column to environments table` - Migration in progress
- `✅ deletedAt column added successfully` - Migration successful
- `✅ deletedAt column already exists` - Already migrated
- `❌ Failed to add deletedAt column` - Migration failed

### Database Monitoring Queries

```sql
-- Count total environments
SELECT COUNT(*) as total_environments FROM environments;

-- Count active (not deleted) environments
SELECT COUNT(*) as active_environments FROM environments WHERE "deletedAt" IS NULL;

-- Count soft-deleted environments
SELECT COUNT(*) as deleted_environments FROM environments WHERE "deletedAt" IS NOT NULL;

-- Recent deletions (last 7 days)
SELECT COUNT(*) as recent_deletions
FROM environments
WHERE "deletedAt" > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Migration Fails During Startup

1. Check application logs for specific error messages
2. Verify database permissions (ALTER TABLE, CREATE INDEX)
3. Check disk space for index creation
4. Consider running manual migration

### Performance Issues After Migration

1. Verify index was created: `EXPLAIN` your queries
2. Update table statistics: `ANALYZE environments;`
3. Monitor query performance

### Need to Clean Up Old Soft-Deleted Records

```sql
-- Permanently delete records older than 90 days (adjust as needed)
DELETE FROM environments
WHERE "deletedAt" IS NOT NULL
AND "deletedAt" < NOW() - INTERVAL '90 days';
```
