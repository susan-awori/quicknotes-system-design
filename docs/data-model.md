# QuickNotes Data Model

## Entities

### users
| Column | Type | Key / rules |
|---|---|---|
| id | INTEGER | Primary key |
| email | TEXT | NOT NULL, UNIQUE |
| name | TEXT | NOT NULL |
| password_hash | TEXT | NOT NULL |
| created_at | TEXT | NOT NULL |

### notes
| Column | Type | Key / rules |
|---|---|---|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users(id), NOT NULL |
| title | TEXT | NOT NULL, max 100 characters |
| body | TEXT | Optional |
| created_at | TEXT | NOT NULL |
| updated_at | TEXT | NOT NULL |

### tags
| Column | Type | Key / rules |
|---|---|---|
| id | INTEGER | Primary key |
| name | TEXT | NOT NULL, UNIQUE |

### note_tags (join table)
| Column | Type | Key / rules |
|---|---|---|
| note_id | INTEGER | Foreign key to notes(id) |
| tag_id | INTEGER | Foreign key to tags(id) |

Primary key of `note_tags`: the pair (`note_id`, `tag_id`).

## Relationships

- **users to notes: one-to-many.** One user has many notes, but each
  note belongs to exactly one user (`notes.user_id`).
- **notes to tags: many-to-many.** A note can have many tags (work,
  urgent) and a tag can be on many notes.
- **Why `note_tags`?** A table cannot store a list in one cell. The
  join table turns one many-to-many relationship into two one-to-many
  relationships: one note has many `note_tags` rows, and one tag has
  many `note_tags` rows. The composite primary key also stops the same
  tag being added to the same note twice.

## CREATE TABLE statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL CHECK (length(title) <= 100),
  body       TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags(id)
);
```

## Example queries

**1. The newest 10 notes for one user** (supports `GET /notes`)

```sql
SELECT id, title, created_at
FROM notes
WHERE user_id = 7
ORDER BY created_at DESC
LIMIT 10;
```

**2. All notes with a given tag, using JOINs** (supports `GET /notes?tag=work`)

```sql
SELECT notes.id, notes.title
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags      ON tags.id = note_tags.tag_id
WHERE notes.user_id = 7
  AND tags.name = 'work';
```

**3. How many notes each tag has**

```sql
SELECT tags.name, COUNT(note_tags.note_id) AS note_count
FROM tags
LEFT JOIN note_tags ON note_tags.tag_id = tags.id
GROUP BY tags.id, tags.name
ORDER BY note_count DESC;
```

## Indexes

```sql
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);
CREATE INDEX idx_note_tags_tag_id   ON note_tags(tag_id);
```

- `idx_notes_user_created`: almost every request is "show this user's
  newest notes". Without the index the database reads every note of
  every user. With it, it jumps straight to one user's notes, already
  sorted by date.
- `idx_note_tags_tag_id`: the primary key already helps find tags for a
  note, but finding notes for a tag searches by `tag_id`, so it needs
  its own index.

## SQL or NoSQL?

I choose SQL (a relational database such as PostgreSQL). QuickNotes
data is structured and connected: users own notes, and notes and tags
are linked many-to-many. SQL enforces rules for us, such as unique
emails, a note that must belong to a real user, and no duplicate tags
on a note. It also answers questions across tables with JOIN. A NoSQL
document store could save each note with its tags inside it, which is
simple, but then counting notes per tag or renaming a tag would be
harder and could become inconsistent. One million users is well within
what a single SQL primary with read replicas can handle.