"""Create a marketplace archive from an explicit file list."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

root = Path(__file__).resolve().parent.parent
files = ['LICENSE', 'README.md', 'icon.png', 'index.css', 'index.js', 'plugin.json', 'preview.jpg']
archive = root / 'package.zip'
with ZipFile(archive, 'w', compression=ZIP_DEFLATED) as z:
    for name in files:
        data = (root / 'dist' / name).read_bytes()
        info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, data)
with ZipFile(archive) as z:
    assert z.namelist() == files
    assert z.testzip() is None
    assert not any('\\' in name or name.startswith('/') or '..' in name.split('/') for name in z.namelist())
    assert json.loads(z.read('plugin.json'))['version'] == json.loads((root / 'plugin.json').read_text(encoding='utf-8'))['version']
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(root / 'SHA256SUMS').write_text(f'{digest}  package.zip\n', encoding='utf-8')
print('已生成 package.zip 和 SHA256SUMS。')
