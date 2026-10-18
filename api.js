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