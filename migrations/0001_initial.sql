-- Bills table
CREATE TABLE bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for querying by due day
CREATE INDEX idx_bills_due_day ON bills(due_day);
