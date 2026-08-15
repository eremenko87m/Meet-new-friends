from __future__ import annotations

import io
import itertools
import json
import mimetypes
import posixpath
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from zipfile import ZIP_DEFLATED, ZipFile

import requests
from openpyxl import load_workbook
from openpyxl.utils.cell import coordinate_to_tuple


ROOT = Path(__file__).resolve().parents[1]

CONFIG = json.loads(
    (ROOT / "config.json").read_text(
        encoding="utf-8"
    )
)

DATA_PATH = ROOT / "data" / "exercises.json"
MEDIA_ROOT = ROOT / "assets" / "media"

YANDEX_META_API = (
    "https://cloud-api.yandex.net/"
    "v1/disk/public/resources"
)

YANDEX_DOWNLOAD_API = (
    "https://cloud-api.yandex.net/"
    "v1/disk/public/resources/download"
)

TIMEOUT = 45

NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, max-age=0",
    "Pragma": "no-cache",
    "User-Agent": "ExerciseLibrarySync/5.0",
}


def yandex_metadata(public_url: str) -> dict:

    r = requests.get(
        YANDEX_META_API,
        params={
            "public_key": public_url,
            "fields": "name,modified,size,type,mime_type",
        },
        headers=NO_CACHE_HEADERS,
        timeout=TIMEOUT,
    )

    r.raise_for_status()

    return r.json()


def yandex_direct(public_url: str) -> str:

    r = requests.get(
        YANDEX_DOWNLOAD_API,
        params={
            "public_key": public_url
        },
        headers=NO_CACHE_HEADERS,
        timeout=TIMEOUT,
    )

    r.raise_for_status()

    href = r.json().get("href")

    if not href:

        raise RuntimeError(
            "Yandex did not return "
            "a download URL for "
            f"{public_url}"
        )

    return href


def download_public_file(
    public_url: str
) -> bytes:

    meta = yandex_metadata(
        public_url
    )

    print(
        "Yandex source:",
        f"name={meta.get('name')!r}",
        f"modified={meta.get('modified')!r}",
        f"size={meta.get('size')!r}",
        f"type={meta.get('type')!r}",
    )

    href = yandex_direct(
        public_url
    )

    r = requests.get(
        href,
        headers=NO_CACHE_HEADERS,
        timeout=TIMEOUT,
    )

    r.raise_for_status()

    content = r.content

    if len(content) < 100:

        raise RuntimeError(
            "Downloaded Yandex file "
            "is unexpectedly small: "
            f"{len(content)} bytes"
        )

    if not content.startswith(b"PK"):

        raise RuntimeError(
            "The public Yandex link "
            "did not download an XLSX file. "
            "Content-Type="
            f"{r.headers.get('content-type')!r}"
        )

    print(
        f"Downloaded workbook: "
        f"{len(content)} bytes"
    )

    return content


def sanitize_broken_table_references(
    content: bytes
) -> bytes:

    MAIN_NS = (
        "http://schemas.openxmlformats.org/"
        "spreadsheetml/2006/main"
    )

    DOC_REL_NS = (
        "http://schemas.openxmlformats.org/"
        "officeDocument/2006/relationships"
    )

    source = io.BytesIO(
        content
    )

    with ZipFile(
        source,
        "r"
    ) as zin:

        names = set(
            zin.namelist()
        )

        replacements = {}

        removed_total = 0

        for rels_name in names:

            if not (
                rels_name.startswith(
                    "xl/worksheets/_rels/"
                )
                and rels_name.endswith(
                    ".xml.rels"
                )
            ):
                continue

            rel_root = ET.fromstring(
                zin.read(
                    rels_name
                )
            )

            removed_ids = set()

            changed = False

            sheet_filename = (
                rels_name
                .rsplit("/", 1)[-1][:-5]
            )

            sheet_name = (
                "xl/worksheets/"
                + sheet_filename
            )

            for rel in list(
                rel_root
            ):

                rel_type = (
                    rel.attrib.get(
                        "Type",
                        ""
                    )
                )

                if not rel_type.endswith(
                    "/table"
                ):
                    continue

                target = (
                    rel.attrib.get(
                        "Target",
                        ""
                    )
                )

                if target.startswith(
                    "/"
                ):

                    target_path = (
                        target.lstrip("/")
                    )

                else:

                    target_path = (
                        posixpath.normpath(
                            posixpath.join(
                                posixpath.dirname(
                                    sheet_name
                                ),
                                target,
                            )
                        )
                    )

                if target_path in names:
                    continue

                relationship_id = (
                    rel.attrib.get(
                        "Id",
                        ""
                    )
                )

                print(
                    "Removing broken XLSX "
                    "table relationship:",
                    rels_name,
                    relationship_id,
                    "->",
                    target_path,
                )

                removed_ids.add(
                    relationship_id
                )

                rel_root.remove(
                    rel
                )

                changed = True

                removed_total += 1

            if not changed:
                continue

            replacements[
                rels_name
            ] = ET.tostring(
                rel_root,
                encoding="utf-8",
                xml_declaration=True,
            )

            if (
                sheet_name in names
                and removed_ids
            ):

                sheet_root = (
                    ET.fromstring(
                        zin.read(
                            sheet_name
                        )
                    )
                )

                table_parts = (
                    sheet_root.find(
                        f"{{{MAIN_NS}}}"
                        "tableParts"
                    )
                )

                if (
                    table_parts
                    is not None
                ):

                    for table_part in list(
                        table_parts
                    ):

                        rid = (
                            table_part.attrib.get(
                                f"{{{DOC_REL_NS}}}"
                                "id"
                            )
                        )

                        if rid in removed_ids:

                            table_parts.remove(
                                table_part
                            )

                    remaining = list(
                        table_parts
                    )

                    if not remaining:

                        sheet_root.remove(
                            table_parts
                        )

                    else:

                        table_parts.set(
                            "count",
                            str(
                                len(
                                    remaining
                                )
                            ),
                        )

                    replacements[
                        sheet_name
                    ] = ET.tostring(
                        sheet_root,
                        encoding="utf-8",
                        xml_declaration=True,
                    )

        if removed_total == 0:

            print(
                "No broken XLSX table "
                "relationships found."
            )

            return content

        print(
            f"Removed {removed_total} "
            "broken XLSX table "
            "relationship(s)."
        )

        output = io.BytesIO()

        with ZipFile(
            output,
            "w",
            ZIP_DEFLATED
        ) as zout:

            for info in (
                zin.infolist()
            ):

                data = (
                    replacements.get(
                        info.filename,
                        zin.read(
                            info.filename
                        ),
                    )
                )

                zout.writestr(
                    info,
                    data
                )

        return output.getvalue()


def clean_text(value) -> str:

    if value is None:
        return ""

    if isinstance(
        value,
        bool
    ):

        return (
            "YES"
            if value
            else "NO"
        )

    return str(
        value
    ).strip()


def is_yandex_share(
    url: str
) -> bool:

    try:

        host = (
            urlparse(url)
            .netloc
            .lower()
        )

        return (
            host.endswith(
                "disk.yandex.ru"
            )
            or host.endswith(
                "yadi.sk"
            )
        )

    except Exception:

        return False


def ext_from_response(
    resp: requests.Response,
    fallback: str,
) -> str:

    cd = resp.headers.get(
        "content-disposition",
        "",
    )

    m = re.search(
        r"filename\*?="
        r"(?:UTF-8'')?"
        r"[\"']?"
        r"([^\"';]+)",
        cd,
        re.I,
    )

    if m:

        suffix = Path(
            m.group(1)
        ).suffix

        if suffix:
            return suffix.lower()

    ct = (
        resp.headers
        .get(
            "content-type",
            ""
        )
        .split(";")[0]
        .strip()
    )

    return (
        mimetypes.guess_extension(
            ct
        )
        or fallback
    )


def clear_old_media(
    section: str,
    no: int,
    kind: str,
) -> None:

    folder = (
        MEDIA_ROOT
        / section
    )

    if not folder.exists():
        return

    for old in folder.glob(
        f"{no:02d}-{kind}.*"
    ):

        old.unlink(
            missing_ok=True
        )


def cache_media(
    url: str,
    section: str,
    no: int,
    kind: str,
) -> str:

    url = clean_text(
        url
    )

    if not url:
        return ""

    if not is_yandex_share(
        url
    ):

        return url

    try:

        href = yandex_direct(
            url
        )

        resp = requests.get(
            href,
            headers=NO_CACHE_HEADERS,
            timeout=TIMEOUT,
        )

        resp.raise_for_status()

        fallback = (
            ".jpg"
            if kind.startswith(
                "image"
            )
            else ".mp3"
        )

        ext = ext_from_response(
            resp,
            fallback,
        )

        folder = (
            MEDIA_ROOT
            / section
        )

        folder.mkdir(
            parents=True,
            exist_ok=True,
        )

        clear_old_media(
            section,
            no,
            kind,
        )

        path = (
            folder
            / f"{no:02d}-{kind}{ext}"
        )

        path.write_bytes(
            resp.content
        )

        return (
            path
            .relative_to(ROOT)
            .as_posix()
        )

    except Exception as exc:

        print(
            f"WARNING media "
            f"{url}: {exc}"
        )

        return url


def image_anchor_position(
    img
):

    anchor = getattr(
        img,
        "anchor",
        None,
    )

    if anchor is None:
        return None

    if isinstance(
        anchor,
        str
    ):

        try:

            return (
                coordinate_to_tuple(
                    anchor
                )
            )

        except Exception:

            return None

    marker = getattr(
        anchor,
        "_from",
        None,
    )

    if marker is not None:

        try:

            return (
                int(
                    marker.row
                ) + 1,
                int(
                    marker.col
                ) + 1,
            )

        except Exception:

            return None

    return None


def embedded_image_bytes(
    img
):

    data_method = getattr(
        img,
        "_data",
        None,
    )

    if not callable(
        data_method
    ):

        raise RuntimeError(
            "openpyxl image object "
            "has no readable image data"
        )

    raw = data_method()

    if not raw:

        raise RuntimeError(
            "embedded image "
            "has no data"
        )

    fmt = clean_text(
        getattr(
            img,
            "format",
            "",
        )
    ).lower().lstrip(".")

    if fmt == "jpg":
        fmt = "jpeg"

    if fmt not in {
        "png",
        "jpeg",
        "gif",
        "bmp",
        "tiff",
    }:

        fmt = "png"

    ext = (
        ".jpg"
        if fmt == "jpeg"
        else f".{fmt}"
    )

    return raw, ext


def map_embedded_images_for_rows(
    ws,
    image1_col_index,
    image2_col_index,
    cards_per,
):

    images = list(
        getattr(
            ws,
            "_images",
            [],
        )
        or []
    )

    if not images:

        print(
            f"{ws.title}: "
            "0 embedded picture(s)"
        )

        return {}

    by_row = defaultdict(
        list
    )

    for order, img in enumerate(
        images
    ):

        pos = image_anchor_position(
            img
        )

        if not pos:

            print(
                f"WARNING "
                f"{ws.title}: "
                "embedded picture "
                f"#{order + 1} "
                "has no readable anchor"
            )

            continue

        excel_row, excel_col = pos

        if (
            2
            <= excel_row
            <= cards_per + 1
        ):

            by_row[
                excel_row
            ].append(
                {
                    "order": order,
                    "col": excel_col,
                    "img": img,
                }
            )

    targets = []

    if (
        image1_col_index
        is not None
    ):

        targets.append(
            (
                "image1",
                image1_col_index + 1,
            )
        )

    if (
        image2_col_index
        is not None
    ):

        targets.append(
            (
                "image2",
                image2_col_index + 1,
            )
        )

    mapped = {}

    for (
        excel_row,
        candidates,
    ) in by_row.items():

        row_images = {}

        if not targets:

            ordered = sorted(
                candidates,
                key=lambda c: (
                    c["col"],
                    c["order"],
                ),
            )

            if ordered:

                row_images[
                    "image1"
                ] = ordered[0]["img"]

            if len(ordered) > 1:

                row_images[
                    "image2"
                ] = ordered[1]["img"]

            mapped[
                excel_row
            ] = row_images

            continue

        max_assign = min(
            len(candidates),
            len(targets),
        )

        best = None

        for target_subset in (
            itertools.combinations(
                targets,
                max_assign,
            )
        ):

            for candidate_perm in (
                itertools.permutations(
                    candidates,
                    max_assign,
                )
            ):

                cost = sum(
                    abs(
                        candidate_perm[i]["col"]
                        - target_subset[i][1]
                    )
                    for i in range(
                        max_assign
                    )
                )

                tie = tuple(
                    c["order"]
                    for c in candidate_perm
                )

                score = (
                    cost,
                    tie,
                )

                if (
                    best is None
                    or score < best[0]
                ):

                    best = (
                        score,
                        target_subset,
                        candidate_perm,
                    )

        if best:

            (
                _,
                target_subset,
                candidate_perm,
            ) = best

            for (
                (
                    key,
                    target_col,
                ),
                candidate,
            ) in zip(
                target_subset,
                candidate_perm,
            ):

                row_images[
                    key
                ] = candidate["img"]

                distance = abs(
                    candidate["col"]
                    - target_col
                )

                if distance:

                    print(
                        f"NOTE {ws.title}: "
                        f"picture in row "
                        f"{excel_row}, "
                        f"column "
                        f"{candidate['col']} "
                        f"mapped to {key} "
                        f"column {target_col}."
                    )

        mapped[
            excel_row
        ] = row_images

    mapped_count = sum(
        len(v)
        for v in mapped.values()
    )

    print(
        f"{ws.title}: "
        f"{len(images)} "
        "embedded picture(s), "
        f"{mapped_count} "
        "mapped to "
        "Image 1 / Image 2"
    )

    return mapped


def save_embedded_image(
    img,
    section: str,
    no: int,
    kind: str,
) -> str:

    raw, ext = (
        embedded_image_bytes(
            img
        )
    )

    folder = (
        MEDIA_ROOT
        / section
    )

    folder.mkdir(
        parents=True,
        exist_ok=True,
    )

    clear_old_media(
        section,
        no,
        kind,
    )

    path = (
        folder
        / f"{no:02d}-{kind}{ext}"
    )

    path.write_bytes(
        raw
    )

    return (
        path
        .relative_to(ROOT)
        .as_posix()
    )


def row_map(
    headers
):

    norm = {
        clean_text(v).lower(): i
        for i, v
        in enumerate(headers)
    }

    aliases = {

        "no": [
            "no",
            "#",
            "number",
            "номер",
            "№",
        ],

        "title": [
            "title",
            "name",
            "название",
        ],

        "link": [
            "link",
            "url",
            "ссылка",
        ],

        "image1": [
            "image 1",
            "image1",
            "image_1",
            "picture 1",
            "picture1",
            "img 1",
            "img1",
            "картинка 1",
            "картинка1",

            # old column name
            "image",
            "picture",
            "img",
            "картинка",
        ],

        "image2": [
            "image 2",
            "image2",
            "image_2",
            "picture 2",
            "picture2",
            "img 2",
            "img2",
            "картинка 2",
            "картинка2",
        ],

        "audio": [
            "audio",
            "аудио",
        ],

        "level": [
            "level",
            "уровень",
        ],

        "notes": [
            "notes",
            "note",
            "comment",
            "комментарий",
            "примечание",
        ],

        "active": [
            "active",
            "show",
            "visible",
            "активно",
        ],
    }

    out = {}

    for key, names in (
        aliases.items()
    ):

        for name in names:

            if name in norm:

                out[key] = (
                    norm[name]
                )

                break

    return out


def val(
    row,
    idx,
    default="",
):

    if (
        idx is None
        or idx >= len(row)
    ):

        return default

    return clean_text(
        row[idx]
    )


def make_default(
    section_slug: str,
    no: int,
):

    return {

        "no":
            no,

        "id":
            f"{section_slug}-{no}",

        "title":
            "",

        "link":
            "",

        "image":
            "",

        "image1":
            "",

        "image2":
            "",

        "audio":
            "",

        "level":
            "",

        "notes":
            "",

        "active":
            True,
    }


def main():

    sections_cfg = (
        CONFIG["sections"]
    )

    cards_per = int(
        CONFIG.get(
            "cards_per_section",
            40,
        )
    )

    public_url = (
        CONFIG[
            "yandex_table_public_url"
        ]
    )

    output = {

        "generatedAt":
            datetime.now(
                timezone.utc
            ).isoformat(),

        "source":
            public_url,

        "sections":
            {},
    }

    content = (
        download_public_file(
            public_url
        )
    )

    content = (
        sanitize_broken_table_references(
            content
        )
    )

    wb = load_workbook(
        io.BytesIO(
            content
        ),
        data_only=True,
        read_only=False,
    )

    print(
        "Workbook sheets:",
        ", ".join(
            wb.sheetnames
        ),
    )

    total_populated = 0
    total_embedded = 0

    for sec in (
        sections_cfg
    ):

        slug = sec[
            "slug"
        ]

        sheet_name = sec[
            "sheet"
        ]

        cards = [

            make_default(
                slug,
                i,
            )

            for i in range(
                1,
                cards_per + 1,
            )
        ]

        if (
            sheet_name
            not in wb.sheetnames
        ):

            raise RuntimeError(
                "Required sheet "
                f"{sheet_name!r} "
                "is missing. "
                "Available sheets: "
                f"{wb.sheetnames}"
            )

        ws = wb[
            sheet_name
        ]

        rows = list(
            ws.iter_rows(
                min_row=1,
                max_row=cards_per + 1,
                values_only=True,
            )
        )

        if not rows:

            raise RuntimeError(
                f"Sheet "
                f"{sheet_name!r} "
                "is empty"
            )

        mapping = row_map(
            rows[0]
        )

        required = [
            "no",
            "title",
            "link",
        ]

        missing_headers = [

            key

            for key in required

            if key
            not in mapping
        ]

        if missing_headers:

            raise RuntimeError(
                f"Sheet "
                f"{sheet_name!r} "
                "is missing required "
                "columns: "
                f"{missing_headers}. "
                "Header row: "
                f"{rows[0]}"
            )

        print(
            f"{sheet_name} "
            f"header map: {mapping}"
        )

        embedded_by_row = (
            map_embedded_images_for_rows(
                ws,
                mapping.get(
                    "image1"
                ),
                mapping.get(
                    "image2"
                ),
                cards_per,
            )
        )

        total_embedded += sum(
            len(v)
            for v
            in embedded_by_row.values()
        )

        populated = 0
        embedded_used = 0

        for (
            position,
            row,
        ) in enumerate(
            rows[
                1:
                cards_per + 1
            ],
            start=1,
        ):

            excel_row = (
                position + 1
            )

            no_raw = val(
                row,
                mapping.get(
                    "no"
                ),
                str(position),
            )

            try:

                no = int(
                    float(
                        no_raw
                    )
                )

            except Exception:

                no = position

            if not (
                1
                <= no
                <= cards_per
            ):

                continue

            active_raw = val(
                row,
                mapping.get(
                    "active"
                ),
                "YES",
            ).lower()

            active = (
                active_raw
                not in {
                    "no",
                    "false",
                    "0",
                    "нет",
                    "off",
                }
            )

            card = {

                "no":
                    no,

                "id":
                    f"{slug}-{no}",

                "title":
                    val(
                        row,
                        mapping.get(
                            "title"
                        ),
                    ),

                "link":
                    val(
                        row,
                        mapping.get(
                            "link"
                        ),
                    ),

                "image":
                    "",

                "image1":
                    "",

                "image2":
                    "",

                "audio":
                    "",

                "level":
                    val(
                        row,
                        mapping.get(
                            "level"
                        ),
                    ),

                "notes":
                    val(
                        row,
                        mapping.get(
                            "notes"
                        ),
                    ),

                "active":
                    active,
            }

            row_images = (
                embedded_by_row.get(
                    excel_row,
                    {},
                )
            )

            for key in (
                "image1",
                "image2",
            ):

                embedded_img = (
                    row_images.get(
                        key
                    )
                )

                if (
                    embedded_img
                    is not None
                ):

                    try:

                        card[
                            key
                        ] = (
                            save_embedded_image(
                                embedded_img,
                                slug,
                                no,
                                key,
                            )
                        )

                        embedded_used += 1

                    except Exception as exc:

                        print(
                            f"WARNING "
                            f"{sheet_name} "
                            f"row "
                            f"{excel_row}: "
                            f"could not "
                            f"extract "
                            f"{key}: "
                            f"{exc}"
                        )

                if not card[
                    key
                ]:

                    card[
                        key
                    ] = cache_media(
                        val(
                            row,
                            mapping.get(
                                key
                            ),
                        ),
                        slug,
                        no,
                        key,
                    )

            # compatibility with
            # older app code
            card[
                "image"
            ] = card[
                "image1"
            ]

            card[
                "audio"
            ] = cache_media(
                val(
                    row,
                    mapping.get(
                        "audio"
                    ),
                ),
                slug,
                no,
                "audio",
            )

            cards[
                no - 1
            ] = card

            if any(

                card.get(k)

                for k in (
                    "title",
                    "link",
                    "image1",
                    "image2",
                    "audio",
                    "notes",
                )
            ):

                populated += 1

        total_populated += (
            populated
        )

        print(
            f"{sheet_name}: "
            f"{populated} "
            "populated card(s) / "
            f"{cards_per}; "
            f"{embedded_used} "
            "embedded picture(s) used"
        )

        output[
            "sections"
        ][slug] = cards

    DATA_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    DATA_PATH.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "Updated",
        DATA_PATH
    )

    print(
        "TOTAL populated cards:",
        total_populated,
    )

    print(
        "TOTAL embedded pictures mapped:",
        total_embedded,
    )

    print(
        "generatedAt:",
        output[
            "generatedAt"
        ],
    )


if __name__ == "__main__":
    main()
