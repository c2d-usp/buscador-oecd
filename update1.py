import sqlite3
import re
import requests
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException

CAMPOS_DETALHADOS = [
    "Developing organisation(s)", "Tool type(s)", "Objective(s)", "Purpose(s)", 
    "Type of approach", "Usage rights", "Stakeholder group", "Geographical scope", 
    "Technology platforms", "Tags", "Maturity", "Target groups", "Target users", 
    "Benefits", "People involved", "Programming languages", "Target sector(s)", 
    "Lifecycle stage(s)"
]

PARAR_QUANDO_TUDO_EXISTIR = True

def get_github_last_push(url):
    match = re.search(r'github\.com/([^/]+)/([^/#?]+)', url)
    if match:
        owner = match.group(1)
        repo = match.group(2).replace('.git', '')
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        
        try:
            headers = {'Accept': 'application/vnd.github.v3+json'}
            response = requests.get(api_url, headers=headers, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                pushed_at = data.get('pushed_at')
                if pushed_at:
                    return pushed_at.split('T')[0]
        except Exception as e:
            print(f"Erro ao consultar API do Github para {url}: {e}")
            
    return "N/A"

def setup_database():
    conn = sqlite3.connect('oecd_tools.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT, about TEXT, local TEXT, local_links TEXT, github_last_push TEXT, 
            type TEXT, date TEXT, total_text TEXT, media_links TEXT,
            developing_organisations TEXT, tool_types TEXT, objectives TEXT, purposes TEXT, 
            type_of_approach TEXT, usage_rights TEXT, stakeholder_group TEXT, geographical_scope TEXT, 
            technology_platforms TEXT, tags TEXT, maturity TEXT, target_groups TEXT, target_users TEXT, 
            benefits TEXT, people_involved TEXT, programming_languages TEXT, target_sectors TEXT, 
            lifecycle_stages TEXT
        )
    ''')
    conn.commit()
    return conn

def get_existing_titles(conn):
    """Retorna um set com todos os títulos (em minúsculas) já salvos no banco para busca O(1)"""
    cursor = conn.cursor()
    cursor.execute('SELECT title FROM tools WHERE title IS NOT NULL')
    return {row[0].strip().lower() for row in cursor.fetchall()}

def insert_tool(conn, base_data, details_data):
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tools (
            title, about, local, local_links, github_last_push, type, date, total_text, media_links,
            developing_organisations, tool_types, objectives, purposes, 
            type_of_approach, usage_rights, stakeholder_group, geographical_scope, 
            technology_platforms, tags, maturity, target_groups, target_users, 
            benefits, people_involved, programming_languages, target_sectors, 
            lifecycle_stages
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        base_data['title'], base_data['about'], base_data['local'], base_data['local_links'],
        base_data['github_last_push'], base_data['type'], base_data['date'],
        details_data['total_text'], details_data['media_links'],
        details_data['Developing organisation(s)'], details_data['Tool type(s)'], 
        details_data['Objective(s)'], details_data['Purpose(s)'], 
        details_data['Type of approach'], details_data['Usage rights'], 
        details_data['Stakeholder group'], details_data['Geographical scope'], 
        details_data['Technology platforms'], details_data['Tags'], 
        details_data['Maturity'], details_data['Target groups'], 
        details_data['Target users'], details_data['Benefits'], 
        details_data['People involved'], details_data['Programming languages'], 
        details_data['Target sector(s)'], details_data['Lifecycle stage(s)']
    ))
    conn.commit()

def run_scraper():
    chrome_options = Options()
    chrome_options.add_argument("--headless=new") # Roda invisível e muito mais rápido
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    # Imagens não estão sendo bloqueadas conforme solicitado
    
    driver = webdriver.Chrome(options=chrome_options)
    url = "https://oecd.ai/en/catalogue/tools"
    
    try:
        conn = setup_database()
        existing_titles = get_existing_titles(conn)
        print(f"Banco de dados carregado. {len(existing_titles)} ferramentas já existentes.")

        print(f"Acessando: {url}")
        driver.get(url)
        wait = WebDriverWait(driver, 15)
        
        main_window = driver.current_window_handle
        
        # Abre UMA aba secundária para reutilizar em todos os itens (evita overhead de abrir/fechar abas)
        driver.execute_script("window.open('');")
        detail_window = driver.window_handles[-1]
        driver.switch_to.window(main_window)
        
        current_page = 1
        
        while True:
            cards = wait.until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "app-tool-card"))
            )
            print(f"\n=== Analisando Página {current_page} ===")
            
            page_tools = []
            novas_na_pagina = 0

            for card in cards:
                title = "N/A"
                local_link = None
                
                try:
                    title_elem = card.find_element(By.CSS_SELECTOR, "h2.title a")
                    title = title_elem.text.strip()
                    local_link = title_elem.get_attribute("href")
                except NoSuchElementException:
                    continue 
                
                if title.lower() in existing_titles:
                    continue 

                novas_na_pagina += 1
                base_data = {
                    "title": title, "about": "N/A", "local": "N/A", 
                    "local_links": "N/A", "github_last_push": "N/A", 
                    "type": "N/A", "date": "N/A"
                }

                try:
                    about_elem = card.find_element(By.CSS_SELECTOR, "div.my-5")
                    base_data['about'] = about_elem.text.strip()
                except NoSuchElementException:
                    pass
                
                try:
                    type_elem = card.find_element(By.XPATH, ".//span[contains(@class, 'country')] | .//div[contains(@class, 'location')]")
                    base_data['type'] = type_elem.text.strip()
                except NoSuchElementException:
                    pass
                    
                try:
                    date_elem = card.find_element(By.CSS_SELECTOR, "span.my-0.country-label.sans.content.is-small")
                    raw_date = date_elem.text.strip().replace("Uploaded on", "").strip()
                    try:
                        date_obj = datetime.strptime(raw_date, "%b %d, %Y")
                        base_data['date'] = date_obj.strftime("%Y-%m-%d")
                    except ValueError:
                        base_data['date'] = raw_date
                except NoSuchElementException:
                    pass
                
                page_tools.append((base_data, local_link))

            print(f"Encontradas {novas_na_pagina} novas ferramentas nesta página.")

            if novas_na_pagina == 0 and PARAR_QUANDO_TUDO_EXISTIR:
                print("Todas as ferramentas desta página já estão no banco. Finalizando atualização!")
                break

            for index, (base_data, local_link) in enumerate(page_tools):
                details_data = {campo: "N/A" for campo in CAMPOS_DETALHADOS}
                details_data['total_text'] = "N/A"
                details_data['media_links'] = "N/A"
                
                if local_link:
                    # Muda para a aba de detalhes já existente
                    driver.switch_to.window(detail_window)
                    
                    try:
                        driver.get(local_link)
                        
                        try:
                            WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.CSS_SELECTOR, "a.tags.has-addons.ghost")))
                            local_a_tags = driver.find_elements(By.CSS_SELECTOR, "a.tags.has-addons.ghost")
                            
                            locais_textos, locais_links = [], []
                            for a_tag in local_a_tags:
                                href = a_tag.get_attribute("href")
                                if href: locais_links.append(href)
                                try:
                                    span = a_tag.find_element(By.CSS_SELECTOR, "span.tag.is-white-bis")
                                    locais_textos.append(span.text.strip())
                                except NoSuchElementException:
                                    pass
                                    
                            if locais_textos: base_data['local'] = ", ".join(locais_textos)
                            if locais_links: base_data['local_links'] = ", ".join(locais_links)
                        except TimeoutException:
                            pass
                        
                        try:
                            github_links = driver.find_elements(By.XPATH, "//a[contains(@href, 'github.com')]")
                            for link in github_links:
                                href = link.get_attribute("href")
                                if href:
                                    push_date = get_github_last_push(href)
                                    if push_date != "N/A":
                                        base_data['github_last_push'] = push_date
                                        break 
                        except NoSuchElementException:
                            pass
                            
                        try:
                            main_content_div0 = driver.find_element(By.CSS_SELECTOR, "div.column.is-8.pt-0")
                            main_content_div = driver.find_element(By.CSS_SELECTOR, "div.column.is-8.pt-0 > div:last-child")
                            details_data['total_text'] = main_content_div.get_attribute("innerHTML")
                            
                            media_urls = []
                            for tag in ["img", "video", "iframe"]:
                                for elem in main_content_div0.find_elements(By.TAG_NAME, tag):
                                    src = elem.get_attribute("src")
                                    if src: media_urls.append(src)
                                    elif tag == "video":
                                        for source in elem.find_elements(By.TAG_NAME, "source"):
                                            src = source.get_attribute("src")
                                            if src: media_urls.append(src)
                            
                            if media_urls: details_data['media_links'] = ", ".join(media_urls)
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
                                if not items: items = section.find_elements(By.CSS_SELECTOR, "ul li")
                                values = ", ".join([i.text.strip() for i in items]) if items else "N/A"
                            except NoSuchElementException:
                                values = "N/A"
                            
                            if clean_label in details_data and values:
                                details_data[clean_label] = values

                    except Exception as e:
                        print(f"Erro ao processar página detalhada: {e}")
                    finally:
                        # Retorna sempre à aba principal, mas sem fechar a aba secundária
                        driver.switch_to.window(main_window)
                
                print(f"+++ NOVA Ferramenta {index + 1} Salva: {base_data['title']}")
                insert_tool(conn, base_data, details_data)
                
                existing_titles.add(base_data['title'].lower())
            
            try:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)
                
                next_page_number = current_page + 1
                next_page_xpath = f"//a[contains(@class, 'pagination-link') and text()='{next_page_number}']"
                next_page_button = driver.find_element(By.XPATH, next_page_xpath)
                
                print(f"Navegando para a página {next_page_number}...")
                driver.execute_script("arguments[0].click();", next_page_button)
                
                wait.until(EC.presence_of_element_located((By.XPATH, f"//a[contains(@class, 'pagination-link') and contains(@class, 'is-current') and text()='{next_page_number}']")))
                time.sleep(2)
                current_page += 1
                
            except NoSuchElementException:
                print("Não há mais páginas. Atualização finalizada com sucesso!")
                break
                
        conn.close()
        
    except Exception as e:
        print(f"Ocorreu um erro crítico durante a raspagem: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    run_scraper()