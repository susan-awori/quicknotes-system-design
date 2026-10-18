const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.getElementById("load-btn");
const statusMsg = document.getElementById("status");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");
const notesList = document.getElementById("notes-list");

let localCounter = 0; // give each note created a unique page-only number

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

function createNoteItem(note, isLocal) {
  const li = document.createElement("li");
  li.dataset.id = note.id;
  li.dataset.local = isLocal ? "true" : "false";
  li.dataset.localKey = isLocal ? String(++localCounter) : "";

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body || "(no body)";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  deleteBtn.className = "delete-btn";

  li.append(title, body, deleteBtn);
  return li;
}

async function loadNotes() {
  setStatus("Loading notes...", "loading");
  setBusy(true);

  try {
    const result = await request(API_URL + "?_limit=10");
    const notes = result.data;

    notesList.textContent = ""; // empty the list first

    if (notes.length === 0) {
      showEmptyState();
      setStatus("The server has no notes.", "success");
    } else {
      for (const note of notes) {
        notesList.appendChild(createNoteItem(note, false));
      }
      setStatus("Loaded " + notes.length + " notes from the server.", "success");
    }
  } catch (error) {
    setStatus("Sorry, we could not load your notes. Please try again.", "error");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

loadBtn.addEventListener("click", loadNotes);
showEmptyState();

async function createNote(event) {
  event.preventDefault(); // stop the page from reloading

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();as

  // title required only body is optional.
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

    removeEmptyState();
    notesList.prepend(createNoteItem(result.data, true)); // top of the list

    setStatus("Note created (status " + result.status + ", id " + result.data.id + ").", "success");
    noteForm.reset(); // clear the form
  } catch (error) {
    setStatus("Sorry, we could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    setBusy(false);
  }
}

noteForm.addEventListener("submit", createNote);