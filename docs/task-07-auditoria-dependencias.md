# TASK-07 — primeira coleta técnica de dependências

Protocolo preparado em 23/11/2026; **ainda não executado no Windows pelo autor**.
Complementa [retorno TalkBack](task-07-reteste-talkback.md). Não substitui auditoria
de disco/logs/rede/SO nem encerra TASK-07. Nenhuma publicação, alteração de SDK,
leitura de mídia ou exportação de bancos é autorizada por este roteiro.

## Pergunta a resolver

O sandbox contém bancos DataTransport. A documentação pública consultada na
frente #69 mostra rota transitiva ML Kit text-recognition 16.0.1 → common 18.11.0
→ DataTransport. Isso não identifica versões efetivamente selecionadas pelo
Gradle, nem conteúdo/payload ou destinos de envio. Primeiro obter a árvore
resolvida no projeto isolado que gerou o APK; depois inspecionar as versões
identificadas e planejar observação de rede por UID sem payload clínico.

## Coleta no PowerShell

Usar o projeto Android já gerado da cópia de integração original. A nova cópia
TalkBack foi criada só para JS e pode não ter gradlew.bat. Não recriar projeto,
limpar dados, reinstalar APK ou trocar dependências para obter esta saída.

```powershell
cd C:\dev\aferi-task07-integracao
git rev-parse HEAD
git status --short
cd demos\android-capture\android
Test-Path .\gradlew.bat
```

Esperado: wrapper existente (True). Se a pasta/wrapper não existir, registrar
impedimento. Usar o mesmo JDK/SDK do build anterior, sem atualizar versões.
Executar um comando por vez:

```powershell
.\gradlew.bat :app:dependencyInsight --dependency transport-runtime --configuration debugRuntimeClasspath --offline --console=plain
```

```powershell
.\gradlew.bat :app:dependencyInsight --dependency transport-backend-cct --configuration debugRuntimeClasspath --offline --console=plain
```

```powershell
.\gradlew.bat :app:dependencyInsight --dependency com.google.mlkit:common --configuration debugRuntimeClasspath --offline --console=plain
```

São consultas de dependências: não solicitam assemble/install nem deploy.
Gradle pode gerar metadados de build/cache locais, sem capturar mídia. A opção
offline impede resolução remota de novas dependências. Se faltar artefato no
cache ou houver falha de SDK/JDK, enviar mensagem sanitizada; não retirar offline
ou trocar versões por tentativa. Saída sem correspondência deve ser registrada,
não convertida em prova de ausência do componente no APK.

## Retorno esperado

- HEAD/status do projeto consultado, distinguindo-o da cópia TalkBack f057283.
- Nome do componente e versão selecionada, inclusive setas de substituição.
- Motivos de seleção (conflito/regra/constraint) e caminho até as dependências.
- Sucesso, ausência de correspondência ou impedimento de cada comando.

Não enviar variáveis de ambiente, credenciais, conteúdo de google-services.json,
logs debug completos, APK, banco DataTransport, cookies, identificador de
instalação ou capturas do produto. Remover nomes pessoais/caminhos locais da
saída. A árvore descreve resolução do projeto naquele momento: não identifica
sozinha o binário instalado, o JS executado ou o conteúdo dos bancos.

O Codex analisará a árvore e os artefatos/fontes das versões identificadas.
Qualquer evidência de persistência/envio clínico bloqueia habilitação; ausência
de erro nos testes de interface não homologa privacidade. Nenhum resultado da
coleta ou exame de conteúdo é presumido neste documento.
