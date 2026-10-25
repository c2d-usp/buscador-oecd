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

# Lista com todos os campos desejados para facilitar o mapeamento
CAMPOS_DETALHADOS = [
    "Country/Territory of origin", "Developing organisation(s)", "Tool type(s)", "Objective(s)", "Purpose(s)", 
    "Type of approach", "Usage rights", "Stakeholder group", "Geographical scope", 
    "Technology platforms", "Tags", "Maturity", "Target groups", "Target users", 
    "Benefits", "People involved", "Programming languages", "Target sector(s)", 
    "Lifecycle stage(s)"
]

def get_github_last_push(url):
    """
    Extrai o dono e o repositório da URL e consulta a API do Github
    para pegar a data do último push.
    """
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
    # Permite acessar as colunas do banco de dados como um dicionário
    conn.row_factory = sqlite3.Row 
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            about TEXT,
            local TEXT,
            local_links TEXT,
            country TEXT,
            scope TEXT,
            github_last_push TEXT,
            type TEXT,
            date TEXT,
            total_text TEXT,
            media_links TEXT,
            developing_organisations TEXT,
            tool_types TEXT,
            objectives TEXT,
            purposes TEXT,
            type_of_approach TEXT,
            usage_rights TEXT,
            stakeholder_group TEXT,
            geographical_scope TEXT,
            technology_platforms TEXT,
            tags TEXT,
            maturity TEXT,
            target_groups TEXT,
            target_users TEXT,
            benefits TEXT,
            people_involved TEXT,
            programming_languages TEXT,
            target_sectors TEXT,
            lifecycle_stages TEXT
        )
    ''')
    conn.commit()
    return conn

def save_or_update_tool(conn, base_data, details_data):
    cursor = conn.cursor()
    title = base_data['title']
    
    # Dicionário mapeando os valores recém-raspados
    scraped_values = {
        'about': base_data['about'],
        'local': base_data['local'],
        'local_links': base_data['local_links'],
        'country': details_data['Country/Territory of origin'],
        'scope': details_data['Geographical scope'],
        'github_last_push': base_data['github_last_push'],
        'type': base_data['type'],
        'date': base_data['date'],
        'total_text': details_data['total_text'],
        'media_links': details_data['media_links'],
        'developing_organisations': details_data['Developing organisation(s)'],
        'tool_types': details_data['Tool type(s)'],
        'objectives': details_data['Objective(s)'],
        'purposes': details_data['Purpose(s)'],
        'type_of_approach': details_data['Type of approach'],
        'usage_rights': details_data['Usage rights'],
        'stakeholder_group': details_data['Stakeholder group'],
        'geographical_scope': details_data['Geographical scope'],
        'technology_platforms': details_data['Technology platforms'],
        'tags': details_data['Tags'],
        'maturity': details_data['Maturity'],
        'target_groups': details_data['Target groups'],
        'target_users': details_data['Target users'],
        'benefits': details_data['Benefits'],
        'people_involved': details_data['People involved'],
        'programming_languages': details_data['Programming languages'],
        'target_sectors': details_data['Target sector(s)'],
        'lifecycle_stages': details_data['Lifecycle stage(s)']
    }

    # Verifica se a ferramenta já existe no banco de dados usando o título
    cursor.execute("SELECT * FROM tools WHERE title = ?", (title,))
    existing_row = cursor.fetchone()

    if existing_row:
        updates = []
        
        # Compara os dados do banco com os recém-raspados
        for key, new_val in scraped_values.items():
            # Pula a verificação de atualização para o github_last_push (conforme solicitado)
            if key == 'github_last_push':
                continue
                
            old_val = existing_row[key]
            # Trata Nones que podem vir do banco
            old_val_str = old_val if old_val is not None else "N/A"
            new_val_str = new_val if new_val is not None else "N/A"

            if old_val_str != new_val_str:
                updates.append(key)
                
                # Trunca o texto se for muito longo para não poluir o terminal
                display_old = (old_val_str[:60] + "...") if len(old_val_str) > 60 else old_val_str
                display_new = (new_val_str[:60] + "...") if len(new_val_str) > 60 else new_val_str
                
                print(f"  [ATUALIZAÇÃO] O campo '{key}' foi atualizado.")
                print(f"    -> DE:   {display_old}")
                print(f"    -> PARA: {display_new}")

        if updates:
            # Se houveram mudanças, faz o update da linha inteira
            update_query = "UPDATE tools SET " + ", ".join([f"{k} = ?" for k in scraped_values.keys()]) + " WHERE title = ?"
            update_values = list(scraped_values.values()) + [title]
            cursor.execute(update_query, update_values)
            conn.commit()
            print(f"  [SALVO] Registro atualizado no banco de dados.")
        else:
            # Se a única coisa que mudou foi o github_last_push, atualiza silenciosamente
            if existing_row['github_last_push'] != scraped_values['github_last_push']:
                cursor.execute("UPDATE tools SET github_last_push = ? WHERE title = ?", (scraped_values['github_last_push'], title))
                conn.commit()
            print(f"  [OK] Nenhuma nova alteração detectada.")
    else:
        # Se não existir, faz um INSERT normal
        print(f"  [NOVA FERRAMENTA] Inserindo no banco de dados...")
        columns = ['title'] + list(scraped_values.keys())
        placeholders = ", ".join(["?"] * len(columns))
        insert_query = f"INSERT INTO tools ({', '.join(columns)}) VALUES ({placeholders})"
        
        insert_values = [title] + list(scraped_values.values())
        cursor.execute(insert_query, insert_values)
        conn.commit()

def run_scraper():
    chrome_options = Options()
    # chrome_options.add_argument("--headless")
    driver = webdriver.Chrome(options=chrome_options)
    url = "https://oecd.ai/en/catalogue/tools"
    
    try:
        print(f"Acessando: {url}")
        driver.get(url)
        wait = WebDriverWait(driver, 15)
        conn = setup_database()
        
        main_window = driver.current_window_handle
        current_page = 1
        
        while True:
            cards = wait.until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "app-tool-card"))
            )
            print(f"\n=== Extraindo Página {current_page} ===")
            print(f"Encontrados {len(cards)} cards na página atual.")
            
            page_tools = []
            for card in cards:
                base_data = {
                    "title": "N/A", "about": "N/A", "local": "N/A", 
                    "local_links": "N/A", "github_last_push": "N/A", 
                    "type": "N/A", "date": "N/A"
                }
                local_link = None
                
                try:
                    title_elem = card.find_element(By.CSS_SELECTOR, "h2.title a")
                    base_data['title'] = title_elem.text.strip()
                    local_link = title_elem.get_attribute("href")
                except NoSuchElementException:
                    pass

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

            for index, (base_data, local_link) in enumerate(page_tools):
                details_data = {campo: "N/A" for campo in CAMPOS_DETALHADOS}
                details_data['total_text'] = "N/A"
                details_data['media_links'] = "N/A"
                
                if local_link:
                    driver.execute_script("window.open('');")
                    driver.switch_to.window(driver.window_handles[-1])
                    
                    try:
                        driver.get(local_link)
                        
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
                                base_data['local'] = ", ".join(locais_textos)
                            if locais_links:
                                base_data['local_links'] = ", ".join(locais_links)
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
                                details_data['media_links'] = ", ".join(media_urls)
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

                    except Exception as e:
                        print(f"Erro ao processar página detalhada: {e}")
                    finally:
                        driver.close()
                        driver.switch_to.window(main_window)
                
                print(f"--- Processando Ferramenta {index + 1} da página {current_page} ---")
                print(f"Título: {base_data['title']}")
                # Aqui foi onde mudamos de insert_tool para save_or_update_tool
                save_or_update_tool(conn, base_data, details_data)
            
            try:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)
                
                next_page_number = current_page + 1
                next_page_xpath = f"//a[contains(@class, 'pagination-link') and text()='{next_page_number}']"
                next_page_button = driver.find_element(By.XPATH, next_page_xpath)
                
                print(f"Navegando para a página {next_page_number}...")
                
                driver.execute_script("arguments[0].click();", next_page_button)
                
                wait.until(
                    EC.presence_of_element_located((By.XPATH, f"//a[contains(@class, 'pagination-link') and contains(@class, 'is-current') and text()='{next_page_number}']"))
                )
                
                time.sleep(2)
                current_page += 1
                
            except NoSuchElementException:
                print("Não há mais páginas. Raspagem finalizada com sucesso!")
                break
                
        conn.close()
        
    except Exception as e:
        print(f"Ocorreu um erro crítico durante a raspagem: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    run_scraper()