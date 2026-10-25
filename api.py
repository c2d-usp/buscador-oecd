import subprocess
import sys
import os
import json
from datetime import datetime, timezone

from flask import Flask, request, jsonify, Response, send_from_directory, g
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Importando a biblioteca Pillow para processamento de imagens
from PIL import Image, ImageOps

import database as db
import metrics_database as mdb

# Importando a lógica centralizada de segurança
from auth import (
    hash_password, 
    verify_password, 
    create_access_token, 
    token_required, 
    SECRET_KEY
)

# ------------------------------------------------------------
# Configurações
# ------------------------------------------------------------
app = Flask(__name__)
CORS(app)

# Caminhos relativos à pasta do projeto, independente do diretório de onde a API foi iniciada
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

app.config['SECRET_KEY'] = SECRET_KEY
app.config['UPLOAD_FOLDER'] = os.path.join(UPLOADS_DIR, "profile_pics")
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

app.config['RESULTS_FOLDER'] = os.path.join(UPLOADS_DIR, "results")
os.makedirs(app.config['RESULTS_FOLDER'], exist_ok=True)

# Executado na importação para que o gunicorn (Docker) também crie as tabelas de usuários
db.init_users_db()

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def clean_value(value):
    if value is None:
        return None
    value = str(value).strip()
    if not value or value == "Todos":
        return None
    return value

def get_request_data():
    """Tenta obter os dados como JSON, com fallback para FormData. Garante compatibilidade com o React."""
    return request.get_json(silent=True) or request.form or {}

def build_filters(args):
    filters = {}
    param_to_column = {
        "lang": "programming_languages",
        "programming_languages": "programming_languages",
        "maturity": "maturity",
        "technology_platforms": "technology_platforms",
        "lifecycle_stages": "lifecycle_stages",
        "target_sectors": "target_sectors",
        "target_users": "target_users",
        "geographical_scope": "geographical_scope",
        "type_of_approach": "type_of_approach",
        "objectives": "objectives",
        "tool_types": "tool_types",
        "country": "country", 
        "scope": "scope"
    }
    for param_name, column_name in param_to_column.items():
        # Captura múltiplos parâmetros idênticos na URL ou strings separadas por vírgula
        raw_values = args.getlist(param_name)
        if not raw_values and args.get(param_name):
            raw_values = args.get(param_name).split(',')

        cleaned_vals = []
        for val in raw_values:
            cleaned = clean_value(val)
            if cleaned:
                cleaned_vals.append(cleaned)
        
        if cleaned_vals:
            filters[column_name] = cleaned_vals # Agora mapeia para uma lista de valores selecionados
    return filters

def build_metrics_filters(args):
    filters = {}
    param_to_column = {
        "metric_types": "metric_types",
        "objectives": "objectives",
        "purposes": "purposes",
        "target_users": "target_users",
        "target_sectors": "target_sectors",
        "lifecycle_stages": "lifecycle_stages",
        "usage_rights": "usage_rights",
        "risk_management_stage": "risk_management_stage",
    }
    for param_name, column_name in param_to_column.items():
        raw_values = args.getlist(param_name)
        if not raw_values and args.get(param_name):
            raw_values = args.get(param_name).split(',')

        cleaned_vals = []
        for val in raw_values:
            cleaned = clean_value(val)
            if cleaned:
                cleaned_vals.append(cleaned)
        
        if cleaned_vals:
            filters[column_name] = cleaned_vals
    return filters

# ------------------------------------------------------------
# Rotas (ferramentas, métricas, update, health)
# ------------------------------------------------------------
@app.route("/tools", methods=["GET"])
def get_tools():
    search = clean_value(request.args.get("search")) or ""
    filters = build_filters(request.args)
    results = db.search_tools(search_term=search, filters=filters)
    return jsonify(results)

@app.route("/filters", methods=["GET"])
def get_filters():
    return jsonify({
        "type_of_approach": db.get_unique_values("type_of_approach"),
        "programming_languages": db.get_unique_values("programming_languages"),
        "technology_platforms": db.get_unique_values("technology_platforms"),
        "maturity": db.get_unique_values("maturity"),
        "lifecycle_stages": db.get_unique_values("lifecycle_stages"),
        "target_sectors": db.get_unique_values("target_sectors"),
        "target_users": db.get_unique_values("target_users"),
        "geographical_scope": db.get_unique_values("geographical_scope"),
        "objectives": db.get_unique_values("objectives"),
        "tool_types": db.get_unique_values("tool_types"),
        "country": db.get_unique_values("country"), 
        "scope": db.get_unique_values("scope"),
    })

@app.route("/metrics", methods=["GET"])
def get_metrics():
    search = clean_value(request.args.get("search")) or ""
    filters = build_metrics_filters(request.args)
    results = mdb.search_metrics(search_term=search, filters=filters)
    return jsonify(results)

@app.route("/metrics/filters", methods=["GET"])
def get_metrics_filters():
    return jsonify({
        "metric_types": mdb.get_unique_values("metric_types"),
        "objectives": mdb.get_unique_values("objectives"),
        "purposes": mdb.get_unique_values("purposes"),
        "target_users": mdb.get_unique_values("target_users"),
        "target_sectors": mdb.get_unique_values("target_sectors"),
        "lifecycle_stages": mdb.get_unique_values("lifecycle_stages"),
        "usage_rights": mdb.get_unique_values("usage_rights"),
        "risk_management_stage": mdb.get_unique_values("risk_management_stage"),
    })

@app.route("/update_db", methods=["POST"])
def update_db():
    data = get_request_data()
    password = data.get("password")
    token = data.get("token")
    if password != "1943":
        return jsonify({"error": "Senha incorreta!"}), 403
    if not token:
        return jsonify({"error": "Token do GitHub não fornecido!"}), 400

    def generate():
        yield "Iniciando script de atualização...\n"
        try:
            # sys.executable garante o mesmo Python (e venv) da API; UTF-8 evita que títulos
            # com caracteres como "α" derrubem o print dos scrapers no Windows (pipe em cp1252)
            process = subprocess.Popen(
                [sys.executable, "-u", "update.py", token],
                cwd=BASE_DIR,
                env={**os.environ, "PYTHONIOENCODING": "utf-8"},
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                encoding="utf-8",
                errors="replace",
                bufsize=1
            )
            for line in iter(process.stdout.readline, ''):
                yield line
            process.stdout.close()
            process.wait()
            yield f"\nProcesso finalizado com código {process.returncode}\n"
        except Exception as e:
            yield f"\nErro crítico ao executar script: {str(e)}\n"
    return Response(generate(), mimetype="text/plain")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200

# ------------------------------------------------------------
# Servir arquivos estáticos (fotos de perfil)
# ------------------------------------------------------------
@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOADS_DIR, filename)

# ------------------------------------------------------------
# Autenticação e Perfil do Usuário
# ------------------------------------------------------------
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    data = get_request_data()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name", "")

    if not username or not email or not password:
        return jsonify({"error": "Campos obrigatórios: username, email, password"}), 400

    conn = db.get_users_db()
    existing = conn.execute(
        "SELECT id FROM users WHERE email=? OR username=?", (email, username)
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Usuário ou email já cadastrado"}), 400

    hashed = hash_password(password)
    cursor = conn.execute(
        "INSERT INTO users (username, email, password_hash, full_name) VALUES (?,?,?,?)",
        (username, email, hashed, full_name)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    token = create_access_token(user_id)
    user_info = {
        "id": user_id,
        "username": username,
        "email": email,
        "full_name": full_name,
        "bio": "",
        "profile_pic_url": ""
    }
    return jsonify({
        "access_token": token,
        "token_type": "bearer",
        "user": user_info
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = get_request_data()
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Email e senha são obrigatórios"}), 400

    conn = db.get_users_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Credenciais inválidas"}), 401

    token = create_access_token(user["id"])
    return jsonify({
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "bio": user["bio"],
            "profile_pic_url": user["profile_pic_url"]
        }
    })

@app.route("/api/auth/me", methods=["GET"])
@token_required
def get_me():
    # Remover senha do dicionário retornado
    user_data = dict(g.user)
    user_data.pop("password_hash", None)
    return jsonify(user_data)

@app.route("/api/users/me", methods=["PUT"])
@token_required
def update_profile():
    full_name = request.form.get("full_name")
    bio = request.form.get("bio")
    profile_pic = request.files.get("profile_pic")

    updates = {}
    if full_name is not None:
        updates["full_name"] = full_name
    if bio is not None:
        updates["bio"] = bio

    if profile_pic and profile_pic.filename != "":
        filename = secure_filename(profile_pic.filename)
        ext = os.path.splitext(filename)[1]
        
        new_name = f"user_{g.user['id']}_{int(datetime.now(timezone.utc).timestamp())}{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], new_name)
        
        try:
            img = Image.open(profile_pic)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
                
            img = ImageOps.fit(img, (256, 256), Image.Resampling.LANCZOS)
            img.save(filepath, quality=90)
            updates["profile_pic_url"] = f"/uploads/profile_pics/{new_name}"
            
        except Exception as e:
            return jsonify({"error": f"Erro ao processar imagem: {str(e)}"}), 400

    if updates:
        conn = db.get_users_db()
        set_clause = ", ".join(f"{k}=?" for k in updates.keys())
        values = list(updates.values()) + [g.user["id"]]
        conn.execute(f"UPDATE users SET {set_clause} WHERE id=?", values)
        conn.commit()
        
        user = conn.execute("SELECT * FROM users WHERE id=?", (g.user["id"],)).fetchone()
        conn.close()
        
        user_data = dict(user)
        user_data.pop("password_hash", None)
        return jsonify(user_data)
    else:
        user_data = dict(g.user)
        user_data.pop("password_hash", None)
        return jsonify(user_data)

# ------------------------------------------------------------
# Pastas pessoais
# ------------------------------------------------------------
@app.route("/api/folders", methods=["POST"])
@token_required
def create_folder():
    data = get_request_data()
    name = data.get("name")
    
    if not name:
        return jsonify({"error": "Nome da pasta é obrigatório"}), 400
        
    conn = db.get_users_db()
    conn.execute("INSERT INTO folders (user_id, name) VALUES (?,?)", (g.user["id"], name))
    conn.commit()
    conn.close()
    return jsonify({"message": "Pasta criada"}), 201

@app.route("/api/folders", methods=["GET"])
@token_required
def list_folders():
    conn = db.get_users_db()
    folders = conn.execute(
        "SELECT * FROM folders WHERE user_id=? ORDER BY created_at DESC",
        (g.user["id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(f) for f in folders])

@app.route("/api/folders/<int:folder_id>", methods=["DELETE"])
@token_required
def delete_folder(folder_id):
    conn = db.get_users_db()
    folder = conn.execute(
        "SELECT id FROM folders WHERE id=? AND user_id=?",
        (folder_id, g.user["id"])
    ).fetchone()
    
    if not folder:
        conn.close()
        return jsonify({"error": "Pasta não encontrada"}), 404
        
    conn.execute("DELETE FROM folders WHERE id=?", (folder_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Pasta excluída"})

# ------------------------------------------------------------
# Itens salvos
# ------------------------------------------------------------
@app.route("/api/saves", methods=["POST"])
@token_required
def save_item():
    data = get_request_data()
    item_type = data.get("item_type")
    item_id = data.get("item_id")
    folder_id = data.get("folder_id")
    
    if not all([item_type, item_id, folder_id]):
        return jsonify({"error": "Campos obrigatórios: item_type, item_id, folder_id"}), 400
        
    if item_type not in ("tool", "metric"):
        return jsonify({"error": "item_type deve ser 'tool' ou 'metric'"}), 400

    conn = db.get_users_db()
    folder = conn.execute(
        "SELECT id FROM folders WHERE id=? AND user_id=?",
        (folder_id, g.user["id"])
    ).fetchone()
    
    if not folder:
        conn.close()
        return jsonify({"error": "Pasta não encontrada"}), 404

    try:
        conn.execute(
            "INSERT INTO saved_items (user_id, folder_id, item_type, item_id) VALUES (?,?,?,?)",
            (g.user["id"], folder_id, item_type, str(item_id))
        )
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": "Item já salvo nesta pasta ou erro interno"}), 400
    finally:
        conn.close()
        
    return jsonify({"message": "Item salvo"}), 201

@app.route("/api/saves/batch", methods=["POST"])
@token_required
def save_items_batch():
    """Salva múltiplos itens filtrados de uma única vez em uma pasta."""
    data = get_request_data()
    item_type = data.get("item_type")
    folder_id = data.get("folder_id")
    raw_item_ids = data.get("item_ids")
    
    if not all([item_type, folder_id, raw_item_ids]):
        return jsonify({"error": "Campos obrigatórios: item_type, folder_id, item_ids"}), 400
        
    if item_type not in ("tool", "metric"):
        return jsonify({"error": "item_type deve ser 'tool' ou 'metric'"}), 400

    if isinstance(raw_item_ids, str):
        item_ids = [idx.strip() for idx in raw_item_ids.split(",") if idx.strip()]
    else:
        item_ids = raw_item_ids

    conn = db.get_users_db()
    folder = conn.execute(
        "SELECT id FROM folders WHERE id=? AND user_id=?",
        (folder_id, g.user["id"])
    ).fetchone()
    
    if not folder:
        conn.close()
        return jsonify({"error": "Pasta não encontrada"}), 404

    saved_count = 0
    for item_id in item_ids:
        try:
            # Insere ignorando erros de duplicidade (caso o item já esteja salvo nessa pasta)
            conn.execute(
                "INSERT INTO saved_items (user_id, folder_id, item_type, item_id) VALUES (?,?,?,?)",
                (g.user["id"], folder_id, item_type, str(item_id))
            )
            saved_count += 1
        except Exception:
            pass
            
    conn.commit()
    conn.close()
    return jsonify({"message": f"{saved_count} itens processados com sucesso"}), 201

@app.route("/api/folders/<int:folder_id>/items", methods=["GET"])
@token_required
def get_folder_items(folder_id):
    conn = db.get_users_db()
    folder = conn.execute(
        "SELECT id FROM folders WHERE id=? AND user_id=?",
        (folder_id, g.user["id"])
    ).fetchone()
    
    if not folder:
        conn.close()
        return jsonify({"error": "Pasta não encontrada"}), 404

    saved_rows = conn.execute(
        "SELECT id, item_type, item_id, created_at FROM saved_items WHERE folder_id=? AND user_id=? ORDER BY created_at DESC",
        (folder_id, g.user["id"])
    ).fetchall()
    conn.close()

    result = []
    for saved in saved_rows:
        detail = None
        try:
            if saved["item_type"] == "tool":
                tool_conn = db.connect()
                detail_row = tool_conn.execute(
                    "SELECT * FROM tools WHERE id=?", (saved["item_id"],)
                ).fetchone()
                tool_conn.close()
                if detail_row:
                    detail = dict(detail_row)
            elif saved["item_type"] == "metric":
                metric_conn = mdb.connect()
                detail_row = metric_conn.execute(
                    "SELECT * FROM metrics WHERE id=?", (saved["item_id"],)
                ).fetchone()
                metric_conn.close()
                if detail_row:
                    detail = dict(detail_row)
        except Exception:
            pass

        item_dict = dict(saved)
        item_dict["detail"] = detail
        result.append(item_dict)

    return jsonify(result)

@app.route("/api/saves/<int:save_id>", methods=["DELETE"])
@token_required
def remove_save(save_id):
    conn = db.get_users_db()
    conn.execute(
        "DELETE FROM saved_items WHERE id=? AND user_id=?",
        (save_id, g.user["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Removido dos salvos"})

# ------------------------------------------------------------
# Resultados do Usuário (Arquivos)
# ------------------------------------------------------------
@app.route("/api/results", methods=["GET"])
@token_required
def list_results():
    conn = db.get_users_db()
    results = conn.execute(
        "SELECT * FROM results WHERE user_id=? ORDER BY created_at DESC",
        (g.user["id"],)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in results])

@app.route("/api/results", methods=["POST"])
@token_required
def save_result():
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado"}), 400
        
    # Salvar o arquivo fisicamente
    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    file_type = ext.replace('.', '') if ext else 'unknown'
    
    new_name = f"result_{g.user['id']}_{int(datetime.now(timezone.utc).timestamp())}{ext}"
    filepath = os.path.join(app.config['RESULTS_FOLDER'], new_name)
    file.save(filepath)
    
    file_url = f"/uploads/results/{new_name}"
    
    # Salvar no banco de dados
    conn = db.get_users_db()
    conn.execute(
        "INSERT INTO results (user_id, filename, file_url, file_type) VALUES (?,?,?,?)",
        (g.user["id"], file.filename, file_url, file_type) # Salvamos o nome original para display
    )
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Resultado salvo com sucesso", "file_url": file_url}), 201

@app.route("/api/results/<int:result_id>", methods=["DELETE"])
@token_required
def delete_result(result_id):
    conn = db.get_users_db()
    
    # Busca o arquivo para deletar fisicamente do servidor
    result = conn.execute("SELECT file_url FROM results WHERE id=? AND user_id=?", (result_id, g.user["id"])).fetchone()
    
    if not result:
        conn.close()
        return jsonify({"error": "Resultado não encontrado"}), 404
        
    # Remove do disco
    filepath = os.path.join(BASE_DIR, result["file_url"].lstrip("/"))
    if os.path.exists(filepath):
        os.remove(filepath)
        
    # Remove do banco
    conn.execute("DELETE FROM results WHERE id=?", (result_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Resultado excluído"})

# ------------------------------------------------------------
# Progresso da Comparação (Matriz)
# ------------------------------------------------------------
@app.route("/api/folders/<int:folder_id>/comparison", methods=["GET"])
@token_required
def get_comparison_state(folder_id):
    conn = db.get_users_db()
    row = conn.execute(
        "SELECT state_data FROM comparison_states WHERE folder_id=? AND user_id=?",
        (folder_id, g.user["id"])
    ).fetchone()
    conn.close()

    if row:
        return jsonify(json.loads(row["state_data"]))
    return jsonify({}), 200

@app.route("/api/folders/<int:folder_id>/comparison", methods=["PUT"])
@token_required
def save_comparison_state(folder_id):
    data = get_request_data()
    state_data = json.dumps(data)

    conn = db.get_users_db()
    
    # Verifica se a pasta pertence ao usuário logado
    folder = conn.execute("SELECT id FROM folders WHERE id=? AND user_id=?", (folder_id, g.user["id"])).fetchone()
    if not folder:
        conn.close()
        return jsonify({"error": "Pasta não encontrada"}), 404

    # Salva ou atualiza o estado usando REPLACE INTO (Upsert compatível)
    conn.execute('''
        REPLACE INTO comparison_states (folder_id, user_id, state_data, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ''', (folder_id, g.user["id"], state_data))
    
    conn.commit()
    conn.close()

    return jsonify({"message": "Estado da comparação salvo com sucesso!"})

@app.route("/api/folders/<int:folder_id>/comparison", methods=["DELETE"])
@token_required
def delete_comparison_state(folder_id):
    conn = db.get_users_db()
    conn.execute(
        "DELETE FROM comparison_states WHERE folder_id=? AND user_id=?",
        (folder_id, g.user["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Progresso da comparação limpo com sucesso!"})

# ------------------------------------------------------------
# Inicialização
# ------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)