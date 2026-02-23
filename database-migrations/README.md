# Database Migrations - Complete Guides

## 📁 Files (7 SQL + 1 README)

### SQL Files:
1. **01-DEPLOY-FUNCTIONS-FIRST.sql** - Core functions & triggers
2. **CLUSTER-MIGRATION-CHAR-TO-VARCHAR.sql** - CHAR(1) → VARCHAR(5) migration
3. **FINAL-CLUSTER-CASCADE-TRIGGER-SOLUTION.sql** - Auto cluster rename + status fix
4. **FK-CONSTRAINTS-SETUP.sql** - Foreign key constraints
5. **RLS-COMPLETE-SETUP.sql** - Row Level Security (multi-warehouse isolation)
6. **PRODUCTION-DEPLOYMENT-PACKAGE.sql** - Production deployment checklist
7. **UTILITY-SCRIPTS.sql** - Debug, cleanup, maintenance utilities

---

## 🚀 Quick Start

### Development/Staging:
```sql
\i 01-DEPLOY-FUNCTIONS-FIRST.sql
\i CLUSTER-MIGRATION-CHAR-TO-VARCHAR.sql
\i FINAL-CLUSTER-CASCADE-TRIGGER-SOLUTION.sql
\i FK-CONSTRAINTS-SETUP.sql
\i RLS-COMPLETE-SETUP.sql
```

### Production:
```sql
\i PRODUCTION-DEPLOYMENT-PACKAGE.sql
\i FK-CONSTRAINTS-SETUP.sql
\i RLS-COMPLETE-SETUP.sql
```

---

## 🛠️ Troubleshooting

**Orphaned stock:**
```sql
SELECT * FROM debug_check_orphaned_stock('warehouse-id');
SELECT * FROM quickfix_restore_orphaned_stock('warehouse-id', 'A', 'A1');
```

**Whitespace issues:**
```sql
SELECT * FROM debug_check_whitespace();
SELECT * FROM cleanup_cluster_whitespace();
```

**Health check:**
```sql
SELECT * FROM health_check_database();
```

---

## 📋 Key Features

✅ **Auto cluster rename** - CASCADE + triggers handle everything  
✅ **Status correction** - No more "salah-cluster" when renaming  
✅ **Multi-character clusters** - Support A1, B1, B2, etc (up to 5 chars)  
✅ **Multi-warehouse security** - RLS isolates data per warehouse  
✅ **Production ready** - Complete deployment package with rollback  
✅ **Utility functions** - SQL functions for debug & maintenance  

---

## 📝 Important Notes

- **Backup** database sebelum migration
- **Test** di dev/staging dulu
- **Rollback** plan ada di setiap file
- CASCADE triggers = **no manual fix needed**
- RLS = **required** untuk production

---

## 🔄 Consolidation History

**Before**: 22 SQL files + 13 MD files = 35 files  
**After**: 7 SQL files + 1 README = 8 files  
**Savings**: 77% reduction (27 files deleted)

All old migration, debug, cleanup, RLS, FK, and production files have been consolidated into the 7 main SQL files above.
