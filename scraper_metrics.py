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

# Lista reduzida sem as colunas que foram solicitadas para remoção
CAMPOS_DETALHADOS = [
    "Metric type(s)", "Objective(s)", "Purpose(s)", 
    "Usage rights", "Target users", "Target sector(s)", 
    "Lifecycle stage(s)", "Risk management stage(s)", "Risk management stage"
]


def absolutize_hrefs(html_text, base_url="https://oecd.ai"):
    """
    Transforma todos os href relativos (que começam com '/') em URLs absolutas,
    usando base_url como domínio base.
    Exemplo: href="/en/catalogue" -> href="https://oecd.ai/en/catalogue"
    """
    # Padrão para capturar href="..."/href='...' onde o valor começa com '/'
    pattern = r'''href=(["'])(/[^"']*?)\1'''
    return re.sub(
        pattern,
        lambda m: f'href={m.group(1)}{base_url}{m.group(2)}{m.group(1)}',
        html_text
    )


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
    conn = sqlite3.connect('oecd_metrics.db')
    cursor = conn.cursor()
    
    # Tabela atualizada sem as colunas removidas
    cursor.execute('''
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
    ''')
    conn.commit()
    return conn


def insert_metric(conn, base_data, details_data):
    cursor = conn.cursor()
    
    # Resolvendo variação de plural do campo Risk management stage
    risk_stage = details_data.get('Risk management stage(s)')
    if risk_stage == "N/A" or not risk_stage:
        risk_stage = details_data.get('Risk management stage', 'N/A')
        
    cursor.execute('''
        INSERT INTO metrics (
            title, about, local, local_links, github_last_push, relevance, total_text, media_links,
            metric_types, objectives, purposes, usage_rights, target_users, 
            target_sectors, lifecycle_stages, risk_management_stage
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
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
    # chrome_options.add_argument("--headless") # Descomente se não quiser ver a janela do Chrome
    driver = webdriver.Chrome(options=chrome_options)
    url = "https://oecd.ai/en/catalogue/metrics"
    
    try:
        print(f"Acessando: {url}")
        driver.get(url)
        wait = WebDriverWait(driver, 15)
        conn = setup_database()
        
        main_window = driver.current_window_handle
        current_page = 1
        
        # Loop principal da paginação
        while True:
            # Espera os cards carregarem
            cards = wait.until(
                EC.presence_of_all_elements_located((By.CSS_SELECTOR, "app-metric-card"))
            )
            print(f"\n=== Extraindo Página {current_page} ===")
            print(f"Encontrados {len(cards)} cards na página atual.")
            
            # 1. Coletar dados básicos e links da página atual PRIMEIRO
            # Isso evita o erro StaleElementReference caso o DOM atualize
            page_metrics = []
            for card in cards:
                # Dicionário base ajustado (removido type e date)
                base_data = {
                    "title": "N/A", "about": "N/A", "local": "N/A", 
                    "local_links": "N/A", "github_last_push": "N/A", 
                    "relevance": "N/A"
                }
                local_link = None
                
                # Title
                try:
                    title_elem = card.find_element(By.CSS_SELECTOR, "h2.title a")
                    base_data['title'] = title_elem.text.strip()
                    local_link = title_elem.get_attribute("href")
                except NoSuchElementException:
                    pass
                
                # Relevance (O número que fica no card inicial)
                try:
                    relevance_elem = card.find_element(By.XPATH, ".//h2[contains(@class, 'title')]//span[contains(@class, 'tag')]")
                    rel_text = relevance_elem.text.strip()
                    # Extrair apenas os números
                    numeros = re.findall(r'\d+', rel_text)
                    if numeros:
                        base_data['relevance'] = numeros[0]
                    else:
                        base_data['relevance'] = rel_text
                except NoSuchElementException:
                    pass

                # Se a relevância ainda for "N/A", substitui por "0"
                if base_data['relevance'] == "N/A":
                    base_data['relevance'] = "0"

                # About - Corrigido com base na imagem do HTML
                try:
                    # Encontra o parágrafo dentro da div que vem imediatamente após o h2 do título
                    about_elem = card.find_element(By.XPATH, ".//h2[contains(@class, 'title')]/following-sibling::div//p")
                    base_data['about'] = about_elem.text.strip()
                except NoSuchElementException:
                    pass
                
                page_metrics.append((base_data, local_link))

            # 2. Visitar os links detalhados usando uma NOVA ABA
            for index, (base_data, local_link) in enumerate(page_metrics):
                details_data = {campo: "N/A" for campo in CAMPOS_DETALHADOS}
                details_data['total_text'] = "N/A"
                details_data['media_links'] = "N/A"
                
                if local_link:
                    # Abre uma nova aba e muda o foco para ela
                    driver.execute_script("window.open('');")
                    driver.switch_to.window(driver.window_handles[-1])
                    
                    try:
                        driver.get(local_link)
                        
                        # -- Início da extração de detalhes --
                        # 1. Extração do Local e seus Links
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
                        
                        # 1.5 Extração de link do Github
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
                            
                        # 1.8 Extração do Texto Total e Imagens/Vídeos
                        try:
                            main_content_div0 = driver.find_element(By.CSS_SELECTOR, "div.column.is-8.pt-0")
                            
                            # pega apenas as divs full-width e py-5 dentro da coluna
                            total_text_parts = []
                            full_width_divs = main_content_div0.find_elements(By.CSS_SELECTOR, ".full-width")
                            for fw in full_width_divs:
                                total_text_parts.append(fw.get_attribute("innerHTML"))
                            py5_divs = main_content_div0.find_elements(By.CSS_SELECTOR, ".py-5")
                            for py5 in py5_divs:
                                total_text_parts.append(py5.get_attribute("innerHTML"))
                            
                            if total_text_parts:
                                raw_html = " ".join(total_text_parts)
                                # Substitui todos os href relativos por absolutos, usando https://oecd.ai como base
                                details_data['total_text'] = absolutize_hrefs(raw_html)
                            else:
                                details_data['total_text'] = "N/A"
                            
                            # Extração de mídia (imagens, vídeos, iframes) mantida na coluna inteira
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
                        
                        # 2. Extração Separada (Sidebar de detalhes)
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
                        # -- Fim da extração de detalhes --

                    except Exception as e:
                        print(f"Erro ao processar página detalhada: {e}")
                    finally:
                        # Fecha a aba de detalhes e volta para a aba principal
                        driver.close()
                        driver.switch_to.window(main_window)
                
                print(f"--- Ferramenta {index + 1} da página {current_page} Salva ---")
                print(f"Título: {base_data['title']} | Relevância: {base_data['relevance']}")
                insert_metric(conn, base_data, details_data)
            
            # 3. Lógica para mudar para a próxima página
            try:
                # Rola para o final para garantir que o botão esteja visível
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1)
                
                next_page_number = current_page + 1
                # Procura a tag <a> com a classe 'pagination-link' e que tenha o texto da próxima página
                next_page_xpath = f"//a[contains(@class, 'pagination-link') and text()='{next_page_number}']"
                next_page_button = driver.find_element(By.XPATH, next_page_xpath)
                
                print(f"Navegando para a página {next_page_number}...")
                
                # Executa o click via Javascript para evitar interceptações de rodapé
                driver.execute_script("arguments[0].click();", next_page_button)
                
                # Espera o botão clicado ganhar a classe 'is-current' (confirmação que a pág mudou)
                wait.until(
                    EC.presence_of_element_located((By.XPATH, f"//a[contains(@class, 'pagination-link') and contains(@class, 'is-current') and text()='{next_page_number}']"))
                )
                
                time.sleep(2) # Pequena pausa para garantir a renderização dos novos cards
                current_page += 1
                
            except NoSuchElementException:
                # Se não encontrar o botão da próxima página, o loop encerra
                print("Não há mais páginas. Raspagem finalizada com sucesso!")
                break
                
        conn.close()
        
    except Exception as e:
        print(f"Ocorreu um erro crítico durante a raspagem: {e}")
    finally:
        driver.quit()


if __name__ == "__main__":
    run_scraper()