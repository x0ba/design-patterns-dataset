"""altero configuration for the local UI capture (SQLite, no outbound services)."""
import os
_here = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite+aiosqlite:///{_here}/data/altero.sqlite"
HOST = "127.0.0.1"
PORT = int(os.environ.get("PORT", "4404"))
DEBUG = False
STORAGE_PATH = f"{_here}/data/storage"
SMTP_URL = ""          # mail is written to the log instead of sent
MAIL_FROM = "altero@localhost"
PUBLIC_URL = ""
OPEN_REGISTRATION = False
