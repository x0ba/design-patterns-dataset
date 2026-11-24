CREATE TABLE tasks (
  id                  TEXT PRIMARY KEY,
  kind                TEXT NOT NULL,
  parent_id           TEXT REFERENCES tasks(id),
  status              TEXT NOT NULL,
  prev_status         TEXT,
  status_reason       TEXT,
  entered_status_at   INTEGER NOT NULL,
  priority            INTEGER NOT NULL,
  group_key           TEXT NOT NULL,
  attempt             INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL,
  next_retry_at       INTEGER,
  pid                 INTEGER,
  pid_started_at      INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL,
  input_json          TEXT NOT NULL,
  progress_json       TEXT,
  output_json         TEXT,
  last_error_json     TEXT
);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority, created_at);
CREATE INDEX idx_tasks_group           ON tasks(group_key, status);
CREATE INDEX idx_tasks_next_retry      ON tasks(next_retry_at) WHERE status = 'retry-scheduled';
CREATE INDEX idx_tasks_parent          ON tasks(parent_id);
CREATE TABLE attempts (
  id                  TEXT PRIMARY KEY,
  task_id             TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  attempt_number      INTEGER NOT NULL,
  started_at          INTEGER NOT NULL,
  ended_at            INTEGER,
  exit_code           INTEGER,
  error_category      TEXT,
  stdout_tail         TEXT,
  stderr_tail         TEXT,
  raw_args_hash       TEXT NOT NULL
);
CREATE INDEX idx_attempts_task ON attempts(task_id, attempt_number);
CREATE TABLE process_journal (
  seq                 INTEGER PRIMARY KEY AUTOINCREMENT,
  ts                  INTEGER NOT NULL,
  op                  TEXT NOT NULL,
  task_id             TEXT NOT NULL,
  attempt_id          TEXT,
  pid                 INTEGER NOT NULL,
  pid_started_at      INTEGER,
  exit_code           INTEGER,
  signal              TEXT
);
CREATE INDEX idx_journal_task ON process_journal(task_id);
CREATE INDEX idx_journal_open ON process_journal(op) WHERE op = 'spawn';
CREATE TABLE schema_meta (
  key                 TEXT PRIMARY KEY,
  value               TEXT NOT NULL
);
CREATE TABLE transcripts (
  id                      TEXT PRIMARY KEY,
  download_task_id        TEXT NOT NULL,
  transcription_task_id   TEXT NOT NULL,
  result_kind             TEXT NOT NULL,
  model_version           TEXT NOT NULL,
  language                TEXT,
  source_file_path        TEXT,
  superseded_at           INTEGER,
  created_at              INTEGER NOT NULL,
  updated_at              INTEGER NOT NULL
, asr_tier TEXT, source_kind TEXT);
CREATE INDEX idx_transcripts_download ON transcripts(download_task_id, created_at);
CREATE INDEX idx_transcripts_task ON transcripts(transcription_task_id);
CREATE TABLE transcript_speakers (
  id              TEXT PRIMARY KEY,
  transcript_id   TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  speaker_key     TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  sort_index      INTEGER NOT NULL
);
CREATE INDEX idx_transcript_speakers_transcript
  ON transcript_speakers(transcript_id, sort_index);
CREATE TABLE transcript_segments (
  id              TEXT PRIMARY KEY,
  transcript_id   TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  speaker_id      TEXT,
  start_ms        INTEGER NOT NULL,
  end_ms          INTEGER NOT NULL,
  text            TEXT NOT NULL,
  confidence      REAL,
  sort_index      INTEGER NOT NULL
, words_json TEXT);
CREATE INDEX idx_transcript_segments_time
  ON transcript_segments(transcript_id, start_ms);
CREATE TABLE subscriptions (
  id                          TEXT PRIMARY KEY,
  title                       TEXT NOT NULL,
  source_url                  TEXT NOT NULL,
  feed_url                    TEXT NOT NULL,
  platform                    TEXT NOT NULL,
  keywords                    TEXT NOT NULL,
  tags                        TEXT NOT NULL,
  only_latest                 INTEGER NOT NULL,
  enabled                     INTEGER NOT NULL,
  cover_url                   TEXT,
  latest_video_title          TEXT,
  latest_video_published_at   INTEGER,
  last_checked_at             INTEGER,
  last_success_at             INTEGER,
  status                      TEXT NOT NULL,
  last_error                  TEXT,
  created_at                  INTEGER NOT NULL,
  updated_at                  INTEGER NOT NULL,
  download_directory          TEXT,
  naming_template             TEXT
, auto_download INTEGER NOT NULL DEFAULT 1, download_type TEXT, download_quality TEXT, download_container TEXT);
CREATE TABLE subscription_items (
  subscription_id   TEXT NOT NULL,
  item_id           TEXT NOT NULL,
  title             TEXT NOT NULL,
  url               TEXT NOT NULL,
  published_at      INTEGER NOT NULL,
  thumbnail         TEXT,
  added             INTEGER NOT NULL,
  task_id           TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  PRIMARY KEY (subscription_id, item_id)
);
CREATE INDEX idx_subscription_items_sub  ON subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_task ON subscription_items(task_id);
CREATE TABLE subscriptions_meta (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);
INSERT INTO schema_meta VALUES('task_queue_version','1');
