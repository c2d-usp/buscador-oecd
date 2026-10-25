import sqlite3
import os

DB_PATH = os.getenv(
    "METRICS_DB_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "oecd_metrics.db")
)

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_all_metrics():
    conn = connect()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM metrics")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_unique_values(column_name):
    column_mapping = {
        "metric_types": "metric_types",
        "objectives": "objectives",
        "purposes": "purposes",
        "target_users": "target_users",
        "target_sectors": "target_sectors",
        "lifecycle_stages": "lifecycle_stages",
        "usage_rights": "usage_rights",
        "risk_management_stage": "risk_management_stage",
    }
    if column_name not in column_mapping:
        return []
    db_col = column_mapping[column_name]

    conn = connect()
    cursor = conn.cursor()
    cursor.execute(f"SELECT DISTINCT {db_col} FROM metrics WHERE {db_col} != 'N/A' AND {db_col} IS NOT NULL")
    rows = cursor.fetchall()
    conn.close()

    unique_set = set()
    for row in rows:
        val = row[0]
        if val:
            items = [item.strip() for item in val.split(',') if item.strip()]
            unique_set.update(items)
    return sorted(list(unique_set))

def search_metrics(search_term="", filters=None):
    conn = connect()
    cursor = conn.cursor()
    query = "SELECT * FROM metrics WHERE 1=1"
    params = []

    if search_term:
        query += " AND (title LIKE ? OR about LIKE ? OR objectives LIKE ? OR purposes LIKE ?)"
        like_term = f"%{search_term}%"
        params.extend([like_term, like_term, like_term, like_term])

    if filters:
        for col, vals in filters.items():
            db_col = {
                "metric_types": "metric_types",
                "objectives": "objectives",
                "purposes": "purposes",
                "target_users": "target_users",
                "target_sectors": "target_sectors",
                "lifecycle_stages": "lifecycle_stages",
                "usage_rights": "usage_rights",
                "risk_management_stage": "risk_management_stage",
            }.get(col)
            
            if db_col:
                if isinstance(vals, list):
                    sub_queries = []
                    for val in vals:
                        if val and val not in ["", "Todos", "N/A"]:
                            sub_queries.append(f"{db_col} LIKE ?")
                            params.append(f"%{val}%")
                    if sub_queries:
                        query += f" AND ({' OR '.join(sub_queries)})"
                else:
                    if vals and vals not in ["", "Todos", "N/A"]:
                        query += f" AND {db_col} LIKE ?"
                        params.append(f"%{vals}%")

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]