import os
import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g

# Carrega as variáveis locais antes de ler a chave de assinatura do JWT.
load_dotenv()

# Em produção, sempre defina isso no seu .env
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Sem a chave, login e cadastro quebrariam com erro 500 ao gerar o JWT
    raise RuntimeError(
        "SECRET_KEY não definida. Crie o arquivo .env na raiz do projeto com "
        "SECRET_KEY=<chave gerada pelo gerachave.py> (veja o README)."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 dia

def get_password_bytes(password: str) -> bytes:
    """Garante que a senha seja convertida para bytes e respeite o limite de 72 bytes do bcrypt."""
    return password.encode('utf-8')[:72]

def hash_password(password: str) -> str:
    senha_bytes = get_password_bytes(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    senha_bytes = get_password_bytes(plain_password)
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(senha_bytes, hash_bytes)

def create_access_token(user_id: int):
    """Gera o token JWT contendo o ID do usuário."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # O sub (subject) no JWT deve ser string por convenção
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def token_required(f):
    """
    Decorator do Flask para rotas protegidas.
    Verifica o token no cabeçalho Authorization e injeta o usuário em 'g.user'.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        from database import get_users_db   # Importação local para evitar import circular
        
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Token de acesso ausente ou mal formatado"}), 401
        
        token = auth_header.split(" ")[1]
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                raise JWTError("Token sem identificação")
        except JWTError:
            return jsonify({"error": "Token inválido ou expirado"}), 401
        
        conn = get_users_db()
        # Converte de volta para int caso o DB exija
        user = conn.execute("SELECT * FROM users WHERE id=?", (int(user_id),)).fetchone()
        conn.close()
        
        if user is None:
            return jsonify({"error": "Usuário não encontrado"}), 401
        
        # Salva o usuário no contexto global da requisição (g) do Flask
        g.user = dict(user)
        
        return f(*args, **kwargs)
    
    return decorated
