const API_URL = "https://jsonplaceholder.typicode.com/posts";
const STORAGE_KEY = "quicknotes-local-notes";

const loadBtn = document.getElementById("load-btn");
const statusMsg = document.getElementById("status");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");
const notesList = document.getElementById("notes-list");

/* One reusable helper for EVERY request.
   It calls fetch, checks response.ok, and throws if the server says no. */
async function request(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error("Server answered with status " + response.status);
  }

  const data = await response.json();
  return { data: data, status: response.status };
}

/* ---------- Saved notes (our own memory) ----------
   JSONPlaceholder is a fake API: it replies "created" but does not store
   the note. So we also keep notes created on this page in localStorage,
   and they survive a refresh. */
function getSavedNotes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function setSavedNotes(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error(error);
  }
}

/* ---------- Small helpers ---------- */
function setStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = type; // "loading", "success" or "error"
}

function setBusy(busy) {
  loadBtn.disabled = busy;
  submitBtn.disabled = busy;
  for (const btn of notesList.querySelectorAll("button")) {
    btn.disabled = busy;
  }
}

function showEmptyState() {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "No notes to show yet.";
  notesList.appendChild(li);
}

function removeEmptyState() {
  const empty = notesList.querySelector("li.empty");
  if (empty) {
    empty.remove();
  }
}

/* Draw one note. User text goes in with textContent only. */
function createNoteItem(note, isLocal) {
  const li = document.createElement("li");
  li.dataset.id = note.id;
  li.dataset.local = isLocal ? "true" : "false";
  li.dataset.key = note.key || "";

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = isLocal ? "New" : "#" + note.id;

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body || "(no body)";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn";

  li.append(badge, title, body, deleteBtn);
  return li;
}

/* Put the saved notes at the top of the list (newest first) */
function renderSavedNotes() {
  for (const note of getSavedNotes()) {
    notesList.prepend(createNoteItem(note, true));
  }
}

/* ---------- GET: load notes ---------- */
async function loadNotes() {
  setStatus("Loading notes...", "loading");
  setBusy(true);

  try {
    const result = await request(API_URL + "?_limit=10");
    const notes = result.data;

    notesList.textContent = ""; // empty the list first

    for (const note of notes) {
      notesList.appendChild(createNoteItem(note, false));
    }
    renderSavedNotes();

    if (notes.length === 0) {
      if (notesList.children.length === 0) {
        showEmptyState();
      }
      setStatus("The server has no notes.", "success");
    } else {
      setStatus("Loaded " + notes.length + " notes from the server.", "success");
    }
  } catch (error) {
    setStatus("Sorry, we could not load your notes. Please try again.", "error");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

/* ---------- POST: create a note ---------- */
async function createNote(event) {
  event.preventDefault(); // stop the page from reloading

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: title required, max 100 characters. Body is optional.
  if (title === "") {
    setStatus("Please enter a title.", "error");
    titleInput.focus();
    return;
  }
  if (title.length > 100) {
    setStatus("The title is too long (" + title.length + " characters). The maximum is 100.", "error");
    titleInput.focus();
    return;
  }

  setStatus("Creating note...", "loading");
  setBusy(true);

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, body: body, userId: 1 })
    });

    // The server always says id 101, so we give our own unique key
    const note = {
      id: result.data.id,
      key: "local-" + Date.now(),
      title: title,
      body: body
    };

    const saved = getSavedNotes();
    saved.push(note);
    setSavedNotes(saved);

    removeEmptyState();
    notesList.prepend(createNoteItem(note, true)); // top of the list

    setStatus("Note created (status " + result.status + ", id " + result.data.id + ").", "success");
    noteForm.reset(); // clear the form
  } catch (error) {
    setStatus("Sorry, we could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

/* ---------- DELETE: remove a note ----------
   DELETE approach (JSONPlaceholder note):
   JSONPlaceholder is a fake API. It answers POST requests with "created"
   (always id 101) but does NOT store the new note, so a later
   DELETE /posts/101 would not delete anything real.
   - Notes loaded from the server (ids 1-10): we send a real
     DELETE /posts/{id} and remove the note from the list only after
     the server replies with success.
   - Notes created on this page (isLocal = true): they only exist in the
     page and in localStorage, so we remove them from both and skip the
     server call.
   With a real backend, every note would be deleted with DELETE /notes/{id}. */
async function deleteNote(li) {
  const id = li.dataset.id;
  const isLocal = li.dataset.local === "true";

  setBusy(true);

  try {
    if (isLocal) {
      const remaining = getSavedNotes().filter(function (note) {
        return note.key !== li.dataset.key;
      });
      setSavedNotes(remaining);
      setStatus("Note removed. It only existed on this page, so no server call was needed.", "success");
    } else {
      setStatus("Deleting note " + id + "...", "loading");
      const result = await request(API_URL + "/" + id, { method: "DELETE" });
      setStatus("Note " + id + " deleted (status " + result.status + ").", "success");
    }

    li.remove();

    if (notesList.children.length === 0) {
      showEmptyState();
    }
  } catch (error) {
    setStatus("Sorry, we could not delete that note. Please try again.", "error");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

/* ---------- Wire everything up ---------- */
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

// One listener on the list handles every Delete button (event delegation)
notesList.addEventListener("click", function (event) {
  if (event.target.classList.contains("delete-btn")) {
    deleteNote(event.target.closest("li"));
  }
});

// When the page opens: show saved notes, or the empty message
notesList.textContent = "";
renderSavedNotes();
if (notesList.children.length === 0) {
  showEmptyState();
}