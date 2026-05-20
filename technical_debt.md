# FinansKoçu Technical Debt

## Data Management & Sync

### Restore/Reset Atomicity (SETTINGS-DATA-1C)
- **Status**: Identified
- **Problem**: Current `importData` and `resetData` flows perform multiple independent HTTP calls (delete then multiple inserts). This is not atomic. If a middle step fails, the user is left with a partial/broken state.
- **Solution**: Replace client-side multi-request logic with a single server-side PostgreSQL function (RPC).
- **Benefit**: Ensures that either the entire restore happens or nothing happens, preventing data corruption.

### Transaction Creation Atomicity (BALANCE-2)
- **Status**: Identified
- **Problem**: `Transaction.create` and `Account.update` are executed as two separate client-side requests. If `Account.update` fails (e.g., due to constraint), the transaction is saved but the balance is not updated, requiring client-side rollback mechanisms which are unreliable.
- **Solution**: Transaction create + balance sync should move to Supabase RPC / DB trigger for atomicity.
- **Benefit**: Absolute data integrity preventing silent data corruption for account balances.

## AI Assistant

### Parser Timeouts
- **Status**: Hardened (Multi-pass lookup)
- **Debt**: Large PDF processing still happens in the main thread/request cycle.
- **Solution**: Move to background worker or async job queue for report processing.
