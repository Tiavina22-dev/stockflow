"""Prépare un paquet privé, exact et reproductible ; aucune connexion SQL."""
import argparse
from collections import Counter
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import uuid
from analyze_legacy import read_dump, numeric

ZONE = timezone(timedelta(hours=3))
def ident(source_hash, kind, key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f'stockflow:{source_hash}:{kind}:{key}'))

def timestamp(value):
    try:
        return datetime.fromisoformat(value).replace(tzinfo=ZONE).isoformat()
    except (ValueError, TypeError):
        return None

def clean(table, row):
    # Les historiques techniques peuvent contenir des identifiants/mots de passe.
    if table == 'history' and row.get('type') not in ['Prix', 'Mvt_Stock', 'Mvt_Vente', 'conges', 'citation']:
        return {k: ('[CONTENU TECHNIQUE MASQUÉ]' if k in ['before_change', 'after_change', 'details'] else v) for k,v in row.items()}
    if any(re.search(r'password|mot.?de.?passe|passwd|token|secret', str(v), re.I) for v in row.values()):
        return {k: ('[CONTENU SENSIBLE MASQUÉ]' if k not in ['history_id','type','flag','date_time','responsable'] else v) for k,v in row.items()}
    return row

def mapped_path(root, raw):
    if not raw: return None
    text=re.sub(r'/+', '/', str(raw).replace('\\','/'))
    prefix='C:/wamp64/www/GESTION_STOCK/'
    if text.lower().startswith(prefix.lower()): text=text[len(prefix):]
    if ':' in text or text.startswith('/') or '..' in Path(text).parts: return None
    p=(root/text).resolve()
    if not p.is_relative_to(root.resolve()) or p.is_symlink(): return None
    return p

def prepare(source, root, dest):
    dest.mkdir(parents=True, exist_ok=False)
    sha=hashlib.sha256(source.read_bytes()).hexdigest()
    archive=dest/'records.ndjson'
    occurrences=Counter()
    with archive.open('x',encoding='utf-8') as out:
        def consume(table,row):
            if table=='user': return # Aucune copie des anciens mots de passe.
            key=str(next(iter(row.values())))
            occurrences[(table,key)]+=1
            if occurrences[(table,key)]>1:
                key=f'{key}#ROW-{occurrences[(table,key)]}'
            out.write(json.dumps({'id':ident(sha,table,key),'sourceTable':table,'sourceKey':key,'payload':clean(table,row)},ensure_ascii=False)+'\n')
        counts,t=read_dump(source,consume)
    products={r['id_x']:r for r in t['produit']}
    refs=Counter((r.get('reference_x') or '').strip() for r in products.values())
    groups={}; rejected=[]; stock={}; authors=set()
    for r in t['mvt']:
        q=numeric(r['qt']); price=numeric(r.get('prix_unitaire')); shop=r['nom_client_fournisseur']
        reason=None
        if r['id_x'] not in products: reason='PRODUIT_ORPHELIN'
        elif shop not in [s['short_name'] for s in t['shop']]: reason='MAGASIN_INCONNU'
        elif q is None or q==0 or q!=q.quantize(Decimal('.001')): reason='QUANTITE_NON_IMPORTABLE'
        elif not timestamp(r.get('Date_du_Journal_mvt')) or not timestamp(r.get('date_time')): reason='DATE_NON_IMPORTABLE'
        elif r['type_de_mvt'] not in ['stock','vente']: reason='TYPE_INCONNU'
        elif r['type_de_mvt']=='vente' and (q>=0 or price is None or price<0 or price!=price.quantize(Decimal('.01'))): reason='VENTE_NON_IMPORTABLE'
        if reason:
            rejected.append({'sourceId':r['id_mvt'],'reason':reason});continue
        key=json.dumps([r['type_de_mvt'],shop,r['numero_commande_stock'],r['Date_du_Journal_mvt'],r['user_mvt']],ensure_ascii=False)
        groups.setdefault(key,[]).append(r)
        pair=json.dumps([r['id_x'],shop],ensure_ascii=False)
        stock[pair]=stock.get(pair,Decimal(0))+q
        authors.add(r['user_mvt'])
    files={}; unresolved=[]
    # Toutes les pièces disponibles sont conservées, même sans rattachement fiable.
    paths=[]
    if (root/'pj').is_dir(): paths.extend((root/'pj').rglob('*'))
    paths.extend(p for r in products.values() if (p:=mapped_path(root,r.get('img_path_x'))) and p.is_file())
    for p in paths:
        if not p.is_file() or p.is_symlink(): continue
        resolved=p.resolve()
        if not resolved.is_relative_to(root.resolve()): raise ValueError('Fichier hors racine source')
        rel=resolved.relative_to(root.resolve()).as_posix()
        digest=hashlib.sha256(resolved.read_bytes()).hexdigest()
        files[rel]={'relativePath':rel,'sha256':digest,'size':resolved.stat().st_size}
    for r in t['recap_vente']:
        p=mapped_path(root,r.get('directory'))
        if r.get('directory') and (p is None or not p.is_dir()): unresolved.append(r['id'])
    plan={'version':1,'sourceHash':sha,'tables':dict(counts),'shops':t['shop'],'categories':t['categorie'],'units':t['unite'],
          'products':[{**r,'targetId':ident(sha,'product',r['id_x']),'targetReference':f"LEGACY-{r['id_x']}" if not (r.get('reference_x') or '').strip() or refs[(r.get('reference_x') or '').strip()]>1 else r['reference_x'].strip()} for r in products.values()],
          'groups':[{'id':ident(sha,'operation',k),'key':k,'rows':v} for k,v in groups.items()],
          'authors':sorted(authors),'quarantine':rejected,'balances':{k:str(v) for k,v in stock.items()},
          'files':list(files.values()),'missingAttachmentDirectories':unresolved,
          'recordFileHash':hashlib.sha256(archive.read_bytes()).hexdigest()}
    (dest/'plan.json').write_text(json.dumps(plan,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'products':len(products),'operations':len(groups),'movements':sum(len(v) for v in groups.values()),'quarantine':rejected,'files':len(files),'missingDirectories':len(unresolved)},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('filesRoot',type=Path);p.add_argument('destination',type=Path)
    a=p.parse_args();prepare(a.source.resolve(),a.filesRoot.resolve(),a.destination.resolve())
