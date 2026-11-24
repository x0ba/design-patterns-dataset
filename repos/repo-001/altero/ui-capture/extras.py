"""Web-only state an established account accumulates, via altero's services:
group invitations, notifications, collection share links, notification preferences."""

import asyncio
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select, update

from altero.db import Database
from altero.models import Collection, Library, LibraryType
from altero.models.activity import ActivityKind
from altero.models.webauth import Notification
from altero.services import admin, groupprefs, invitations, notifications, shares
from altero.settings import get_settings

HERE = Path(__file__).resolve().parent
CFG = json.loads((HERE / "data" / "keys.json").read_text())


async def main() -> None:
    db = Database(get_settings())
    now = datetime.now(UTC).replace(tzinfo=None)
    async with db.session_factory() as s:
        hannah = await admin.get_user_by_name(s, "hlindqvist")
        meron = await admin.get_user_by_name(s, "mbekele")
        tomasz = await admin.get_user_by_name(s, "tomasz.r")

        async def lib(type_, owner_id):
            return await s.scalar(select(Library).where(Library.type == type_, Library.owner_id == owner_id))

        personal = await lib(LibraryType.USER, hannah.id)
        lab = await lib(LibraryType.GROUP, CFG["groups"]["Coastal Ecology Lab"])

        # Pending invitation to a new group, from a colleague
        writing = await admin.create_group(s, name="Kiel Marine Science Writing Circle", owner_username="mbekele")
        await invitations.invite(s, library=writing, inviter=meron, email=hannah.email)
        # Hannah invited a new student who hasn't answered yet
        await invitations.invite(s, library=lab, inviter=hannah, email="lukas.brandt@stu.uni-kiel.example")

        # Group-activity digests over the past weeks
        digests = [
            ("Coastal Ecology Lab", "4 items were added or changed\n1 collection was added or changed", 1, False),
            ("Seagrass Restoration Consortium", "2 items were added or changed", 3, False),
            ("Coastal Ecology Lab", "11 items were added or changed\n2 items were deleted", 9, True),
            ("STS Reading Group", "3 items were added or changed\n1 membership changed", 16, True),
            ("Seagrass Restoration Consortium", "7 items were added or changed\n1 collection was added or changed", 24, True),
            ("Coastal Ecology Lab", "1 membership changed", 41, True),
        ]
        for name, body, days, read in digests:
            n = await notifications.raise_for(s, hannah, kind="group_activity",
                                              subject=f"New activity in “{name}”", body=body)
            await s.execute(update(Notification).where(Notification.id == n.id).values(
                created=now - timedelta(days=days, hours=3), read=(now - timedelta(days=days - 0.5)) if read else None))
        await s.commit()

        for library, member in ((lab, hannah), (lab, tomasz)):
            for kind in (ActivityKind.ITEMS_CHANGED, ActivityKind.MEMBERS_CHANGED, ActivityKind.COLLECTIONS_CHANGED):
                await groupprefs.set_kind(s, library, user_id=member.id, kind=kind, wanted=True)
        await s.commit()

        # Collection share links
        async def coll(library, name):
            return await s.scalar(select(Collection).where(Collection.library_id == library.id, Collection.name == name))

        await shares.create_share(s, personal, await coll(personal, "Own publications"), creator=hannah)
        await shares.create_share(s, personal, await coll(personal, "MAR-301 Coastal Ecosystems (WS 2026/27)"),
                                  creator=hannah, files=False, expires=now + timedelta(days=120))
        await shares.create_share(s, lab, await coll(lab, "Protocols & SOPs"), creator=hannah)
        await s.commit()
    await db.dispose()
    print("extras done")


if __name__ == "__main__":
    asyncio.run(main())
