# QuickNotes Architecture

## 1. Requirements

### Functional requirements
- Users can register and log in.
- Users can create, view, edit and delete their notes.
- Users can tag notes and filter their notes by tag.
- Users can search and list their notes with pagination.

### Non-functional requirements
- **Scale:** support 1 million registered users.
- **Availability:** 99.9% uptime, with no single point of failure.
- **Latency:** loading a list of notes in under 300 ms for most users.
- **Durability:** a saved note is never lost (backups and replication).
- **Security:** passwords are hashed, all traffic uses HTTPS, and users
  can only see their own notes.
- **Consistency:** a user sees their own changes straight away;
  other devices may be a few seconds behind.

## 2. Load estimate (1 million users)

Assumptions: 20% of users are active daily (200,000 DAU); each views
their notes 20 times a day and makes 2 changes a day; an average note
takes 2 KB; peak traffic is 5 times the average; a day has
86,400 seconds.

- **Reads:** 200,000 x 20 = 4,000,000 per day = about **46 per second**
  on average, about **230 per second** at peak.
- **Writes:** 200,000 x 2 = 400,000 per day = about **5 per second**
  on average, about **25 per second** at peak.
- **Storage:** 400,000 x 2 KB = 800 MB per day = about **300 GB per
  year** (plan for about 500 GB with indexes and tags).
- **Conclusion:** the system is **read-heavy** (about 10 reads for each
  write), so we use a cache and a read replica.

## 3. Architecture diagram

```text
 +--------------------+
 |  Client            |
 |  (browser / app)   |
 +----+----------+----+
      |          |
      |          | 1. "Where is api.quicknotes.example?"
      |          v
      |    +-----------+
      |    |    DNS    |
      |    +-----------+
      |
      | static files (HTML, CSS, JS)        API requests
      v                                          |
 +-----------+                                   v
 |    CDN    |                         +------------------+
 | (static   |                         |  Load balancer   |
 |  files)   |                         +---+----------+---+
 +-----------+                             |          |
                                           v          v
                                    +----------+ +----------+
                                    | App      | | App      |
                                    | server 1 | | server 2 |   (more can
                                    +----+-----+ +-----+----+    be added)
                                         |             |
              +--------------------------+-------------+--------+
              |                          |                      |
              v                          v                      v
        +-----------+            +--------------+       +-------------+
        |   Cache   |            | Primary DB   |       |    Queue    |
        |  (Redis)  |            |   (writes)   |       | (background |
        +-----------+            +------+-------+       |    jobs)    |
              ^                         |               +------+------+
              | cache miss: read        | replication          |
              | from replica            v                      v
              |                  +--------------+       +-------------+
              +------------------| Read replica |       |   Worker    |
                                 |   (reads)    |       | (emails,    |
                                 +--------------+       |  search     |
                                                        |  indexing)  |
                                                        +-------------+
```

Reading the diagram: the client asks DNS for the address, gets static
files from the CDN, and sends API calls to the load balancer. The load
balancer picks an app server. App servers read from the cache or the
read replica, write to the primary database, and put slow jobs on the
queue for the worker.

## 4. What each component does

- **Client:** Solves the need for a screen where people write and read
  notes, by sending requests to the API.
- **DNS:** Solves the problem that people remember names, not numbers,
  by turning `api.quicknotes.example` into a server address.
- **CDN:** Solves slow loading of the app's HTML, CSS and JavaScript for
  faraway users by serving copies from servers near them.
- **Load balancer:** Solves one server being overloaded or failing by
  spreading requests across several healthy app servers.
- **App servers (two or more):** Solve the need to run the API logic
  (login, validation, notes) and can be added to handle more traffic.
- **Cache:** Solves repeated slow database reads by keeping popular
  results, such as a user's recent notes, in fast memory.
- **Primary database:** Solves reliable storage of users, notes and tags
  and handles every write.
- **Read replica:** Solves read overload on the primary by serving a
  copy of the data for the many read requests.
- **Queue:** Solves slow responses by letting the app server hand a slow
  job over and reply straight away.
- **Worker:** Solves heavy background work (sending emails, updating
  the search index) by doing it away from user requests.

## 5. Request flows

### GET /notes
1. The client asks DNS for the API address.
2. The client sends `GET /notes` with its token to the load balancer.
3. The load balancer forwards it to a healthy app server.
4. The app server checks the token (401 if missing or invalid).
5. The app server looks in the cache for this user's notes.
6. **Cache hit:** it returns the cached notes.
7. **Cache miss:** it reads the notes from the read replica, saves them
   in the cache for 60 seconds, and returns them.
8. The app server replies `200 OK` with the JSON list.

### POST /notes
1. The client sends `POST /notes` with a JSON body and its token to the
   load balancer.
2. The load balancer forwards it to an app server.
3. The app server checks the token and validates the body (title
   required, at most 100 characters; 400 if invalid).
4. The app server inserts the note, and its tags, in the primary
   database.
5. The app server deletes this user's cached notes, so the next read
   is fresh.
6. The app server puts a job on the queue (update the search index).
7. The app server replies `201 Created` with the new note.
8. The worker takes the job from the queue and updates the search index
   in the background.
9. The primary database copies the new note to the read replica.

## 6. Trade-offs

1. **Speed vs freshness (cache and read replica).** They make reads
   fast, but a replica can be a few seconds behind the primary. A
   second device might not see a brand new note instantly. We accept
   this because notes are not urgent, and we delete the user's cache
   after a write so they see their own changes.
2. **Fast replies vs instant results (queue).** The queue makes
   POST /notes fast, but search is updated a moment later and we have
   one more part to run and watch.
3. **Simplicity vs scale.** A single server would be simpler, but it
   would fail under 230 reads per second at peak and be a single point
   of failure. The extra parts cost more and are harder to run, but
   they bring reliability.

## 7. Avoiding single points of failure

- **DNS and CDN:** use a provider that has many servers around the world.
- **Load balancer:** run two, with automatic failover.
- **App servers:** run two or more. If one dies, the load balancer
  stops sending it traffic.
- **Cache:** run more than one node. If the cache is lost, requests
  fall back to the database (slower, but still working).
- **Primary database:** keep a replica that can be promoted to primary
  if the primary fails, and take regular backups.
- **Queue:** use a replicated queue so jobs are not lost, and run more
  than one worker.