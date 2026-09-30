"""Download verified upstream art sources into the ignored task cache."""
import hashlib
import json
import urllib.request
import zipfile
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
CACHE = SOURCE.parents[2] / '.asset-cache'
for asset in json.loads((SOURCE / 'sources.json').read_text()):
    destination = CACHE / asset['filename']
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists():
        print('Downloading', asset['filename'], flush=True)
        urllib.request.urlretrieve(asset['url'], destination)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    if digest != asset['sha256']:
        raise RuntimeError(f"Checksum mismatch: {destination}")
    if 'extract' in asset:
        directory = CACHE / asset['extract']
        directory.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(destination) as archive:
            for member in archive.infolist():
                if any(member.filename.startswith(prefix) for prefix in asset['include']):
                    target = (directory / member.filename).resolve()
                    if not target.is_relative_to(directory.resolve()):
                        raise RuntimeError('Unsafe archive path')
                    archive.extract(member, directory)
    print('Verified', asset['filename'], flush=True)
