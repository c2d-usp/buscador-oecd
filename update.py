import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def main():
    if len(sys.argv) > 1:
        github_token = sys.argv[1].strip()
    else:
        github_token = input("Digite sua chave do GitHub: ").strip()
        
    os.environ["GITHUB_TOKEN"] = github_token

    import update1
    import update2
    import update3
    import update4

    inicio = time.time()
    print("Iniciando a atualização dos bancos de dados...", flush=True)

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(update1.run_scraper): "Scraper de Ferramentas (update1)",
            executor.submit(update2.update_github_dates): "Datas do GitHub Ferramentas (update2)",
            executor.submit(update3.run_scraper): "Scraper de Métricas (update3)",
            executor.submit(update4.update_github_dates): "Datas do GitHub Métricas (update4)",
        }

        for future in as_completed(futures):
            nome_rotina = futures[future]
            try:
                future.result()
                print(f"\n[SUCESSO] Concluído: {nome_rotina}", flush=True)
            except Exception as e:
                print(f"\n[ERRO] Falha na rotina {nome_rotina}: {str(e)}", flush=True)

    fim = time.time()
    print(f"\nTempo total de execução: {fim - inicio:.2f} segundos", flush=True)

if __name__ == "__main__":
    main()