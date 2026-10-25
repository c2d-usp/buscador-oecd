import os
import re
import sqlite3
import time
from datetime import datetime
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

DB_PATH = "oecd_metrics.db"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

HTTP_GITHUB_RE = re.compile(
    r'https?://(?:www\.)?github\.com/[^\s"\'<>)\]]+',
    re.IGNORECASE
)

SSH_GITHUB_RE = re.compile(
    r'git@github\.com:([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)(?:\.git)?',
    re.IGNORECASE
)

INVALID_FIRST_PARTS = {
    "orgs", "topics", "search", "marketplace", "features",
    "login", "settings", "sponsors", "pricing", "apps", "collections"
}

def build_session():
    session = requests.Session()
    retry = Retry(
        total=5, connect=5, read=5, status=5, backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["GET"], raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "OECD-Metric-Updater/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    session.headers.update(headers)
    return session

def normalize_url(url: str) -> str:
    return url.strip().rstrip(".,;:)]}>'\"\\")

def safe_split_path(path: str):
    return [p for p in path.split("/") if p]

def extract_github_url_from_text(text: str):
    if not text or not isinstance(text, str):
        return None

    for match in HTTP_GITHUB_RE.finditer(text):
        url = normalize_url(match.group(0))
        if url.startswith("github.com/"):
            url = "https://" + url
        return url

    m = SSH_GITHUB_RE.search(text)
    if m:
        owner = m.group(1).strip()
        repo = m.group(2).strip().removesuffix(".git")
        return f"https://github.com/{owner}/{repo}"

    return None

def github_api_get(session, url):
    while True:
        try:
            response = session.get(url, timeout=15)
            if response.status_code == 403 and response.headers.get("X-RateLimit-Remaining") == "0":
                reset = int(response.headers.get("X-RateLimit-Reset", "0") or "0")
                wait_for = max(reset - int(time.time()) + 5, 10)
                print(f"[Rate Limit] Aguardando {wait_for}s...")
                time.sleep(wait_for)
                continue
            return response
        except requests.RequestException as e:
            print(f"Erro de rede em {url}: {e}")
            return None

def fetch_repo_data(owner: str, repo: str, session):
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    response = github_api_get(session, api_url)
    if response and response.status_code == 200:
        return response.json()
    return None

def fetch_best_repo_for_owner(owner: str, session):
    endpoints = [
        f"https://api.github.com/orgs/{owner}/repos?per_page=100&sort=pushed&direction=desc",
        f"https://api.github.com/users/{owner}/repos?per_page=100&sort=pushed&direction=desc",
    ]
    best_repo = None
    best_pushed_at = None

    for api_url in endpoints:
        response = github_api_get(session, api_url)
        if not response or response.status_code != 200:
            continue
        
        repos = response.json()
        for repo in repos:
            pushed_at = repo.get("pushed_at")
            if pushed_at and (best_pushed_at is None or pushed_at > best_pushed_at):
                best_pushed_at = pushed_at
                best_repo = repo
                
        if best_repo:
            break
            
    return best_repo

def get_github_last_push(url, session):
    if not url:
        return "N/A"

    url = normalize_url(url)
    if "github.com" not in url.lower():
        return "N/A"

    parsed = urlparse(url if url.startswith("http") else "https://" + url)
    parts = safe_split_path(parsed.path)

    try:
        if len(parts) >= 2 and parts[0].lower() not in INVALID_FIRST_PARTS:
            owner, repo = parts[0].strip(), parts[1].strip().removesuffix(".git")
            data = fetch_repo_data(owner, repo, session)
            if data and data.get("pushed_at"):
                return data["pushed_at"].split("T")[0]

        elif len(parts) >= 1:
            owner = parts[0].strip()
            if owner and owner.lower() not in INVALID_FIRST_PARTS:
                best_repo = fetch_best_repo_for_owner(owner, session)
                if best_repo and best_repo.get("pushed_at"):
                    return best_repo["pushed_at"].split("T")[0]
    except Exception as e:
        print(f"Erro ao processar URL GitHub {url}: {e}")

    return "N/A"

def process_tool(row, session):
    metric_id, title, _, local_links = row
    
    github_url = extract_github_url_from_text(local_links)
    
    if not github_url:
        return metric_id, title, "N/A"
        
    last_push = get_github_last_push(github_url, session)
    return metric_id, title, last_push

def update_github_dates():
    print(f"Iniciando atualização rápida do GitHub (métricas). Token ativo: {bool(GITHUB_TOKEN)}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    query = """
        SELECT id, title, '', local_links 
        FROM metrics 
        WHERE local_links LIKE '%github.com%'
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    
    print(f"Encontradas {len(rows)} métricas candidatas com links do GitHub no banco.")
    
    session = build_session()
    updates = []
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_tool, row, session): row for row in rows}
        
        for future in as_completed(futures):
            try:
                metric_id, title, last_push = future.result()
                if last_push != "N/A":
                    updates.append((last_push, metric_id))
            except Exception as e:
                print(f"Erro na thread: {e}")

    if updates:
        print(f"\nSalvando {len(updates)} alterações no banco de dados...")
        cursor.executemany("""
            UPDATE metrics 
            SET github_last_push = ? 
            WHERE id = ?
        """, updates)
        conn.commit()
    else:
        print("\nNenhuma nova data para atualizar.")

    conn.close()
    print("Atualização concluída.")

if __name__ == "__main__":
    start_time = time.time()
    update_github_dates()
    print(f"Tempo total de execução: {time.time() - start_time:.2f} segundos")