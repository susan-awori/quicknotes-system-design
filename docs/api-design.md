# QuickNotes API Design

This is the REST API for the real QuickNotes service.
Base URL: `https://api.quicknotes.example/v1`
All requests and responses use JSON. Every endpoint except
`POST /auth/login` needs the header `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| POST | `/auth/login` | Log in and receive an access token | 200 OK |
| GET | `/notes` | List the logged-in user's notes (supports `?page=`, `?limit=` and `?tag=`) | 200 OK |
| GET | `/notes/{id}` | Get one note | 200 OK |
| POST | `/notes` | Create a note | 201 Created |
| PUT | `/notes/{id}` | Replace a note's title, body and tags | 200 OK |
| DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| GET | `/tags` | List all tags used by the user | 200 OK |

Notes:
- Paths use nouns (`/notes`), and the HTTP method says the action.
- `{id}` is a blank to fill in, for example `/notes/42`.
- A list can be filtered with a query parameter, for example
  `GET /notes?tag=work`.

## Examples

### Create a note: `POST /notes`

Request body:

```json
{
  "title": "Buy milk",
  "body": "Two litres of fresh milk",
  "tags": ["personal", "shopping"]
}
```

Response: `201 Created`

```json
{
  "id": 42,
  "title": "Buy milk",
  "body": "Two litres of fresh milk",
  "tags": ["personal", "shopping"],
  "user_id": 7,
  "created_at": "2026-10-18T09:30:00Z",
  "updated_at": "2026-10-18T09:30:00Z"
}
```

### List notes: `GET /notes?page=1&limit=2`

Response: `200 OK`

```json
{
  "page": 1,
  "limit": 2,
  "total": 57,
  "notes": [
    {
      "id": 42,
      "title": "Buy milk",
      "body": "Two litres of fresh milk",
      "tags": ["personal", "shopping"],
      "created_at": "2026-10-18T09:30:00Z"
    },
    {
      "id": 41,
      "title": "Project report",
      "body": "Send to Grace by Friday",
      "tags": ["work"],
      "created_at": "2026-10-17T14:05:00Z"
    }
  ]
}
```

## Error codes

| Status | Meaning | Example |
|---|---|---|
| 400 Bad Request | The request is wrong or incomplete | `POST /notes` with no title, or a title over 100 characters |
| 401 Unauthorized | The user is not logged in | Missing or expired token |
| 403 Forbidden | Logged in, but not allowed | Trying to delete another user's note |
| 404 Not Found | The thing does not exist | `GET /notes/9999` when no such note exists |
| 500 Internal Server Error | The server broke | The database is unreachable |

Every error uses the same body shape:

```json
{
  "error": {
    "code": 400,
    "message": "Title is required and must be 100 characters or fewer.",
    "field": "title"
  }
}
```