import sqlite3
import os
import datetime

# Caminhos relativos à pasta do projeto (e não ao diretório de onde o script foi chamado)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.getenv("DB_PATH", os.path.join(BASE_DIR, "oecd_tools.db"))
USERS_DB_PATH = os.getenv("USERS_DB_PATH", os.path.join(BASE_DIR, "users.db"))

def get_users_db():
    """Conecta ao banco de dados dos usuários com suporte a dicionários."""
    conn = sqlite3.connect(USERS_DB_PATH)
    conn.row_factory = sqlite3.Row
    # O SQLite só respeita as FOREIGN KEYs (ON DELETE CASCADE) se isso for ativado em cada conexão
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_users_db():
    """Inicializa as tabelas do usuário, se não existirem."""
    conn = get_users_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            bio TEXT DEFAULT '',
            profile_pic_url TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS saved_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            folder_id INTEGER NOT NULL,
            item_type TEXT NOT NULL CHECK(item_type IN ('metric', 'tool')),
            item_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
            UNIQUE(user_id, folder_id, item_type, item_id)
        );
        
        CREATE TABLE IF NOT EXISTS results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_url TEXT NOT NULL,
            file_type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS comparison_states (
            folder_id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            state_data TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    ''')
    conn.commit()
    conn.close()

def get_tool_by_id(tool_id):
    """Retorna uma ferramenta específica pelo ID."""
    conn = connect()
    row = conn.execute("SELECT * FROM tools WHERE id=?", (tool_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def connect():
    """Estabelece a conexão com o banco de dados principal e configura o retorno como dicionário."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row 
    return conn

def get_all_tools():
    """Retorna todas as ferramentas cadastradas no banco."""
    conn = connect()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tools")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_unique_values(column_name):
    """
    Retorna uma lista de valores únicos de uma coluna.
    Sincronizado com os endpoints do api.py e as requisições do frontend.
    """
    allowed_columns = [
        "type_of_approach", 
        "programming_languages", 
        "technology_platforms", 
        "maturity", 
        "lifecycle_stages",
        "target_sectors",
        "target_users",
        "geographical_scope",
        "objectives",
        "type", 
        "tool_types", 
        "usage_rights", 
        "stakeholder_group",
        "country",
        "scope"
    ]
    
    if column_name not in allowed_columns:
        return []

    conn = connect()
    cursor = conn.cursor()
    
    # Busca ignorando N/A e valores nulos
    query = f"SELECT DISTINCT {column_name} FROM tools WHERE {column_name} != 'N/A' AND {column_name} IS NOT NULL"
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    unique_set = set()
    for row in rows:
        val = row[0]
        if val:
            # Separa pela vírgula, remove espaços vazios e adiciona ao set se não for vazio
            items = [item.strip() for item in val.split(',') if item.strip()]
            unique_set.update(items)
            
    # Retorna uma lista ordenada alfabeticamente
    return sorted(list(unique_set))

def search_tools(search_term="", filters=None):
    conn = connect()
    cursor = conn.cursor()

    query = "SELECT * FROM tools WHERE 1=1"
    params = []

    if search_term:
        query += " AND (title LIKE ? OR tags LIKE ? OR objectives LIKE ? OR purposes LIKE ?)"
        like_term = f"%{search_term}%"
        params.extend([like_term, like_term, like_term, like_term])

    # Filtros específicos adaptados para listas (Multi-seleção inclusiva)
    if filters:
        for col, vals in filters.items():
            if isinstance(vals, list):
                sub_queries = []
                for val in vals:
                    if val and val not in ["", "Todos", "N/A"]:
                        sub_queries.append(f"{col} LIKE ?")
                        params.append(f"%{val}%")
                if sub_queries:
                    query += f" AND ({' OR '.join(sub_queries)})"
            else:
                if vals and vals not in ["", "Todos", "N/A"]:
                    query += f" AND {col} LIKE ?"
                    params.append(f"%{vals}%")

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]