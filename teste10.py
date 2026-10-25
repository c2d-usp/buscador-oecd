import sqlite3
import re

def buscar_perfis_github(caminho_banco, nome_tabela):
    padrao_github_perfil = re.compile(r'^(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9_-]+/?$')

    try:
        conn = sqlite3.connect(caminho_banco)
        cursor = conn.cursor()
        query = f"SELECT title, local_links FROM {nome_tabela} WHERE local_links IS NOT NULL"
        cursor.execute(query)
        ferramentas_encontradas = []
        for row in cursor.fetchall():
            title = row[0]
            local_links = row[1]
            links = [link.strip() for link in local_links.split(',')]
            for link in links:
                if padrao_github_perfil.match(link):
                    ferramentas_encontradas.append(title)
                    break 
        print(f"Foram encontradas {len(ferramentas_encontradas)} ferramentas com link de perfil no GitHub:\n")
        for ferramenta in ferramentas_encontradas:
            print(f"- {ferramenta}")
    except sqlite3.Error as e:
        print(f"Erro ao conectar ou ler o banco de dados: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

MEU_BANCO = 'oecd_tools.db' 
MINHA_TABELA = 'tools'

buscar_perfis_github(MEU_BANCO, MINHA_TABELA)