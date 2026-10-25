# WINDROSE

Plataforma web desenvolvida para organizar, buscar e visualizar ferramentas de Inteligência Artificial disponíveis no repositório da OECD.ai.

---

## 📌 Visão geral

Este projeto foi desenvolvido para criar uma plataforma web de busca para o repositório global da OECD.ai.

O site é dividido em três páginas principais, além de uma área exclusiva para o usuário:

*   **Página de Busca:** Contém o repositório da OECD.ai com ferramentas e métricas. Para alterar o buscador de ferramentas para métricas, basta clicar em "Ferramentas" (localizado no topo, em "Catálogo de Ferramentas"). A página permite salvar ferramentas e métricas em pastas (semelhante ao funcionamento do Pinterest). O botão de salvar fica no canto inferior direito de cada card. O usuário pode salvar itens individualmente ou de forma coletiva por filtro (basta selecionar um filtro e clicar em salvar em todas).
*   **Página de Comparação:** Permite que o usuário utilize as pastas criadas para atribuir notas e criar uma matriz com o ranking das ferramentas. O ranqueamento utiliza como base a metodologia do artigo intitulado *"Método para Avaliação Multicritério Contextualizada de Ferramentas de Inteligência Artificial"*.
*   **Página de Visualização:** Oferece a plotagem automática de diversos dashboards interativos para as pastas criadas pelo usuário, facilitando a análise visual dos dados.
*   **Área do Usuário:** Pode ser acessada clicando na foto de perfil no canto superior direito. Nela, o usuário pode visualizar suas pastas e seus resultados (como os resultados da metodologia de comparação ou análises de dados salvas usando o botão "Salvar Resumo").

A aplicação utiliza scraping para coletar dados, armazena em SQLite e disponibiliza via API Flask consumida por um frontend React.

---

## 🧱 Estrutura do projeto

```text
.
├── api.py
├── auth.py
├── database.py
├── metrics_database.py
├── update.py
└── frontend/
    └── src/
        ├── api.js
        ├── App.jsx
        ├── components/
        │   ├── MetricCard.jsx
        │   ├── MetricModal.jsx
        │   ├── Navbar.jsx
        │   ├── Pagination.jsx
        │   ├── SaveButton.jsx
        │   ├── Sidebar.jsx
        │   ├── ToolCard.jsx
        │   └── ToolModal.jsx
        ├── constants/
        │   └── sortOptions.js
        ├── context/
        │   └── AuthContext.jsx
        ├── hooks/
        │   ├── useMetrics.js
        │   ├── useMetricsFilters.js
        │   ├── useTools.js
        │   └── useToolsFilters.js
        ├── pages/
        │   ├── Busca.jsx
        │   ├── Comparacao.jsx
        │   ├── FolderView.jsx
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   ├── MyFolders.jsx
        │   ├── Profile.jsx
        │   ├── Signup.jsx
        │   └── Visualizacao.jsx
        └── utils/
            └── helpers.js
```

---

## 🛠️ Tecnologias utilizadas

### Backend
- Python
- Flask
- Flask-CORS
- Selenium
- Requests
- SQLite

### Frontend
- React
- Vite
- Tailwind CSS

### Infraestrutura
- Docker
- Docker Compose

---

## ⚙️ Configuração Inicial Obrigatória

Antes de subir a aplicação, é necessário criar um arquivo `.env` na **raiz do projeto**. 

1. A aplicação requer uma chave secreta, que é gerada pelo script `gerachave.py`.
2. Crie o arquivo `.env` contendo a chave gerada:
   ```env
   SECRET_KEY=chave
   ```

---

# 🚀 Executando a aplicação

Você pode rodar o projeto utilizando **Docker** ou **Localmente (sem Docker)**.

## Opção A: Com Docker

**Pré-requisitos:** Docker, Docker Compose e Git instalados.

1. **Clonar o projeto:**
   ```bash
   git clone https://github.com/c2d-usp/buscador-oecd.git
   cd buscador-oecd
   ```

2. **Subir a aplicação:**
   ```bash
   docker compose up -d --build
   ```
   *(Isso irá buildar as imagens, criar os containers e rodar tudo em background)*

3. **Acessar a aplicação:**
   Abra no navegador:
   ```text
   http://<ip>:8080
   ```
   *(Onde `<ip>` pode ser o IP do servidor que a pessoa usa ou `localhost` caso rode na própria máquina).*

4. **Verificar containers e logs:**
   ```bash
   docker ps
   docker compose logs -f
   ```

5. **Parar a aplicação:**
   ```bash
   docker compose down
   ```

---

## Opção B: Sem Docker (Localmente)

**Pré-requisitos:** Baixar e instalar o **Node.js** e o **Python**.

1. **Instalar dependências do Backend:**
   Na raiz do projeto, instale as bibliotecas necessárias:
   ```bash
   pip install -r requirements.txt
   ```

2. **Rodar o Backend:**
   Ainda na raiz do projeto, execute:
   ```bash
   python api.py
   ```

3. **Rodar o Frontend:**
   Abra um terminal e entre na pasta do frontend:
   ```bash
   cd frontend
   ```
   Se for a primeira vez executando, instale as dependências do Node:
   ```bash
   npm install
   ```
   Depois, inicie a aplicação web:
   ```bash
   npm run dev
   ```

---

## 🗄️ Atualizando o Banco de Dados

A atualização dos dados do repositório pode ser feita de duas formas: diretamente pelo site ou manualmente via terminal.

### Pelo Site (Interface Web)

1. Acesse a página principal de busca da aplicação.
2. Vá até a opção **"Atualizar Banco de Dados"**.
3. Será solicitado que você insira uma senha e um token do GitHub:
   - **Senha:** `1943`
   - **Token do GitHub:** (veja abaixo como gerar)
4. Ao inserir as informações, o banco será atualizado automaticamente.

#### 🔑 Como conseguir um token do GitHub (Mini-tutorial)
1. Acesse sua conta no [GitHub](https://github.com/).
2. No canto superior direito, clique na sua foto de perfil e vá em **Settings** (Configurações).
3. Na barra lateral esquerda, role até o final e clique em **Developer settings** (Configurações de desenvolvedor).
4. Clique em **Personal access tokens** e escolha **Tokens (classic)**.
5. Clique no botão **Generate new token (classic)**.
6. Adicione um nome para identificar o token (ex: `Atualizacao Banco OECD`) e marque as permissões necessárias (como `repo`, dependendo do que for requisitado).
7. Desça a página e clique em **Generate token**.
8. **Importante:** Copie o token gerado imediatamente, pois ele não será mostrado novamente. Use esse código no site.

### Manualmente (Terminal)

Caso prefira, você também pode atualizar os dados rodando o script de atualização na raiz do projeto:
```bash
python update.py
```

---

## 📁 Atualizar projeto

Se fizer alterações no código, atualize com:
```bash
git pull
docker compose up -d --build
```

---

## 🤝 Agradecimentos

Este trabalho foi realizado com o apoio do Itaú Unibanco S.A., por meio do Programa de Bolsas Itaú (PBI).

---

## 👤 Autor

Nicholas Kim  
Iniciação Científica — USP

---

## 👨‍🏫 Orientação

Prof. Enio Alterman Blay
