# Especificação - Document Management System

## 1. Objetivo

Oferecer uma aplicação web para que usuários identifiquem seu espaço de trabalho e enviem, listem e baixem documentos armazenados no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição `multipart/form-data`.
- Listagem dos documentos associados ao identificador de usuário informado.
- Download de um documento pelo identificador, somente no escopo do usuário informado.
- Interface web para identificar o usuário, enviar documentos, atualizar a lista e baixar arquivos.
- Armazenamento dos arquivos em `backend/storage` por padrão e armazenamento dos metadados em memória.
- Configuração do backend por variáveis de ambiente.

### Fora do escopo

- Armazenamento externo, em nuvem ou em banco de dados.
- Persistência durável dos metadados; eles são perdidos ao reiniciar o processo.
- Autenticação, autorização baseada em credenciais, cadastro de usuários ou recuperação de senha.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Preview, conversão, antivírus ou classificação do conteúdo dos arquivos.
- Garantia de disponibilidade de arquivos cujo processo reiniciou e perdeu os metadados associados.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode informar um identificador para selecionar seu espaço de trabalho. |
| RF-02 | O usuário pode enviar um arquivo pelo campo multipart `file`; o backend grava o conteúdo em disco local e retorna seus metadados. |
| RF-03 | O sistema atribui um identificador único ao documento e registra nome original, tamanho em bytes, data/hora UTC e dono. |
| RF-04 | O usuário pode listar somente os documentos associados ao identificador informado. A lista é ordenada do mais recente para o mais antigo. |
| RF-05 | O usuário pode baixar um documento pelo identificador quando ele pertence ao seu espaço de trabalho. |
| RF-06 | Documento inexistente ou pertencente a outro usuário deve resultar em `404`, sem revelar a existência do documento. |
| RF-07 | A interface apresenta estados de carregamento, lista vazia, sucesso e erro para as operações disponíveis. |
| RF-08 | A interface permite atualizar a listagem e inicia o download usando o nome original do arquivo. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend usa Node.js, Express e CommonJS; o frontend usa React, Vite e ES modules. |
| RNF-02 | Arquivos são gravados exclusivamente no filesystem local por `multer` configurado com `diskStorage`; o diretório padrão é `backend/storage`. |
| RNF-03 | Os metadados são mantidos em memória pelo processo; não há banco de dados nesta fase. |
| RNF-04 | O nome físico do arquivo é gerado pelo servidor e não deriva do nome informado pelo cliente. |
| RNF-05 | O tamanho máximo padrão por arquivo é 10 MiB; a configuração pode ser alterada por variável de ambiente. |
| RNF-06 | A configuração de porta, diretório de armazenamento e limite de upload deve ser externa ao código via variáveis de ambiente, preservando o padrão 12-Factor. |
| RNF-07 | As camadas internas não dependem do Express: o fluxo de dependência é `routes -> controllers -> services -> repositories`. |
| RNF-08 | Erros de entrada têm resposta JSON previsível; erros internos não expõem stack trace ao cliente. |
| RNF-09 | A interface acessa o backend via `fetch` no prefixo `/api`; o proxy de desenvolvimento do Vite remove esse prefixo e encaminha para o backend local. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string (UUID) | Identificador público único do documento. |
| `originalName` | string | Nome original recebido no upload; usado na listagem e no nome do download. |
| `size` | number | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string (ISO 8601) | Data/hora UTC do registro do upload. |
| `owner` | string | Identificador informado em `X-User-Id`, com espaços externos removidos. |

O repositório mantém, além dos metadados públicos, o nome físico aleatório gerado para o arquivo. Esse valor é interno e não deve ser incluído nas respostas da API. Os metadados públicos não incluem caminhos do filesystem.

## 6. Contratos de API

### Convenções

- O backend expõe os caminhos abaixo sem prefixo. O frontend os consome por `/api` através do proxy Vite.
- Todas as operações de documentos exigem `X-User-Id`, com valor não vazio e até 100 caracteres. O cabeçalho é um identificador de escopo, **não é autenticação** e não deve ser usado como controle de acesso em uma implantação exposta a usuários não confiáveis.
- Respostas de erro seguem o formato `{ "error": { "code": "...", "message": "..." } }`.
- Limite padrão de upload: 10 MiB, configurável em `MAX_FILE_SIZE`.

### `POST /upload`

- Entrada: `multipart/form-data`, com um arquivo no campo `file`; cabeçalho `X-User-Id` obrigatório.
- Sucesso: `201 Created`; corpo é o objeto de metadados do documento.
- Erros: `400 FILE_REQUIRED` se não houver arquivo; `400 INVALID_USER` se o cabeçalho estiver ausente ou inválido; `400` para multipart inválido; `413 LIMIT_FILE_SIZE` se exceder o limite.

Exemplo de sucesso:

```json
{
	"id": "uuid",
	"originalName": "relatorio.pdf",
	"size": 24576,
	"uploadedAt": "2026-10-26T12:00:00.000Z",
	"owner": "usuario-1"
}
```

### `GET /documents`

- Entrada: cabeçalho `X-User-Id` obrigatório.
- Sucesso: `200 OK`; corpo é um array de metadados pertencentes ao usuário, mais recentes primeiro. Sem documentos, retorna `[]`.
- Erros: `400 INVALID_USER` se o cabeçalho estiver ausente ou inválido.

### `GET /documents/:id/download`

- Entrada: identificador no caminho e cabeçalho `X-User-Id` obrigatório.
- Sucesso: `200 OK`; corpo binário do arquivo, com `Content-Disposition` usando o nome original.
- Erros: `400 INVALID_USER`; `404 DOCUMENT_NOT_FOUND` se o documento não existir ou não pertencer ao usuário; `404 FILE_NOT_FOUND` se o arquivo tiver sido removido do filesystem.

### `GET /health`

- Sucesso: `200 OK` com `{ "status": "ok" }`. Endpoint simples de verificação do processo.

## 7. Decisões arquiteturais

- Backend organizado em `routes/`, `controllers/`, `services/` e `repositories/`.
- A rota configura Multer com `diskStorage`, campo `file`, nome físico aleatório e limite de tamanho.
- O controller valida a entrada HTTP, aplica o escopo pelo cabeçalho de usuário e formata respostas.
- O service cria identificadores e datas, aplica as regras de propriedade e remove campos internos do retorno público.
- O repository mantém metadados em memória. O filesystem local contém os bytes dos arquivos.
- O diretório padrão de armazenamento é `backend/storage`; `STORAGE_DIR` pode substituí-lo. O diretório é criado quando necessário.
- `PORT` configura a porta do Express (padrão `3000`); `MAX_FILE_SIZE` configura o limite de bytes por upload (padrão `10485760`).
- A interface React usa componentes para upload, listagem e download; o serviço frontend centraliza chamadas `fetch`.
- O identificador de usuário salvo no navegador facilita a seleção do espaço, mas não representa uma identidade verificada. Autenticação real exigirá evolução fora deste escopo.
- Como metadados não persistem, após reinício a aplicação pode manter arquivos órfãos no disco; limpeza automática não faz parte desta versão.

## 8. Plano de execução

1. Definir os contratos de API, regras de validação, escopo de usuário e casos de teste backend.
2. Implementar o repository em memória e o service com criação, listagem e resolução de downloads.
3. Implementar controllers e rotas Express, configurando Multer `diskStorage`, nomes físicos aleatórios, limite de tamanho e respostas de erro.
4. Validar os endpoints com testes de integração: upload local, metadados, listagem por usuário, download, isolamento entre usuários e entradas inválidas.
5. Implementar o serviço frontend com `fetch` via `/api` e cabeçalho `X-User-Id`.
6. Implementar a interface React para seleção do usuário, upload, listagem, atualização, estados vazios/erro/sucesso e download.
7. Validar o build do frontend e executar a suíte completa backend; testar manualmente o fluxo integrado com backend e Vite.
