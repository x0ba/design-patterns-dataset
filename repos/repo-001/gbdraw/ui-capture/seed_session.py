#!/usr/bin/env python3
"""Seed the Session the app reopens at startup (.ui-capture/data/current.gbdraw-session.json.gz).

It is a shrimp-virus researcher's working Session, built only through gbdraw's own paths:
- Linear drawing: the 9-genome majanivirus LOSATP similarity-group comparison, a real
  saved Session (gbdraw/web/gallery/sessions/majanivirus_orthogroup...).
- Circular drawing: a circular map of one of those genomes (MjeNMV, LC738868.1, 306 kbp),
  drawn by the gbdraw CLI with --session_output.
The two drawings are combined with gbdraw.session_drawings.write_session_drawings and the
result is checked with gbdraw.session_io.validate_session.
Run with .ui-capture/venv/bin/python.
"""
import base64, gzip, json, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
sys.path.insert(0, str(REPO))
from gbdraw.session_io import validate_session  # noqa: E402
from gbdraw.session_drawings import write_session_drawings  # noqa: E402

LINEAR = REPO / "gbdraw/web/gallery/sessions/majanivirus_orthogroup.gbdraw-session.json.gz"
OUT = HERE / "data/current.gbdraw-session.json.gz"


def main() -> None:
    linear = json.load(gzip.open(LINEAR))
    res = linear["resources"]
    work = Path(tempfile.mkdtemp(prefix="seed-"))
    gb = work / "MjeNMV.gb"
    gb.write_bytes(base64.b64decode(res["record-1-genbank"]["data"]))
    colors = work / "majani_custom_color_table.tsv"
    colors.write_bytes(base64.b64decode(res["colors-color-table-file"]["data"]))
    defaults = work / "modified_default_colors.tsv"
    defaults.write_bytes(base64.b64decode(res["colors-default-colors-file"]["data"]))
    circ_session = work / "MjeNMV_circular.gbdraw-session.json"
    cmd = [
        str(HERE / "venv/bin/gbdraw"), "circular", "--gbk", str(gb), "-o", str(work / "MjeNMV_circular"),
        "-t", str(colors), "-d", str(defaults),
        "--separate_strands", "--labels", "out", "--legend", "right",
        "--species", "<i>Marsupenaeus japonicus</i> endogenous nimavirus",
        "--strain", "MjeNMV LC738868.1",
        "--session_output", str(circ_session),
    ]
    subprocess.run(cmd, check=True, cwd=work)
    circular = json.load(open(circ_session))
    validate_session(circular)

    # Both drawings read one shared resource set, file-name table and UI block.
    assert base64.b64decode(circular["resources"]["record-1-genbank"]["data"]) == gb.read_bytes()
    resources = dict(linear["resources"])
    for rid, entry in circular["resources"].items():
        resources.setdefault(rid, entry)
    names = dict(linear["webFiles"]["resourceOriginalNames"])
    for binding in circular["webFiles"].get("bindings", {}).values():
        if isinstance(binding, dict) and binding.get("resourceId") and binding["resourceId"] not in names:
            names[binding["resourceId"]] = binding["name"]
    names.setdefault("colors-color-table", "majani_custom_color_table.tsv")
    names.setdefault("colors-default-colors", "modified_default_colors.tsv")
    web_files = {**linear["webFiles"], "resourceOriginalNames": names}
    shared = {
        "title": "majanivirus_9genomes_LOSATP_groups_v4",
        "createdAt": "2026-11-14T16:42:07.512Z",
        "resources": resources,
        "webFiles": web_files,
        "ui": linear["ui"],
    }
    linear.update(shared)
    circular.update(shared)
    circular.pop("cliInvocation", None)
    merged = write_session_drawings([linear, circular], active=0)
    validate_session(merged)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT, "wt", encoding="utf-8") as fh:
        json.dump(merged, fh, separators=(",", ":"))
    print("wrote", OUT, OUT.stat().st_size, "bytes; drawings:",
          merged["renderRequest"]["mode"], "+", merged.get("otherModeResult", {}).get("renderRequest", {}).get("mode"))


if __name__ == "__main__":
    main()
