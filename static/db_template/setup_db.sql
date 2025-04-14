-- -----------------------------------------------------
-- Table connections.user
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS user (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sid TEXT,
  UNIQUE (user_id)
);

-- -----------------------------------------------------
-- Table connections.session
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS session (
  session_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL UNIQUE,
  status INT NOT NULL,
  stype TEXT CHECK( stype IN ('DEFAULT','SINGULAR') ) NOT NULL DEFAULT 'DEFAULT'
);

-- -----------------------------------------------------
-- Table connections.connection
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS connection (
  connection_id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user (user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (session_key) REFERENCES session (session_key) ON DELETE CASCADE ON UPDATE CASCADE
);