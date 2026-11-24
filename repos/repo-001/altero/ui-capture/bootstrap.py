"""Create accounts, groups and an API key through altero's own service layer.

Run with ALTERO_CONFIG pointing at .ui-capture/config.py, after `alembic upgrade head`.
Writes the API keys it issues to .ui-capture/data/keys.json for seed.py.
"""

import asyncio
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from altero.db import Database
from altero.services import admin, webauth
from altero.settings import get_settings

HERE = Path(__file__).resolve().parent
PASSWORD = "Lindqvist-Coast-2026"

USERS = [
    # username, display name, email
    ("hlindqvist", "Hannah Lindqvist", "hannah.lindqvist@uni-kiel.example"),
    ("tomasz.r", "Tomasz Rybak", "t.rybak@uni-kiel.example"),
    ("aoife", "Aoife Gallagher", "aoife.gallagher@nuigalway.example"),
    ("mbekele", "Meron Bekele", "meron.bekele@uni-kiel.example"),
    ("jdussault", "Julien Dussault", "julien.dussault@ifremer.example"),
    ("priya.n", "Priya Natarajan", "priya.natarajan@uni-kiel.example"),
]

GROUPS = [
    # name, owner, public, members [(username, role, permission)]
    (
        "Coastal Ecology Lab",
        "hlindqvist",
        False,
        [("tomasz.r", "admin", "inherit"), ("mbekele", "member", "inherit"),
         ("priya.n", "member", "add"), ("aoife", "member", "read")],
    ),
    (
        "Seagrass Restoration Consortium",
        "jdussault",
        True,
        [("hlindqvist", "admin", "inherit"), ("aoife", "member", "inherit")],
    ),
    (
        "STS Reading Group",
        "aoife",
        False,
        [("hlindqvist", "member", "inherit"), ("priya.n", "member", "inherit")],
    ),
]


async def main() -> None:
    settings = get_settings()
    db = Database(settings)
    keys: dict[str, str] = {}
    async with db.session_factory() as session:
        now = datetime.now(UTC).replace(tzinfo=None)
        for i, (username, display, email) in enumerate(USERS):
            user = await admin.create_user(session, username=username, display_name=display)
            await webauth.set_password(session, user, PASSWORD)
            user.email = email
            user.email_verified = now - timedelta(days=400 - i * 30)
            user.time_zone = "Europe/Berlin"
            await session.commit()
            key = await admin.create_api_key(
                session,
                username=username,
                name="Zotero Desktop (seed)" if i else "Zotero on ThinkPad X1",
                all_groups_read=True,
                all_groups_write=True,
            )
            keys[username] = key.key
        # A second key, as an established user would have for another machine.
        await admin.create_api_key(
            session, username="hlindqvist", name="Zotero on lab iMac", all_groups_read=True,
            all_groups_write=True,
        )
        await admin.create_api_key(
            session, username="hlindqvist", name="Overleaf citation export", write=False,
        )

        group_ids: dict[str, int] = {}
        for name, owner, public, members in GROUPS:
            library = await admin.create_group(
                session, name=name, owner_username=owner, public=public
            )
            group_ids[name] = library.owner_id
            for username, role, permission in members:
                await admin.add_group_member(
                    session, library, username=username, role=role, permission=permission
                )
    await db.dispose()
    (HERE / "data" / "keys.json").write_text(
        json.dumps({"keys": keys, "groups": group_ids}, indent=2)
    )
    print("bootstrap done", group_ids)


if __name__ == "__main__":
    asyncio.run(main())
