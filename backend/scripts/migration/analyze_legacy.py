"""Analyse un dump phpMyAdmin sans exécuter de SQL ni accéder à une base cible."""
import argparse
from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import re

INSERT = re.compile(r"INSERT INTO `([^`]+)`\s*\(([^)]+)\)\s*VALUES\s*", re.I)
ESCAPES = {"0": "\0", "n": "\n", "r": "\r", "t": "\t", "Z": "\x1a"}


def rows(text, start):
    """Sous-ensemble strict : tuples de littéraux SQL, chaînes MySQL et NULL."""
    i, length = start, len(text)
    while i < length:
        while i < length and text[i].isspace():
            i += 1
        if i < length and text[i] == ";":
            return i + 1
        if i >= length or text[i] != "(":
            raise ValueError(f"Tuple SQL attendu à l'octet {i}")
        i += 1
        values = []
        while True:
            while i < length and text[i].isspace():
                i += 1
            if i < length and text[i] == "'":
                i += 1
                result = []
                while i < length:
                    char = text[i]
                    i += 1
                    if char == "\\":
                        if i >= length:
                            raise ValueError("Échappement SQL tronqué")
                        result.append(ESCAPES.get(text[i], text[i]))
                        i += 1
                    elif char == "'":
                        if i < length and text[i] == "'":
                            result.append("'")
                            i += 1
                        else:
                            break
                    else:
                        result.append(char)
                else:
                    raise ValueError("Chaîne SQL tronquée")
                value = "".join(result)
            else:
                begin = i
                while i < length and text[i] not in ",)":
                    i += 1
                token = text[begin:i].strip()
                if token.upper() == "NULL":
                    value = None
                elif re.fullmatch(r"[+-]?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?", token):
                    value = token  # Conserver les décimales sans conversion FLOAT.
                else:
                    raise ValueError(f"Littéral SQL non pris en charge à l'octet {begin}")
            values.append(value)
            while i < length and text[i].isspace():
                i += 1
            if i >= length:
                raise ValueError("Tuple SQL tronqué")
            separator = text[i]
            i += 1
            if separator == ")":
                break
            if separator != ",":
                raise ValueError(f"Séparateur SQL invalide à l'octet {i}")
        yield values
        while i < length and text[i].isspace():
            i += 1
        if i < length and text[i] == ",":
            i += 1
        elif i < length and text[i] == ";":
            return i + 1
        else:
            raise ValueError(f"Fin INSERT invalide à l'octet {i}")
    raise ValueError("INSERT SQL tronqué")


def read_dump(source, consumer=None):
    text = source.read_text(encoding="utf-8-sig")
    kept = {key: [] for key in ["produit", "categorie", "unite", "shop", "mvt", "recap_vente", "depense", "commande", "stock_prep"]}
    counts = Counter({name: 0 for name in re.findall(r"CREATE TABLE IF NOT EXISTS `([^`]+)`", text)})
    cursor = 0
    while match := INSERT.search(text, cursor):
        table = match.group(1)
        columns = re.findall(r"`([^`]+)`", match.group(2))
        if not columns or len(set(columns)) != len(columns):
            raise ValueError(f"Colonnes invalides dans {table}")
        iterator = rows(text, match.end())
        while True:
            try:
                values = next(iterator)
            except StopIteration as end:
                cursor = end.value
                break
            if len(values) != len(columns):
                raise ValueError(f"Nombre de valeurs incorrect dans {table}")
            counts[table] += 1
            if consumer:
                consumer(table, dict(zip(columns, values)))
            if table in kept:
                kept[table].append(dict(zip(columns, values)))
    return counts, kept


def numeric(value):
    try:
        result = Decimal(value)
        return result if result.is_finite() else None
    except (InvalidOperation, TypeError):
        return None


def valid_date(value):
    try:
        date.fromisoformat(value)
        return True
    except (ValueError, TypeError):
        return False


def asset(root, value):
    if not value:
        return "absent_en_base"
    if not root:
        return "dossier_non_fourni"
    raw = str(value).replace("\\", "/")
    if ":" in raw or raw.startswith("/") or ".." in Path(raw).parts:
        return "chemin_a_verifier"
    target = (root / raw.removeprefix("./")).resolve()
    if not target.is_relative_to(root.resolve()):
        return "chemin_a_verifier"
    return "present" if target.is_file() else "introuvable"


def analyze(source, files_root=None):
    counts, tables = read_dump(source)
    products = {row["id_x"]: row for row in tables["produit"]}
    duplicates = defaultdict(list)
    missing_names, missing_refs = [], []
    for row in products.values():
        ref = (row.get("reference_x") or "").strip()
        if ref:
            duplicates[ref].append(row["id_x"])
        else:
            missing_refs.append(row["id_x"])
        if not (row.get("nom_x") or "").strip():
            missing_names.append(row["id_x"])
    balances, precision = defaultdict(Decimal), []
    orphan, invalid, missing_dates = [], [], []
    authors, types, shops, attachment_states = Counter(), Counter(), Counter(), Counter()
    for row in tables["mvt"]:
        quantity = numeric(row.get("qt"))
        key = (row.get("id_x"), row.get("nom_client_fournisseur"))
        types[row.get("type_de_mvt")] += 1
        shops[key[1]] += 1
        authors[row.get("user_mvt")] += 1
        if quantity is None:
            invalid.append(row["id_mvt"])
        else:
            balances[key] += quantity
            if quantity != quantity.quantize(Decimal("0.001")):
                precision.append(row["id_mvt"])
        if key[0] not in products:
            orphan.append(row["id_mvt"])
        if not valid_date(row.get("Date_du_Journal_mvt")):
            missing_dates.append(row["id_mvt"])
    activities = {row.get("no_activite") for row in tables["recap_vente"]}
    for row in tables["recap_vente"]:
        attachment_states[asset(files_root, row.get("directory"))] += 1
    return {
        "source": {"filename": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "size": source.stat().st_size},
        "mode": "ANALYSE_SEULE_AUCUNE_ECRITURE_BASE", "tables": dict(counts),
        "shops": [{"id": row.get("shop_id"), "name": row.get("short_name"), "longName": row.get("long_name")} for row in tables["shop"]],
        "products": {"missingReferences": missing_refs, "missingNames": missing_names, "duplicateReferences": {key: value for key, value in duplicates.items() if len(value) > 1}},
        "movements": {"types": dict(types), "shops": dict(shops), "sourceAuthors": dict(authors), "orphanProductIds": orphan, "invalidQuantities": invalid, "quantitiesBeyondThreeDecimals": precision, "missingStructuredBusinessDate": missing_dates},
        "stock": {"pairs": len(balances), "negative": [{"productId": key[0], "shop": key[1], "quantity": str(value)} for key, value in sorted(balances.items(), key=lambda item: str(item[0])) if value < 0], "basis": "Somme des quantités des mouvements, y compris orphelins ; pas une quantité physique vérifiée."},
        "finance": {"expensesWithoutDate": sum(not valid_date(row.get("date_time")) for row in tables["depense"]), "expensesWithoutRecap": sum(row.get("activity_no") not in activities for row in tables["depense"]), "recapAmounts": "Valeurs source à qualifier ; aucun versement ou paiement déduit automatiquement.", "attachments": dict(attachment_states)},
        "photos": dict(Counter(asset(files_root, row.get("img_path_x")) for row in products.values())),
        "constraints": ["Ne pas importer de mot de passe ancien.", "Ne pas inventer coût, TVA ou paiement historiques.", "Ne pas valider les brouillons historiques.", "Ne pas déduire un sous-type de stock depuis une note.", "Conserver les données actuelles ; rapprochement avant import réel."]
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--files-root", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    report = analyze(args.source.resolve(), args.files_root.resolve() if args.files_root else None)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as destination:
        json.dump(report, destination, ensure_ascii=False, indent=2)
    print(json.dumps({"report": str(args.output), "products": report["tables"]["produit"], "movements": report["tables"]["mvt"], "negativeStockPairs": len(report["stock"]["negative"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
