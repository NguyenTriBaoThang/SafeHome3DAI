"""Safely extract a ZIP once. Existing raw data is never overwritten."""
import argparse
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

from dataset_common import DEFAULT_RAW, sha256_file


def extract(archive, destination):
    destination = destination.resolve()
    if destination.exists():
        raise ValueError(f"Destination already exists; refusing to overwrite: {destination}")
    with zipfile.ZipFile(archive) as bundle:
        members = bundle.infolist()
        if sum(entry.file_size for entry in members) > 2_000_000_000:
            raise ValueError("Archive exceeds 2 GB uncompressed limit")
        names = set()
        for entry in members:
            name = entry.filename
            parts = PurePosixPath(name)
            if not name or "\\" in name or ":" in name or parts.is_absolute() or ".." in parts.parts:
                raise ValueError(f"Unsafe archive path: {name}")
            if name.casefold() in names or stat.S_ISLNK(entry.external_attr >> 16):
                raise ValueError(f"Duplicate path or symlink in archive: {name}")
            names.add(name.casefold())
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="import-", dir=destination.parent) as staging:
            staging_path = Path(staging)
            for entry in members:
                target = (staging_path / entry.filename).resolve()
                if not target.is_relative_to(staging_path.resolve()):
                    raise ValueError("Archive path escaped staging")
                if entry.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with bundle.open(entry) as source, target.open("xb") as output:
                        shutil.copyfileobj(source, output)
            if not (staging_path / "manifest.csv").is_file():
                raise ValueError("Archive must contain manifest.csv at the root")
            # Rename preserves the complete, CRC-checked extraction as a single directory.
            staging_path.rename(destination)
    print(f"Extracted {len(members)} entries to {destination}")
    print(f"ZIP sha256={sha256_file(archive)}")
    print(f"Raw manifest sha256={sha256_file(destination / 'manifest.csv')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    args = parser.parse_args()
    try:
        extract(args.archive, args.raw)
    except (ValueError, OSError, zipfile.BadZipFile) as error:
        parser.exit(1, f"Import failed: {error}\n")
