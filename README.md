# QuickNotes System Design

QuickNotes is a note-taking app that is moving from a browser-only app
to an online service for 1 million users. This repository has two parts:

1. **An API client** (HTML, CSS and JavaScript) that proves a web page
   can load, create and delete notes through a REST API. It uses the
   JSONPlaceholder practice API.
2. **Design documents** for the real backend: the API, the data model
   and the system architecture.

## How to run the API client

1. Clone the repository:
   `git clone https://github.com/YOUR-USERNAME/quicknotes-system-design.git`
2. Open the folder in VS Code.
3. Right-click `index.html` and choose **Open with Live Server**
   (or just open `index.html` in a browser).
4. Click **Load notes** to fetch 10 notes, use the form to create a
   note, and click **Delete** to remove one.

Note: JSONPlaceholder is a fake API. It accepts new notes but does not
store them, so notes created in the page are removed locally when
deleted. This is explained in a comment in `api.js`.

## Documents

- [API design](docs/api-design.md)
- [Data model](docs/data-model.md)
- [Architecture](docs/architecture.md)

## What I learned

- How to use `fetch` with `async` / `await`, check `response.ok`, and
  handle errors with `try` / `catch` / `finally`.
- How to show loading, success, error and empty states and disable
  buttons while a request is running.
- How to design a RESTful API with the right methods, paths and
  status codes.
- How a join table models a many-to-many relationship.
- How caches, read replicas, queues and load balancers work together,
  and how to estimate load from simple assumptions.