from app.model.session import Session
from app.model.user import User
from app.model.connection import Connection

from app.tools.singleton import Singleton

from .. import app_logger, data_dir 

import sqlite3
import os

logger = app_logger.logger

_path_to_db_template = "static/db_template/setup_db.sql"

class ConnectionManager(metaclass=Singleton):
    """
    Class for managing Session, User and Connection objects and their interaction with the database.

    Attributes:
        db_con : sqlite3.Connection 
            The database connection object.
        db_cur : sqlite3.Cursor
            The database cursor object.
    """

    # --- Constructor methods ---

    def __init__(self, db_path: str ="db/connections.db"):
        """
        Constructor for ConnectionManager.

        Args:
            db_path (str): The path to the database file. If not provided, it will default to 'app/data/db/connections.db'. If the path does not exist, it will be created.
        """
        full_path = data_dir + db_path

        if not db_path or db_path == 'file::memory:?cache=shared':
            logger.warning('No database path provided. Using in-memory database.')
            db_path = 'file::memory:?cache=shared'
            self._setup_db(db_path)

        if not os.path.exists(full_path) and db_path != 'file::memory:?cache=shared':
            logger.warning(f"Database path does not exist. Creating new database at {db_path}")
            splited_path = full_path.split('/')
            path = '/'.join(splited_path[0:-1:1])+'/'
            if not os.path.exists(path):
                os.makedirs(path, exist_ok=True)
            self._setup_db(full_path)
        
        self.db_con = sqlite3.connect(full_path, check_same_thread=False)
        self.db_cur = self.db_con.cursor()
        self.db_cur.execute("PRAGMA foreign_keys = ON")
        self.db_con.commit()
        self._reset_tables()
        self.db_cur.close()

        print("Connection manager is ready to handle user requests")
    
    def _setup_db(self, db_path):
        """
        Creates a new sqlite3 db from template file.
        
        Args: 
            db_path (str): The path at which the database will be created.
        
        Raises:
            DatabaseSetupException: If template could not be found.
        """

        try:
            with open(_path_to_db_template, 'r') as file:
                self.db_con = sqlite3.connect(db_path, check_same_thread=False)
                self.db_cur = self.db_con.cursor()
                sql_script = file.read()
                self.db_cur.executescript(sql_script)
                self.db_con.commit()
        except:
            raise DatabaseSetupException
    
    def _reset_tables(self):
        self.db_cur.execute("DELETE FROM user")
        self.db_cur.execute("DELETE FROM session")
        self.db_cur.execute("DELETE FROM connection")
        self.db_cur.execute("DELETE FROM sqlite_sequence")
        self.db_con.commit()

    # --- Session methods ---

    def create_session(self,stype: str ='DEFAULT'):
        """Creates a new session object and appends it's data to the provided database."""

        new_session = Session(stype=stype)
        cursor = self.db_con.cursor()

        if self.session_exists(new_session.key) == True:
            logger.warning(f"Session with key {new_session.key} already exists. Session creation abandoned.") 
            del new_session
            return None

        cursor.execute("INSERT INTO session VALUES(NULL,?,?,?)", (new_session.key,0,stype,))
        self.db_con.commit()
        cursor.close()

        return new_session

    def delete_session(self, session_key: int):
        """Removes the session with the provided key from the database."""

        cursor = self.db_con.cursor()

        if self.session_exists(session_key) == False:
            logger.warning(f"Session with key {session_key} does not exist. Nothing was deleted.")
            return None

        cursor.execute("DELETE FROM session WHERE session_key = ?", (session_key,))
        self.db_con.commit()
        cursor.close()

    def session_exists(self, session_key: str):
        """Checks if the session with the provided key exists in the database."""

        cursor = self.db_con.cursor()

        cursor.execute("SELECT session_key FROM session")
        existing_keys = list(map(lambda x: x[0], cursor.fetchall()))
        
        cursor.close()
        return session_key in existing_keys

    def get_users_in_session(self, session_key: str):
        """Returns a list of user ids that are connected to the session with the provided key."""

        cursor = self.db_con.cursor()

        if self.session_exists(session_key) == False:
            logger.warning(f"Session with key {session_key} does not exist. Cannot get users.")
            return None

        cursor.execute("SELECT user_id FROM connection WHERE session_key = ?", (session_key,))
        result = list(map(lambda x: x[0], cursor.fetchall()))
        cursor.close()
        return result

    def get_session_data(self, session_key: str):
        """Returns all values of attributes of given session."""

        cursor = self.db_con.cursor()

        if not self.session_exists(session_key):
            logger.warning(f"Session with key {session_key} does not exist. Returned data is empty")
            return ()

        cursor.execute("SELECT * FROM session WHERE session_key = ?", (session_key,))
        result = cursor.fetchone()
        cursor.close()
        return result
    
    def update_session_status(self, session_key: str, status: int):
        """Updates session status."""

        cursor = self.db_con.cursor()

        if status > 2:
            logger.warning(f"Wrong session status {status} provided for session {session_key}.")
            return None

        if status < 0:
            logger.warning(f"Wrong session status {status} provided for session {session_key}. Status 0 will be used instaed.")
            status = 0

        if not self.session_exists(session_key):
            logger.warning(f"Session with key {session_key} does not exist. Cannot update status")
            return ()    

        cursor.execute("UPDATE session SET status = ? WHERE session_key = ?", (status,session_key))
        self.db_con.commit()
        cursor.close()

    # --- User methods ---

    def create_user(self, name: str = None, type: str = None, sid: str = None):
        """Creates a new user object and appends it's data to the provided database."""

        cursor = self.db_con.cursor()
        new_user = User(name=name, type=type, sid=sid)

        if self.sid_exists(new_user.sid) == True and type !='PHANTOM':
            logger.warning(f"User with sid {new_user.sid} already exists. User creation abandoned.")
            del new_user
            return None

        cursor.execute("INSERT INTO user VALUES(NULL,?,?,?)", (new_user.name, new_user.type, new_user.sid))
        last_id = cursor.lastrowid
        new_user.id = last_id
        self.db_con.commit()
        cursor.close()

        return new_user

    def delete_user(self, user_id: int):
        """Deletes the user with the provided id from the database."""
        
        cursor = self.db_con.cursor()

        if self.user_exists(user_id) == False:
            logger.warning(f"User with id {user_id} does not exist. Nothing was deleted.")
            print('aaaaaasasd')
            return None

        cursor.execute("DELETE FROM user WHERE user_id = ?", (user_id,))
        self.db_con.commit()
        cursor.close()
    
    def user_exists(self, user_id: int):
        """Checks if the user with the provided user_id exists in the database."""

        cursor = self.db_con.cursor()

        cursor.execute("SELECT user_id FROM user")
        existing_ids = list(map(lambda x: x[0], cursor.fetchall()))
        cursor.close()

        return user_id in existing_ids

    def sid_exists(self, sid: str):
        """Checks if the user with the provided sid (websocket session id) exists in the database."""

        cursor = self.db_con.cursor()

        cursor.execute("SELECT sid FROM user")
        existing_sids = list(map(lambda x: x[0], cursor.fetchall()))
        cursor.close()

        return sid in existing_sids

    def get_user_id_by_sid(self, sid: str):
        """Returns the id of the user with the provided sid (websocket session id)."""

        cursor = self.db_con.cursor()

        if self.sid_exists(sid) == False:
            logger.warning(f"User with sid {sid} does not exist. Cannot provide user id.")
            return None

        cursor.execute("SELECT user_id FROM user WHERE sid = ?", (sid,))
        result = cursor.fetchone()[0]
        cursor.close()
        return result

    def get_user_data(self, user_id: int):
        """Returns all data from the database for the user with the provided id."""

        cursor = self.db_con.cursor()

        if self.user_exists(user_id) == False:
            logger.warning(f"User with id {user_id} does not exist. Returned data is empty.")
            return ()

        cursor.execute("SELECT * FROM user WHERE user_id = ?", (user_id,))
        result = cursor.fetchone()
        cursor.close()
        return result

    def get_users_session(self, user_id: int):
        """Returns user's current session"""
        
        cursor = self.db_con.cursor()

        if not self.user_exists(user_id):
            logger.warning(f"User with id {user_id} does not exist.")
            return None

        cursor.execute("SELECT session_key FROM connection WHERE user_id = ?", (user_id,))
        found_keys = cursor.fetchone()
        cursor.close()

        if found_keys == None:
            return None
        
        return found_keys[0]
    
    def update_user_type(self, user_id:int, type: str):
        """Changes current user type to either 'CLIENT', 'HOST' or 'PHANTOM'"""
        # TODO: Check valid types

        cursor = self.db_con.cursor()

        if not self.user_exists(user_id):
            logger.warning(f"User with id {user_id} does not exist. Cannot update type.")
            return None

        cursor.execute("UPDATE user SET type = ? WHERE user_id = ?", (type,user_id))
        self.db_con.commit()
        cursor.close()

    # --- Connection methods ---

    def create_connection(self, session_key: str, user_id: int):
        """
        Creates a new connection object and appends it's data to the provided database. 
        
        Args:
            session_key (str): The key of the session that the user is connected to. Value must exist in session table in the database.
            user_id (int): The id of the user that is connected to the session. Value must exist in user table in the database.

        Returns:
            Connection: A new connection object that represents binding between the session and the user.
        """

        cursor = self.db_con.cursor()

        new_connection = Connection(session_key, user_id)

        cursor.execute("SELECT user_id FROM connection")
        existing_ids = list(map(lambda x: x[0], cursor.fetchall()))

        if not self.user_exists(new_connection.user_id):
            logger.warning(f"User with id {new_connection.user_id} does not exist. Connection request denied.")
            return None

        if not self.session_exists(new_connection.session_key):
            logger.warning(f"Session with key {new_connection.session_key} does not exist. Connection request denied.")
            return None
        
        if user_id in existing_ids:
            logger.warning(f"User with id {user_id} is already connected. Connection request denied.")
            return None

        cursor.execute("INSERT INTO connection VALUES(NULL,?,?)", (new_connection.session_key, new_connection.user_id))
        self.db_con.commit()
        cursor.close()

        return new_connection

    def delete_connection(self, connection_id: int):
        """Deletes the connection with the provided id from the database."""

        cursor = self.db_con.cursor()

        cursor.execute("SELECT connection_id FROM connection")
        existing_ids = list(map(lambda x: x[0], cursor.fetchall()))

        if connection_id not in existing_ids:
            logger.warning(f"Connection with id {connection_id} does not exist. Nothing was deleted.")
            return None

        cursor.execute("DELETE FROM connection WHERE connection_id = ?", (connection_id,))
        self.db_con.commit()
        cursor.close()


class DatabaseSetupException(Exception):
    def __str__(self):
        return "Database setup failed. No template provided?"