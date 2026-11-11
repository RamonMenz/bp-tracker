# Artefatos do chat — TASK-07 Android

Arquivados em **11/11/2026 (UTC)**, por solicitação do autor.
[Registro completo](../../task-07-registro-validacao-android.md) e
[roteiro Windows](../../task-07-roteiro-windows-android.md).

Estes são artefatos de depuração/evidência. Arquivá-los não aplica correções ao
produto, integra staging ou conclui TASK-07. Não executar automaticamente os
patches; a cópia Windows do autor já possui a correção final.

## Inventário

| Artefato | Finalidade / relação de ordem |
|---|---|
| [Entrada diagnóstica inicial](aferi-task07-index-diagnostico.tsx.txt) | Arquivo entregue para substituir a entrada da demo na investigação da tela cinza; é anterior aos cabeçalhos captura-2–5 |
| [Tailwind da demo](aferi-task07-tailwind.config.js.txt) | Copiar para `demos/android-capture/tailwind.config.js` somente ao reconstruir a sequência histórica em base limpa |
| [Ciclo da captura](aferi-task07-ciclo-captura.patch) | Primeiro patch: sessão por efeito e barreira de liberação |
| [Diagnóstico captura-2](aferi-task07-diagnostico-captura-2.patch) | Segundo: eventos limitados em memória e painel |
| [Permissão captura-3](aferi-task07-permissao-camera.patch) | Terceiro: consultar permissão já concedida sem abrir diálogo |
| [Quadro captura-4/frame-1](aferi-task07-quadro-camera.patch) | Quarto: filtro de resolução, modo COMPATIBLE, metadados seguros; requer novo APK |
| [Preview captura-5/preview-1](aferi-task07-preview-camera.patch) | Quinto: layout Android e readiness por STREAMING; requer novo APK |
| [Consolidado](aferi-task07-consolidado.patch) | Alternativa única, reproduz todos os ajustes acima sobre a base imutável `d94e5f3c9fe0ad4e048542b47afdb822ff911153`; não aplicar depois dos incrementais |
| [Cartão sintético original](cartao-sintetico-sys120-dia80-pul72.png) | Imagem gerada para testar 120/80/72, sem dados reais e sem captura de usuário |
| [Terminal sanitizado](terminal-sanitizado.md) | Trechos selecionados das mensagens e do texto anexado; não é log integral |
| [Manifesto](manifesto.json) | Tamanho e SHA-256 dos artefatos; base e hashes dos 15 arquivos finais reconstruídos |

## Verificação do arquivamento

A sequência histórica foi reaplicada em cópia temporária de 11 arquivos
consultados no commit base: primeiro a entrada diagnóstica/config Tailwind, depois
os cinco patches na ordem da tabela. As 15 fontes resultantes corresponderam ao
estado final preparado para o teste `preview-1`.

Os patches preservam o formato de unified diff: linhas de contexto vazias têm
um espaço de prefixo obrigatório. `git diff --check` ao adicionar um patch como
texto pode sinalizar esse espaço; não o remover nem alterar hashes históricos.
Conferir whitespace dos documentos separadamente e validar os patches por replay.

O consolidado foi gerado dessa diferença e verificado em cópias LF e CRLF:
`git apply --check`, aplicação, igualdade do conteúdo final e check de reversão.
Isso verifica a preservação/aplicabilidade do artefato, não a compilação Android
ou o estado exato do computador do autor. O manifesto permite comparar o conteúdo
esperado; não substitui hash do APK, Git/diff ou confirmação da instalação.
Os hashes das fontes reconstruídas usam UTF-8 com LF; arquivos Windows com CRLF
precisam dessa normalização antes de comparar. Os hashes dos artefatos arquivados
referem-se aos bytes exatos, sem normalização.

Os dois arquivos de código avulsos recebem sufixo `.txt` no arquivo documental
para não entrar na descoberta de código pelo tooling. Seus bytes são os mesmos
dos arquivos entregues; retirar o sufixo somente ao reconstruir a sequência em
uma cópia de trabalho apropriada.

Para conferir SHA-256 no Windows, a partir desta pasta:

```powershell
Get-FileHash -Algorithm SHA256 .\aferi-task07-consolidado.patch
Get-FileHash -Algorithm SHA256 .\cartao-sintetico-sys120-dia80-pul72.png
```

Não há APK, keystore, `.env`, `local.properties`, cache, node_modules, credenciais,
logs clínicos ou imagens capturadas nesta pasta. Os JPEGs das telas são referências
do chat transcritas no registro; seus binários não estavam acessíveis para arquivar.

O diagnóstico visual é temporário. Sua remoção/redução antes de integração clínica
deve ser revisada em conjunto com os testes e a identificação da versão, mantendo
os guardrails. Não substituir uma implementação já ajustada por um artefato
histórico anterior só para recuperar um título de diagnóstico.
