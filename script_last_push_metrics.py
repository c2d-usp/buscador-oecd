import os
import re
import sqlite3
import time
from datetime import datetime
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException

# Modo: atualiza apenas github_last_push
UPDATE_ONLY_GITHUB = True

DB_PATH = "oecd_metrics.db"

CAMPOS_DETALHADOS = [
    "Metric type(s)", "Objective(s)", "Purpose(s)", 
    "Usage rights", "Target users", "Target sector(s)", 
    "Lifecycle stage(s)", "Risk management stage(s)", "Risk management stage"
]

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

HTTP_GITHUB_RE = re.compile(
    r'https?://(?:www\.)?github\.com/[^\s"\'<>)]+',
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
        total=5,
        connect=5,
        read=5,
        status=5,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)

    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "Mozilla/5.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"

    session.headers.update(headers)
    return session


def normalize_url(url: str) -> str:
    return url.strip().rstrip(".,;:)]}>'\"")


def safe_split_path(path: str):
    return [p for p in path.split("/") if p]


def extract_owner_repo_from_url(url: str):
    parsed = urlparse(url)
    if "github.com" not in parsed.netloc.lower():
        return None

    parts = safe_split_path(parsed.path)
    if len(parts) < 2:
        return None

    owner = parts[0].strip()
    repo = parts[1].strip().removesuffix(".git")

    if not owner or not repo:
        return None

    if owner.lower() in INVALID_FIRST_PARTS:
        return None

    return owner, repo


def extract_github_url_from_text(text: str):
    if not text or not isinstance(text, str):
        return None

    for match in HTTP_GITHUB_RE.finditer(text):
        url = normalize_url(match.group(0))
        if url.startswith("github.com/"):
            url = "https://" + url
        if "github.com" in url.lower():
            return url

    m = SSH_GITHUB_RE.search(text)
    if m:
        owner = m.group(1).strip()
        repo = m.group(2).strip().removesuffix(".git")
        return f"https://github.com/{owner}/{repo}"

    return None


def github_api_get(session, url):
    """
    Faz GET com tratamento básico de rate limit.
    Retorna response ou None.
    """
    while True:
        try:
            response = session.get(url, timeout=20)

            if response.status_code == 403 and response.headers.get("X-RateLimit-Remaining") == "0":
                reset = int(response.headers.get("X-RateLimit-Reset", "0") or "0")
                wait_for = max(reset - int(time.time()) + 5, 10)
                print(f"Rate limit atingido. Aguardando {wait_for}s...")
                time.sleep(wait_for)
                continue

            return response

        except requests.RequestException as e:
            print(f"Erro de rede ao consultar {url}: {e}")
            return None


def fetch_repo_data(owner: str, repo: str, session):
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    response = github_api_get(session, api_url)

    if not response:
        return None

    if response.status_code == 200:
        return response.json()

    return None


def fetch_best_repo_for_owner(owner: str, session):
    """
    Para URLs como https://github.com/openimis.
    Tenta primeiro organização, depois usuário.
    Escolhe o repositório com pushed_at mais recente.
    """
    endpoints = [
        f"https://api.github.com/orgs/{owner}/repos?per_page=100&page={{page}}&sort=pushed&direction=desc",
        f"https://api.github.com/users/{owner}/repos?per_page=100&page={{page}}&sort=pushed&direction=desc",
    ]

    best_repo = None
    best_pushed_at = None

    for endpoint_template in endpoints:
        page = 1
        while page <= 10:
            api_url = endpoint_template.format(page=page)
            response = github_api_get(session, api_url)

            if not response:
                break

            if response.status_code != 200:
                break

            repos = response.json()
            if not repos:
                break

            for repo in repos:
                pushed_at = repo.get("pushed_at")
                if not pushed_at:
                    continue

                if best_pushed_at is None or pushed_at > best_pushed_at:
                    best_pushed_at = pushed_at
                    best_repo = repo

            if len(repos) < 100:
                break

            page += 1

        if best_repo:
            break

    return best_repo


def get_github_last_push(url, session):
    """
    Lida com:
    - repo direto: https://github.com/openimis/openimis
    - org/user page: https://github.com/openimis
    Retorna YYYY-MM-DD ou "N/A".
    """
    if not url:
        return "N/A"

    url = normalize_url(url)

    if "github.com" not in url.lower():
        return "N/A"

    parsed = urlparse(url if url.startswith("http") else "https://" + url)
    parts = safe_split_path(parsed.path)

    try:
        # Caso 1: URL direta de repositório
        if len(parts) >= 2 and parts[0].lower() not in INVALID_FIRST_PARTS:
            owner = parts[0].strip()
            repo = parts[1].strip().removesuffix(".git")

            data = fetch_repo_data(owner, repo, session)
            if data and data.get("pushed_at"):
                return data["pushed_at"].split("T")[0]

        # Caso 2: URL de organização/usuário
        if len(parts) >= 1:
            owner = parts[0].strip()
            if owner and owner.lower() not in INVALID_FIRST_PARTS:
                best_repo = fetch_best_repo_for_owner(owner, session)
                if best_repo and best_repo.get("pushed_at"):
                    return best_repo["pushed_at"].split("T")[0]

    except Exception as e:
        print(f"Erro ao processar URL GitHub {url}: {e}")

    return "N/A"


def setup_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            about TEXT,
            local TEXT,
            local_links TEXT,
            github_last_push TEXT,
            relevance TEXT,
            total_text TEXT,
            media_links TEXT,
            metric_types TEXT,
            objectives TEXT,
            purposes TEXT,
            usage_rights TEXT,
            target_users TEXT,
            target_sectors TEXT,
            lifecycle_stages TEXT,
            risk_management_stage TEXT
        )
    """)
    conn.commit()
    return conn


def update_github_only(conn, title, github_last_push):
    """
    Atualiza apenas github_last_push na tabela metrics usando title como chave.
    """
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE metrics
        SET github_last_push = ?
        WHERE title = ?
    """, (github_last_push, title))
    conn.commit()


def insert_metric(conn, base_data, details_data):
    """
    Insere uma nova métrica. Mantido para caso UPDATE_ONLY_GITHUB seja False.
    """
    cursor = conn.cursor()
    
    risk_stage = details_data.get('Risk management stage(s)')
    if risk_stage == "N/A" or not risk_stage:
        risk_stage = details_data.get('Risk management stage', 'N/A')
        
    cursor.execute("""
        INSERT INTO metrics (
            title, about, local, local_links, github_last_push, relevance, total_text, media_links,
            metric_types, objectives, purposes, usage_rights, target_users, 
            target_sectors, lifecycle_stages, risk_management_stage
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        base_data['title'], base_data['about'], base_data['local'], base_data['local_links'],
        base_data['github_last_push'], base_data['relevance'],
        details_data['total_text'], details_data['media_links'],
        details_data['Metric type(s)'], details_data['Objective(s)'], details_data['Purpose(s)'], 
        details_data['Usage rights'], details_data['Target users'], 
        details_data['Target sector(s)'], details_data['Lifecycle stage(s)'], risk_stage
    ))
    conn.commit()


def run_scraper():
    chrome_options = Options()
    # chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)
    url = "https://oecd.ai/en/catalogue/metrics"

    session = build_session()
    print("Token ativo:", bool(GITHUB_TOKEN))

    try:
        print(f"Acessando: {url}")
        driver.get(url)
        wait = WebDriverWait(driver, 15)
        conn = setup_database()

        main_window = driver.current_window_handle
        current_page = 1

        while True:
            cards = wait.until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "app-metric-card"))
            )
            print(f"\n=== Página {current_page} ===")
            print(f"Encontradas {len(cards)} métricas na página atual.")

            page_metrics = []
            for card in cards:
                base_data = {
                    "title": "N/A", "about": "N/A", "local": "N/A",
                    "local_links": "N/A", "github_last_push": "N/A",
                    "relevance": "N/A"
                }
                local_link = None

                try:
                    title_elem = card.find_element(By.CSS_SELECTOR, "h2.title a")
                    base_data["title"] = title_elem.text.strip()
                    local_link = title_elem.get_attribute("href")
                except NoSuchElementException:
                    pass

                try:
                    relevance_elem = card.find_element(By.XPATH, ".//h2[contains(@class, 'title')]//span[contains(@class, 'tag')]")
                    rel_text = relevance_elem.text.strip()
                    numeros = re.findall(r'\d+', rel_text)
                    if numeros:
                        base_data['relevance'] = numeros[0]
                    else:
                        base_data['relevance'] = rel_text
                except NoSuchElementException:
                    pass

                try:
                    about_elem = card.find_element(By.XPATH, ".//h2[contains(@class, 'title')]/following-sibling::div//p")
                    base_data["about"] = about_elem.text.strip()
                except NoSuchElementException:
                    pass

                page_metrics.append((base_data, local_link))

            for index, (base_data, local_link) in enumerate(page_metrics):
                if local_link:
                    driver.execute_script("window.open('');")
                    driver.switch_to.window(driver.window_handles[-1])

                    try:
                        driver.get(local_link)

                        github_last_push = "N/A"

                        # Busca por links do GitHub
                        try:
                            github_links = driver.find_elements(By.XPATH, "//a[contains(@href, 'github.com')]")

                            for link in github_links:
                                href = link.get_attribute("href")
                                if not href:
                                    continue

                                candidate_text = extract_github_url_from_text(href)
                                if candidate_text:
                                    github_last_push = get_github_last_push(candidate_text, session)
                                    if github_last_push != "N/A":
                                        break

                        except Exception as e:
                            print(f"Erro ao buscar GitHub em {base_data['title']}: {e}")

                        if UPDATE_ONLY_GITHUB:
                            update_github_only(conn, base_data["title"], github_last_push)
                            print(f"--- Atualizado GitHub: {base_data['title']} -> {github_last_push}")
                        else:
                            details_data = {campo: "N/A" for campo in CAMPOS_DETALHADOS}
                            details_data["total_text"] = "N/A"
                            details_data["media_links"] = "N/A"

                            try:
                                WebDriverWait(driver, 5).until(
                                    EC.presence_of_element_located((By.CSS_SELECTOR, "a.tags.has-addons.ghost"))
                                )
                                local_a_tags = driver.find_elements(By.CSS_SELECTOR, "a.tags.has-addons.ghost")

                                locais_textos = []
                                locais_links = []

                                for a_tag in local_a_tags:
                                    href = a_tag.get_attribute("href")
                                    if href:
                                        locais_links.append(href)
                                    try:
                                        span = a_tag.find_element(By.CSS_SELECTOR, "span.tag.is-white-bis")
                                        locais_textos.append(span.text.strip())
                                    except NoSuchElementException:
                                        pass

                                if locais_textos:
                                    base_data["local"] = ", ".join(locais_textos)
                                if locais_links:
                                    base_data["local_links"] = ", ".join(locais_links)
                            except TimeoutException:
                                pass

                            try:
                                main_content_div0 = driver.find_element(By.CSS_SELECTOR, "div.column.is-8.pt-0")
                                main_content_div = driver.find_element(By.CSS_SELECTOR, "div.column.is-8.pt-0 > div:last-child")

                                details_data["total_text"] = main_content_div.get_attribute("innerHTML")

                                media_urls = []
                                for img in main_content_div0.find_elements(By.TAG_NAME, "img"):
                                    src = img.get_attribute("src")
                                    if src: media_urls.append(src)

                                for video in main_content_div0.find_elements(By.TAG_NAME, "video"):
                                    src = video.get_attribute("src")
                                    if src:
                                        media_urls.append(src)
                                    else:
                                        for source in video.find_elements(By.TAG_NAME, "source"):
                                            src = source.get_attribute("src")
                                            if src: media_urls.append(src)

                                for iframe in main_content_div0.find_elements(By.TAG_NAME, "iframe"):
                                    src = iframe.get_attribute("src")
                                    if src: media_urls.append(src)

                                if media_urls:
                                    details_data["media_links"] = ", ".join(media_urls)
                            except NoSuchElementException:
                                pass

                            sections = driver.find_elements(By.CSS_SELECTOR, "div.is-flex.is-align-items-flex-start")
                            for section in sections:
                                try:
                                    raw_label = section.find_element(By.CSS_SELECTOR, "p.is-bold").text.strip()
                                    clean_label = raw_label.replace(":", "").strip()
                                except NoSuchElementException:
                                    continue

                                try:
                                    items = section.find_elements(By.CSS_SELECTOR, "ul li a")
                                    if items:
                                        values = ", ".join([i.text.strip() for i in items])
                                    else:
                                        items = section.find_elements(By.CSS_SELECTOR, "ul li")
                                        values = ", ".join([i.text.strip() for i in items])
                                except NoSuchElementException:
                                    values = "N/A"

                                if clean_label in details_data and values:
                                    details_data[clean_label] = values

                            insert_metric(conn, base_data, details_data)

                        if not UPDATE_ONLY_GITHUB:
                            print(f"--- Métrica {index + 1} da página {current_page} processada ---")

                    except Exception as e:
                        print(f"Erro ao processar página detalhada: {e}")
                    finally:
                        driver.close()
                        driver.switch_to.window(main_window)

            try:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)

                next_page_number = current_page + 1
                next_page_xpath = f"//a[contains(@class, 'pagination-link') and text()='{next_page_number}']"
                next_page_button = driver.find_element(By.XPATH, next_page_xpath)

                print(f"Navegando para a página {next_page_number}...")
                driver.execute_script("arguments[0].click();", next_page_button)

                wait.until(
                    EC.presence_of_element_located(
                        (By.XPATH, f"//a[contains(@class, 'pagination-link') and contains(@class, 'is-current') and text()='{next_page_number}']")
                    )
                )

                time.sleep(2)
                current_page += 1

            except NoSuchElementException:
                print("Não há mais páginas. Raspagem finalizada!")
                break

        conn.close()

    except Exception as e:
        print(f"Ocorreu um erro crítico durante a raspagem: {e}")
    finally:
        driver.quit()


if __name__ == "__main__":
    run_scraper()