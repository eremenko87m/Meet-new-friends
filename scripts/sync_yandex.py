from __future__ import annotations
import io, json, mimetypes, os, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
import requests
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
DATA_PATH = ROOT / 'data' / 'exercises.json'
MEDIA_ROOT = ROOT / 'assets' / 'media'
YANDEX_DOWNLOAD_API = 'https://cloud-api.yandex.net/v1/disk/public/resources/download'
TIMEOUT = 35


def yandex_direct(public_url: str) -> str:
    r = requests.get(YANDEX_DOWNLOAD_API, params={'public_key': public_url}, timeout=TIMEOUT)
    r.raise_for_status()
    href = r.json().get('href')
    if not href:
        raise RuntimeError(f'Yandex did not return a download URL for {public_url}')
    return href


def download_public_file(public_url: str) -> bytes:
    href = yandex_direct(public_url)
    r = requests.get(href, timeout=TIMEOUT)
    r.raise_for_status()
    return r.content


def is_yandex_share(url: str) -> bool:
    try:
        host = urlparse(url).netloc.lower()
        return host.endswith('disk.yandex.ru') or host.endswith('yadi.sk')
    except Exception:
        return False


def clean_text(value) -> str:
    if value is None: return ''
    if isinstance(value, bool): return 'YES' if value else 'NO'
    return str(value).strip()


def ext_from_response(resp: requests.Response, fallback: str) -> str:
    cd = resp.headers.get('content-disposition','')
    m = re.search(r'filename\*?=(?:UTF-8\'\')?["\']?([^"\';]+)', cd, re.I)
    if m:
        suffix = Path(m.group(1)).suffix
        if suffix: return suffix.lower()
    ct = resp.headers.get('content-type','').split(';')[0].strip()
    return mimetypes.guess_extension(ct) or fallback


def cache_media(url: str, section: str, no: int, kind: str) -> str:
    url = clean_text(url)
    if not url: return ''
    if not is_yandex_share(url): return url
    try:
        href = yandex_direct(url)
        resp = requests.get(href, timeout=TIMEOUT)
        resp.raise_for_status()
        fallback = '.jpg' if kind == 'image' else '.mp3'
        ext = ext_from_response(resp, fallback)
        folder = MEDIA_ROOT / section
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob(f'{no:02d}-{kind}.*'):
            old.unlink(missing_ok=True)
        path = folder / f'{no:02d}-{kind}{ext}'
        path.write_bytes(resp.content)
        return path.relative_to(ROOT).as_posix()
    except Exception as exc:
        print(f'WARNING media {url}: {exc}')
        return url


def row_map(headers):
    norm = {clean_text(v).lower(): i for i,v in enumerate(headers)}
    aliases = {
        'no':['no','#','number','номер'], 'title':['title','name','название'],
        'link':['link','url','ссылка'], 'image':['image','picture','img','картинка'],
        'audio':['audio','аудио'], 'level':['level','уровень'],
        'notes':['notes','note','comment','комментарий','примечание'],
        'active':['active','show','visible','активно']
    }
    out={}
    for key,names in aliases.items():
        for name in names:
            if name in norm: out[key]=norm[name]; break
    return out


def val(row, idx, default=''):
    if idx is None or idx >= len(row): return default
    return clean_text(row[idx])


def make_default(section_slug: str, no: int):
    return {'no':no,'id':f'{section_slug}-{no}','title':'','link':'','image':'','audio':'','level':'','notes':'','active':True}


def main():
    sections_cfg = CONFIG['sections']; cards_per = int(CONFIG.get('cards_per_section',40))
    output = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'source': CONFIG['yandex_table_public_url'], 'sections': {}}
    try:
        content = download_public_file(CONFIG['yandex_table_public_url'])
        wb = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    except Exception as exc:
        print(f'WARNING: Yandex table could not be downloaded: {exc}')
        if DATA_PATH.exists():
            print('Keeping existing data/exercises.json')
            return
        raise

    for sec in sections_cfg:
        slug, sheet_name = sec['slug'], sec['sheet']
        cards=[make_default(slug,i) for i in range(1,cards_per+1)]
        if sheet_name not in wb.sheetnames:
            print(f'WARNING: missing sheet {sheet_name!r}')
            output['sections'][slug]=cards; continue
        ws=wb[sheet_name]
        rows=list(ws.iter_rows(values_only=True))
        if not rows:
            output['sections'][slug]=cards; continue
        mapping=row_map(rows[0])
        for position,row in enumerate(rows[1:cards_per+1], start=1):
            no_raw=val(row,mapping.get('no'),str(position))
            try: no=int(float(no_raw))
            except Exception: no=position
            if not (1 <= no <= cards_per): continue
            active_raw=val(row,mapping.get('active'),'YES').lower()
            active=active_raw not in {'no','false','0','нет','off'}
            card={
                'no':no, 'id':f'{slug}-{no}', 'title':val(row,mapping.get('title')),
                'link':val(row,mapping.get('link')), 'image':'', 'audio':'',
                'level':val(row,mapping.get('level')), 'notes':val(row,mapping.get('notes')), 'active':active
            }
            card['image']=cache_media(val(row,mapping.get('image')),slug,no,'image')
            card['audio']=cache_media(val(row,mapping.get('audio')),slug,no,'audio')
            cards[no-1]=card
        output['sections'][slug]=cards

    DATA_PATH.parent.mkdir(parents=True,exist_ok=True)
    DATA_PATH.write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'Updated {DATA_PATH}')

if __name__ == '__main__': main()
