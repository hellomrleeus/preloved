#!/usr/bin/env python3
"""Sync products + photos from the local inventory workbook into the site data.

Source of truth:
  - inventory workbook defined in local config
  - sibling photo folders/files next to that workbook

Photo rules:
  - If the row's "Photo Path" cell is filled, it may point to a relative or
    absolute folder (or a single image file).
  - If "Photo Path" is blank, the default source is a sibling folder whose name
    matches the product ID (for example, "001/").

This script copies source photos into repo-local images/<id>/src-XX.<ext> and
regenerates data/products.json. Pure stdlib — no external dependencies.
"""
from __future__ import annotations

import datetime as dt
import errno
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "images"
OUTPUT = ROOT / "data" / "products.json"
LOCAL_CONFIG = ROOT / "scripts" / "local-config.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"}
GENERATED_PREFIX = "src-"
COMPRESSIBLE_EXTS = {".jpg", ".jpeg", ".png"}
MAX_IMAGE_DIM = 1800
JPEG_QUALITY = "80"

NS_MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
NS_OFFICE_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def load_local_config() -> tuple[Path, str]:
    if not LOCAL_CONFIG.is_file():
        raise FileNotFoundError(
            f"Local config not found: {LOCAL_CONFIG}. "
            "Create it with inventory_xlsx and optional worksheet_name."
        )

    try:
        config = json.loads(LOCAL_CONFIG.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Invalid JSON in local config: {LOCAL_CONFIG}") from exc

    inventory_value = os.environ.get("PRELOVED_INVENTORY_XLSX") or config.get("inventory_xlsx")
    if not inventory_value:
        raise RuntimeError("local config is missing inventory_xlsx")

    worksheet_name = (
        os.environ.get("PRELOVED_INVENTORY_SHEET")
        or config.get("worksheet_name")
        or "Items"
    )
    return Path(str(inventory_value)).expanduser(), str(worksheet_name)


def parse_num(value: str | None):
    if not value:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", str(value).replace(",", ""))
    if not match:
        return None
    parsed = float(match.group(0))
    return int(parsed) if parsed.is_integer() else parsed


def is_example_row(row: dict[str, str]) -> bool:
    return (row.get("ID") or "").strip().lower().startswith("auto-increment")


def _localname(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _column_index(cell_ref: str) -> int:
    letters = []
    for ch in cell_ref:
        if ch.isalpha():
            letters.append(ch.upper())
        else:
            break
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx


def _read_inline_text(node: ET.Element | None) -> str:
    if node is None:
        return ""
    parts = []
    for child in node.iter():
        if _localname(child.tag) == "t":
            parts.append(child.text or "")
    return "".join(parts)


def _load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    path = "xl/sharedStrings.xml"
    if path not in zf.namelist():
        return []

    root = ET.fromstring(zf.read(path))
    shared = []
    for item in root.findall(f"{NS_MAIN}si"):
        shared.append(_read_inline_text(item))
    return shared


def _normalize_xlsx_path(target: str) -> str:
    cleaned = target.replace("\\", "/").lstrip("/")
    return cleaned if cleaned.startswith("xl/") else f"xl/{cleaned}"


def _resolve_sheet_path(zf: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))

    rel_targets: dict[str, str] = {}
    for rel in rels:
        if _localname(rel.tag) != "Relationship":
            continue
        rel_id = rel.get("Id")
        target = rel.get("Target")
        if rel_id and target:
            rel_targets[rel_id] = target

    sheets = workbook.find(f"{NS_MAIN}sheets")
    if sheets is None:
        raise RuntimeError("Workbook has no sheets")

    candidates: list[tuple[str, str]] = []
    for sheet in sheets:
        if _localname(sheet.tag) != "sheet":
            continue
        name = sheet.get("name") or ""
        rel_id = sheet.get(NS_OFFICE_REL + "id")
        target = rel_targets.get(rel_id or "")
        if not target:
            continue
        normalized = _normalize_xlsx_path(target)
        candidates.append((name, normalized))

    for name, target in candidates:
        if name == sheet_name:
            return target
    if candidates:
        return candidates[0][1]
    raise RuntimeError("Workbook has no readable sheets")


def _read_cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.get("t")
    if cell_type == "inlineStr":
        return _read_inline_text(cell.find(f"{NS_MAIN}is"))

    value_node = cell.find(f"{NS_MAIN}v")
    if value_node is None:
        return ""

    raw = value_node.text or ""
    if cell_type == "s":
        try:
            return shared_strings[int(raw)]
        except (ValueError, IndexError):
            return ""
    if cell_type == "b":
        return "TRUE" if raw == "1" else "FALSE"
    return raw


def _read_sheet_rows(xlsx_path: Path, sheet_name: str) -> list[dict[str, str]]:
    try:
        zf = zipfile.ZipFile(xlsx_path)
    except zipfile.BadZipFile as exc:
        raise RuntimeError(f"{xlsx_path} is not a valid xlsx file") from exc

    with zf:
        shared_strings = _load_shared_strings(zf)
        sheet_path = _resolve_sheet_path(zf, sheet_name)
        sheet_root = ET.fromstring(zf.read(sheet_path))

    sheet_data = sheet_root.find(f".//{NS_MAIN}sheetData")
    if sheet_data is None:
        return []

    rows = sheet_data.findall(f"{NS_MAIN}row")
    if not rows:
        return []

    header_cells: dict[int, str] = {}
    for cell in rows[0].findall(f"{NS_MAIN}c"):
        header = _read_cell_value(cell, shared_strings).strip()
        if header:
            header_cells[_column_index(cell.get("r", ""))] = header

    parsed_rows: list[dict[str, str]] = []
    for row in rows[1:]:
        values = {header: "" for header in header_cells.values()}
        has_content = False
        for cell in row.findall(f"{NS_MAIN}c"):
            column = _column_index(cell.get("r", ""))
            header = header_cells.get(column)
            if not header:
                continue
            value = _read_cell_value(cell, shared_strings).strip()
            if value:
                has_content = True
            values[header] = value
        if has_content:
            parsed_rows.append(values)
    return parsed_rows


def parse_inventory(xlsx_path: Path, worksheet_name: str) -> list[dict[str, object]]:
    if not xlsx_path.is_file():
        raise FileNotFoundError(f"Inventory workbook not found: {xlsx_path}")

    rows = _read_sheet_rows(xlsx_path, worksheet_name)
    products: list[dict[str, object]] = []
    for row in rows:
        pid = (row.get("ID") or "").strip()
        if not pid or is_example_row(row):
            continue

        status = (row.get("Status") or "Available").strip() or "Available"
        if status.lower() == "deleted":
            continue

        products.append(
            {
                "id": pid,
                "title": (row.get("Title") or "").strip(),
                "category": (row.get("Category") or "Other").strip() or "Other",
                "brand": (row.get("Brand") or "").strip(),
                "model": (row.get("Model") or "").strip(),
                "condition": (row.get("Condition") or "").strip(),
                "purchasePrice": parse_num(row.get("Purchase Price")),
                "purchaseDate": (row.get("Purchase Date") or "").strip(),
                "askingPrice": parse_num(row.get("Asking Price")),
                "negotiable": (row.get("Negotiable") or "").strip().lower() == "yes",
                "description": (row.get("Description") or "").strip(),
                "status": status,
                "postedDate": (row.get("Posted Date") or "").strip(),
                "soldDate": (row.get("Sold Date") or "").strip(),
                "soldPrice": parse_num(row.get("Sold Price")),
                "images": [],
                "_photo_path": (row.get("Photo Path") or "").strip(),
            }
        )
    return products


def _natural_key(path: Path):
    parts = re.split(r"(\d+)", path.name.lower())
    key = []
    for part in parts:
        key.append(int(part) if part.isdigit() else part)
    return key


def _resolve_source_targets(inventory_xlsx: Path, pid: str, photo_path: str) -> list[Path]:
    raw = photo_path.strip()
    entries = [line.strip() for line in raw.splitlines() if line.strip()] if raw else [pid]
    targets = []
    for entry in entries:
        path = Path(entry).expanduser()
        if not path.is_absolute():
            path = inventory_xlsx.parent / path
        targets.append(path)
    return targets


def collect_source_images(inventory_xlsx: Path, pid: str, photo_path: str) -> list[Path]:
    collected: list[Path] = []
    seen: set[Path] = set()
    raw = photo_path.strip()

    for target in _resolve_source_targets(inventory_xlsx, pid, photo_path):
        current: list[Path] = []
        if target.is_dir():
            current = sorted(
                (
                    child
                    for child in target.iterdir()
                    if child.is_file()
                    and child.suffix.lower() in IMAGE_EXTS
                    and not child.name.startswith(".")
                ),
                key=_natural_key,
            )
        elif target.is_file() and target.suffix.lower() in IMAGE_EXTS:
            current = [target]
        elif raw:
            print(f"WARN: photo path for {pid} not found: {target}", file=sys.stderr)

        if raw and target.exists() and not current:
            print(f"WARN: no images found for {pid} in {target}", file=sys.stderr)

        for image in current:
            resolved = image.resolve()
            if resolved in seen:
                continue
            seen.add(resolved)
            collected.append(image)

    return collected


def copy_image_file(source: Path, destination: Path) -> None:
    try:
        shutil.copy2(source, destination)
        return
    except OSError as exc:
        if exc.errno != errno.EDEADLK:
            raise

    if destination.exists():
        destination.unlink()

    with source.open("rb") as src_fp, destination.open("wb") as dst_fp:
        shutil.copyfileobj(src_fp, dst_fp)
    shutil.copystat(source, destination)


def compress_image_file(path: Path) -> None:
    if path.suffix.lower() not in COMPRESSIBLE_EXTS:
        return

    command = ["sips", "-Z", str(MAX_IMAGE_DIM)]
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        command.extend(["-s", "formatOptions", JPEG_QUALITY])
    command.append(str(path))

    fd, tmp_name = tempfile.mkstemp(
        prefix=f"{path.stem}-",
        suffix=path.suffix,
        dir=str(path.parent),
    )
    os.close(fd)
    tmp_path = Path(tmp_name)
    original_size = path.stat().st_size

    try:
        command.extend(["--out", str(tmp_path)])
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        if tmp_path.stat().st_size < original_size:
          os.replace(tmp_path, path)
    except FileNotFoundError:
        print("WARN: sips not found; skipped image compression", file=sys.stderr)
    except subprocess.CalledProcessError as exc:
        err = (exc.stderr or "").strip()
        detail = f": {err}" if err else ""
        print(f"WARN: failed to compress image {path}{detail}", file=sys.stderr)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


def sync_product_images(pid: str, source_images: list[Path]) -> int:
    target_dir = IMAGES_DIR / pid
    target_dir.mkdir(parents=True, exist_ok=True)

    removed = 0
    for existing in target_dir.iterdir():
        if (
            existing.is_file()
            and existing.suffix.lower() in IMAGE_EXTS
            and not existing.name.startswith(".")
        ):
            existing.unlink()
            removed += 1

    for index, source in enumerate(source_images, start=1):
        ext = source.suffix.lower()
        if ext == ".jpeg":
            ext = ".jpg"
        destination = target_dir / f"{GENERATED_PREFIX}{index:02d}{ext}"
        copy_image_file(source, destination)
        compress_image_file(destination)

    return removed


def clear_stale_images(active_ids: set[str]) -> int:
    if not IMAGES_DIR.exists():
        return 0

    removed = 0
    for target_dir in IMAGES_DIR.iterdir():
        if not target_dir.is_dir() or target_dir.name in active_ids:
            continue
        for existing in target_dir.iterdir():
            if (
                existing.is_file()
                and existing.suffix.lower() in IMAGE_EXTS
                and not existing.name.startswith(".")
            ):
                existing.unlink()
                removed += 1
    return removed


def scan_images_for_product(pid: str) -> list[str]:
    target_dir = IMAGES_DIR / pid
    if not target_dir.is_dir():
        return []

    files = sorted(
        (
            path
            for path in target_dir.iterdir()
            if path.is_file()
            and path.suffix.lower() in IMAGE_EXTS
            and not path.name.startswith(".")
        ),
        key=_natural_key,
    )
    return [f"images/{pid}/{path.name}" for path in files]


def build_payload(products: list[dict[str, object]]) -> dict[str, object]:
    existing: dict[str, object] | None = None
    if OUTPUT.is_file():
        try:
            loaded = json.loads(OUTPUT.read_text(encoding="utf-8"))
            if isinstance(loaded, dict):
                existing = loaded
        except json.JSONDecodeError:
            existing = None

    if existing and existing.get("products") == products:
        return existing

    return {
        "products": products,
        "generatedAt": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
    }


def main() -> int:
    try:
        inventory_xlsx, worksheet_name = load_local_config()
        products = parse_inventory(inventory_xlsx, worksheet_name)
    except Exception as exc:
        print(f"ERROR: failed to load inventory source: {exc}", file=sys.stderr)
        return 1

    copied_count = 0
    with_photos = 0
    for product in products:
        pid = str(product["id"])
        photo_path = str(product.pop("_photo_path", ""))
        source_images = collect_source_images(inventory_xlsx, pid, photo_path)
        sync_product_images(pid, source_images)
        product["images"] = scan_images_for_product(pid)
        copied_count += len(product["images"])
        if product["images"]:
            with_photos += 1

    stale_removed = clear_stale_images({str(product["id"]) for product in products})

    payload = build_payload(products)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Synced {len(products)} products "
        f"({with_photos} with photos, {copied_count} images copied, "
        f"{stale_removed} stale images removed)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
