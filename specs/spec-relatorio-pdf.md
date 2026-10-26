# Especificação — Relatório em PDF para apresentação em consulta médica

**Projeto:** Aferi — ciclo do 2º semestre de 2026, Universidade Feevale.  
**Estado:** decisões técnicas definidas; implementação e validação pendentes.
**Referências:** TAP v1.0, de 22/09/2026, [constituição do projeto](../constitution.md), [spec de fotografia](./spec-fotografia.md) e [spec de voz](./spec-voz.md).

## 1. Objetivo e limites

Permitir que o usuário gere um relatório de suas medições em PDF, legível na tela e em impressão, para apresentação em consulta médica. O documento oferece uma alternativa formatada à limitação prática do CSV, que permanece disponível e funcional.

O fluxo atende Android e Web e deve incluir **gráfico de tendência**, **tabela de todos os registros do período selecionado** e **médias de sistólica, diastólica e pulso do intervalo**, com unidades, denominadores e tratamento explícito de valores ausentes. A geração ocorre localmente no dispositivo, a partir dos registros do próprio usuário.

Não fazem parte desta especificação: geração em servidor, armazenamento de relatórios na nuvem pelo Aferi, links públicos, envio automático ao médico, prontuário de profissional de saúde, assinatura digital, diagnóstico, prescrição ou alteração do CSV. Não acrescenta cadastro de paciente, médico ou clínica. A arquitetura atual de autenticação, persistência e notificações deve ser preservada.

## 2. Invariantes

- O custo acumulado do projeto inteiro permanece limitado a **R$ 300,00**. Priorizar bibliotecas locais sem cobrança por documento; não contratar renderizadores remotos ou serviços de conversão.
- A consulta dos registros continua pelo Firestore e pelas regras de acesso existentes. **Agregação, composição do gráfico, renderização e geração do PDF são locais**; não enviar registros, HTML, imagens do gráfico ou PDF a servidor de conversão, analytics ou ferramenta de observabilidade.
- Valores clínicos, observações, conteúdo do documento e identificadores pessoais não podem integrar logs, breadcrumbs ou relatórios de falha. Mensagens de exceção do renderizador também podem conter conteúdo sensível; sanitizar apenas o contexto do logger não basta.
- O relatório usa somente registros já salvos pelo usuário. Candidatos não confirmados de fotografia ou voz não podem aparecer no documento, nem provocar gravação clínica durante a exportação.
- PDF e eventuais arquivos de apoio são artefatos de exportação distintos das capturas de imagem/áudio: o PDF pode ser salvo ou compartilhado por ação explícita do usuário. Isso não autoriza persistir mídia original, criar cópias internas permanentes ou reter HTML e gráficos clínicos desnecessariamente.
- Uma falha no PDF não pode bloquear registro manual, edição, histórico, lembretes, fotografia, voz ou exportação CSV. O documento organiza dados; não apresenta interpretações clínicas ou metas de pressão como recomendação automática.

## 3. Fluxo do usuário

### 3.1 Entrada

1. No Histórico, o usuário escolhe **“Gerar relatório PDF”**, mantendo a ação de exportação CSV acessível e independente. O recurso não acrescenta etapas ao registro manual.
2. O app explica que o documento será preparado no aparelho e conterá os registros do período escolhido. Não pede câmera, microfone ou permissão ampla de armazenamento para gerar o relatório.
3. Reutiliza a sessão autenticada e consulta somente as medições do próprio usuário. A existência de um arquivo de exportação não concede acesso a dados de outras contas.
4. Se não houver sessão válida, informa a necessidade de entrar novamente sem iniciar a geração. Não inclui automaticamente nome, e-mail, foto, UID ou outros dados da conta no relatório ou em seus metadados.

### 3.2 Seleção do período e preparação

1. Oferece **“Últimos 7 dias”**, **“Últimos 30 dias”**, **“Tudo”** e **“Personalizado”**, seguindo o padrão do diálogo de CSV. O período personalizado usa seletores de data inicial e final, sem exigir digitação de horário.
2. Os atalhos incluem o dia atual e os 6 ou 29 dias anteriores, respectivamente. Datas são interpretadas no fuso local do aparelho no início da operação; o fuso é fixado para consulta, agrupamento e apresentação durante toda a geração.
3. Para dias completos, considerar início do primeiro dia inclusivo e início do dia seguinte ao último exclusivo, respeitando mudanças de fuso/horário de verão; hoje é limitado ao instante de preparação. Um adaptador pode converter esse intervalo ao contrato atual de consulta inclusiva sem perder registros nas bordas. Não filtrar por `createdAt`: o campo é `measuredAt`.
4. Impede data final anterior à inicial e dias futuros. Em **“Tudo”**, consulta todos os registros disponíveis até o instante de preparação e informa no documento o primeiro e o último instante efetivamente incluídos.
5. Ao acionar **“Preparar relatório”**, obtém um conjunto consistente de registros e congela esse retrato para resumo, gráfico e tabela. Mudanças posteriores no histórico não alteram partes de um PDF em andamento; uma nova geração usa novos dados.
6. Não havendo registros, apresenta **“Nenhuma medição no período selecionado.”**, permite alterar o intervalo e não cria PDF vazio com médias zero. Falha ou leitura incompleta não pode ser apresentada como histórico completo.
7. Informa estados de preparação e oferece cancelamento. Leituras pendentes de sincronização ou conjunto disponível apenas em cache precisam de indicação explícita; se não puder comprovar completude do intervalo, pede conexão para tentar novamente ou identifica claramente o recorte parcial antes de exportá-lo.

### 3.3 Agregação e composição do documento

1. Monta um documento em português brasileiro, A4 retrato, com contraste adequado em fundo branco, margens consistentes e tamanho de texto legível. Como base de avaliação: corpo da tabela com pelo menos 10 pt e texto explicativo com pelo menos 11 pt; não comprimir linhas até torná-las ilegíveis para caber em uma página.
2. Usa o mesmo retrato para todas as seções. A ordem é **identificação do relatório e período → resumo e médias → gráfico de tendência → tabela de registros → notas metodológicas**, com paginação e aviso discreto de que o documento não substitui avaliação médica.
3. Define os seguintes conteúdos e regras de cálculo:

| Elemento | Conteúdo obrigatório | Regra de apresentação ou cálculo |
|---|---|---|
| Cabeçalho | “Aferi — Relatório de pressão arterial”, período selecionado, data/hora da geração e fuso utilizado | Datas em `dd/mm/aaaa`, horas em `HH:mm`; explicitar o fuso IANA ou identificação equivalente inequívoca. Não confundir período solicitado com datas efetivamente observadas. |
| Cobertura | Número de registros, dias com registro e primeiro/último registro incluído | Contar registros clínicos, não presumir adesão aos lembretes. Se houver dados pendentes ou cobertura parcial, declarar a condição. |
| Médias do intervalo | Média sistólica e diastólica em mmHg; média de pulso em bpm | Média aritmética dos valores principais de cada registro. Todos os registros têm o mesmo peso; não calcular a média das médias diárias. Informar N para pressão e N de registros com pulso. |
| Pulso ausente | Quantidade de registros com pulso e indicação de ausência quando necessário | Excluir `null` do denominador; nunca substituir por zero. Se não houver nenhum pulso, mostrar “Não informado”, sem média numérica. |
| Sessões de duas leituras | Identificação da média de sessão e exibição das leituras individuais disponíveis | Os campos principais do documento salvo contam uma vez no cálculo e no gráfico; `sessionReadings` é detalhe, não dois registros adicionais. Não reconstruir leituras ausentes de documentos antigos. |
| Gráfico de tendência | Duas séries: sistólica e diastólica; eixo temporal, eixo em mmHg, legenda e escala numérica | Um ponto por dia com dados, calculado sobre os valores principais dos registros daquele dia. O gráfico usa todo o período selecionado, sem restringi-lo silenciosamente a 7/30 dias. |
| Tabela de registros | Data, hora, sistólica (mmHg), diastólica (mmHg), pulso (bpm) e indicação de sessão quando existente | Ordenação cronológica crescente, com desempate estável pelo ID interno, que não é impresso. Incluir todos os registros do retrato, sem truncamento oculto. |
| Detalhes do registro | Leituras individuais da sessão e observação existente | Apresentar em linha complementar ou bloco que preserve legibilidade; pulso ausente como “—”. Tratar observação como texto literal, sem executar HTML, links ou recursos externos. |
| Rodapé e método | Página atual/total, unidades, regra das médias e significado dos pontos do gráfico | Informar que as médias do intervalo são por registro e os pontos são médias diárias; um dia sem dado não equivale a pressão zero. Não incluir recomendações ou diagnóstico. |

4. Calcular médias com precisão disponível nos valores salvos e arredondar **somente a apresentação final para uma casa decimal**, com vírgula em pt-BR. Médias diárias usadas no gráfico seguem a mesma regra sem reprocessar pontos já arredondados da interface. Não arredondar a cada soma nem recalcular a média da sessão a partir de seus detalhes para substituir o registro salvo.
5. Exemplo verificável: três registros com pressões 120/80, 130/90 e 140/100 e pulsos 60, ausente e 80 produzem médias **130,0/90,0 mmHg (N=3)** e **70,0 bpm (N=2)**. Se os dois primeiros forem no mesmo dia, a média global continua 130,0/90,0; não se torna a média dos dois pontos diários.
6. O gráfico diferencia séries por rótulo e traço/marcador, além de cor, para impressão em escala de cinza. Usa datas reais no eixo; dias sem medição não recebem zero, interpolação ou marca de leitura. Descontinuidades devem permanecer perceptíveis; não suavizar curvas de modo a sugerir valores não observados.
7. Com um único dia, mostra marcadores e explicação de dados disponíveis, sem fabricar uma linha de tendência. Para períodos extensos, pode dividir o gráfico em painéis temporais com a mesma escala e legenda; reduzir rótulos do eixo é permitido, omitir registros ou pontos silenciosamente não é.
8. A tabela repete o cabeçalho em cada página e mantém cada registro associado aos seus detalhes. Textos longos quebram linha e, se precisarem continuar em outra página, têm indicação de continuidade. Não corta observações, acentos, valores ou bordas na impressão.

### 3.4 Revisão e confirmação

1. Mostra um resumo de preparação com período, quantidade de registros, médias e eventuais avisos de cobertura; disponibiliza pré-visualização local do PDF por recurso compatível com a plataforma.
2. Oferece **“Alterar período”**, **“Cancelar”** e **“Salvar ou compartilhar PDF”**. A exportação depende dessa ação explícita; não abre destinatário, envia e-mail ou faz upload automaticamente. A pré-visualização não inicia impressão.
3. Os valores clínicos não são editados dentro do relatório. Para corrigir um registro, o usuário retorna ao fluxo de edição existente e gera um novo documento. Gerar PDF nunca confirma candidatos pendentes de voz/fotografia nem altera uma medição.
4. Informa que, ao salvar ou compartilhar, o destino escolhido pode manter uma cópia fora do controle do Aferi. Essa informação não implica que a geração do arquivo seja remota.
5. Mantém o botão de exportação indisponível enquanto uma geração estiver em andamento, sem impedir cancelamento ou retorno ao legado. Pré-visualização e ações de exportação permanecem compreensíveis por teclado e leitor de tela.

### 3.5 Exportação e encerramento

1. Entrega um PDF válido com MIME `application/pdf` e nome sem identificador pessoal, por exemplo `aferi-relatorio-2026-10-01_a_2026-10-23.pdf`. No modo “Tudo”, usa as datas efetivas do conjunto, mantendo o período descrito no documento.
2. Na Web, prefere bytes/`Blob` e URL de objeto para pré-visualização/download, sem enviar conteúdo ao servidor. Libera a URL apenas depois de o consumidor terminar de usá-la; não a revoga antes de o download ou a pré-visualização poderem abrir.
3. No Android, se o compartilhamento exigir arquivo local, utiliza armazenamento privado temporário e URI com concessão de leitura pelo mecanismo do sistema. Não cria cópia permanente em `documentDirectory` apenas por repetir o padrão atual do CSV.
4. Define limpeza após o uso e uma rotina local limitada para temporários residuais de interrupção, sem apagar o arquivo antes de o consumidor do compartilhamento terminar a leitura. Salvar pelo seletor do sistema cria a cópia escolhida pelo usuário, fora da limpeza interna do app.
5. Ao cancelar ou falhar, libera memória, pré-visualização e temporários que não estejam em uso, preserva o período para nova tentativa e apresenta mensagem amigável. Cancelar a folha de compartilhamento não é prova de falha ou de envio concluído.
6. Encerramento de sessão invalida operações e pré-visualizações da conta anterior, ignorando respostas tardias. Não abrir nem compartilhar resultado pendente depois de trocar de conta. Um arquivo já entregue por escolha do usuário não pode ser revogado pelo Aferi.

## 4. Integração e preservação do legado

- Seguir `app/ → features/ → services/`, com seleção e agregação puras separadas de renderização e entrega por plataforma. O relatório consome registros validados pelo repositório e não importa Firebase diretamente em componentes.
- Reaproveitar o filtro por `measuredAt` e o padrão de seleção de período do CSV sem alterar seu comportamento. O `getAllReadings` atual omite documentos inválidos individualmente: antes de reutilizá-lo no PDF, garantir uma forma explícita de sinalizar omissões; não exportar um subconjunto como se estivesse completo.
- O `computeDailyTrend` atual atende janelas de 7/30 dias e arredonda para inteiros. Não o usar sem adaptação como fonte universal do PDF. Uma eventual generalização deve preservar o contrato e os resultados do gráfico legado, com verificação de regressão.
- Carregar a biblioteca de PDF, fontes e renderizador sob demanda. Evitar trabalho pesado na thread da interface; usar worker na Web ou execução compatível no Android quando necessário. Não capturar a tela do Histórico como substituto de um documento paginado.
- A geração é uma operação de leitura e não demanda campo novo no modelo clínico, mudança de `source`, coleção de relatórios ou gravação de médias no Firestore. Caso a implementação introduza mudanças de modelo, justificar separadamente e revisar tipos, schema, rules, índices e testes negativos.
- O HTML, SVG e fontes do relatório devem ser locais e autocontidos, sem CDN, imagens remotas, analytics ou URLs da conta. Escapar observações e qualquer texto variável; bloquear recursos ativos e requisições causadas pelo conteúdo dos registros.
- Os controles do app mantêm alvos de toque de pelo menos 48 dp, corpo de pelo menos 16 px, escala de fonte, contraste AA, rótulos para leitores de tela e acesso por teclado. Essas medidas de interface são distintas dos pontos tipográficos do PDF. Priorizar texto selecionável e ordem de leitura no documento; acessibilidade de PDF marcado deve ser avaliada, sem presumir conformidade PDF/UA pela escolha da biblioteca.
- CSV, registro manual, autenticação, histórico, edição, lembretes, tema, acessibilidade e registros com `sessionReadings` permanecem funcionais. Reconhecimento offline, cache de registros e geração local são capacidades distintas: não prometer histórico completo offline quando o cache não o garantir.

## 5. Critérios de aceite

| ID | Cenário | Resultado verificável |
|---|---|---|
| PDF-01 | Abrir o Histórico e usar registro/CSV sem gerar PDF | Mantém fluxos legados; biblioteca de PDF não é inicializada antecipadamente. |
| PDF-02 | Selecionar 7/30 dias, Tudo ou período personalizado | Respeita `measuredAt`, fuso congelado e bordas do intervalo; período inválido bloqueia preparação. |
| PDF-03 | Gerar relatório de período com registros | Contém cabeçalho, cobertura, três médias, gráfico e tabela completa do mesmo retrato de dados. |
| PDF-04 | Executar o exemplo numérico da seção 3.3 | Exibe 130,0/90,0 mmHg com N=3 e pulso 70,0 bpm com N=2, sem média de médias diárias. |
| PDF-05 | Todos os registros sem pulso ou apenas alguns com pulso | Ausência aparece como “—” na tabela; média usa apenas pulsos presentes ou “Não informado” se N=0. |
| PDF-06 | Incluir sessão de duas leituras e documentos antigos | Sessão conta uma vez; detalhes são identificados sem dupla contagem nem reconstrução de leituras ausentes. |
| PDF-07 | Selecionar período vazio ou encontrar erro/omissão na leitura | Não gera relatório vazio enganoso nem declara cobertura completa; informa condição e permite nova tentativa. |
| PDF-08 | Gerar com um dia, dias sem dados ou intervalo extenso | Gráfico mantém datas reais e unidades, distingue séries e não fabrica zeros, tendência ou pontos interpolados. |
| PDF-09 | Exportar dados suficientes para várias páginas e observações longas | Não perde registros; cabeçalhos repetem, páginas são numeradas e detalhes permanecem associados aos registros. |
| PDF-10 | Abrir e imprimir em A4 e escala de cinza | Números, rótulos, acentos, gráfico e tabela permanecem legíveis, sem cortes ou dependência exclusiva de cor. |
| PDF-11 | Inspecionar rede durante renderização com fontes e gráficos | Não há requisição de geração externa, recurso remoto do template ou envio de dados clínicos; consultas autorizadas ao Firestore são identificadas separadamente. |
| PDF-12 | Incluir observação com HTML, URL, aspas e caracteres especiais | Renderiza texto literal; não executa código, carrega recurso remoto nem quebra o documento. |
| PDF-13 | Inspecionar logs e exceção do renderizador com conteúdo clínico | PDF, HTML, valores, observações e identificadores pessoais não chegam aos coletores. |
| PDF-14 | Cancelar, gerar novamente ou tocar repetidamente | Não dispara gerações concorrentes; cancelamento não altera histórico e libera recursos de forma segura. |
| PDF-15 | Salvar/compartilhar no Android e baixar na Web | PDF abre em leitor externo; MIME e nome estão corretos; nenhuma entrega externa ocorre antes da ação do usuário. |
| PDF-16 | Compartilhamento indisponível, cancelado ou interrompido | Mensagem/estado reflete o que é comprovável; não declara envio ao médico sem evidência e não apaga arquivo ainda em leitura. |
| PDF-17 | Inspecionar temporários após conclusão, cancelamento e reinício | Há política de limpeza verificável; não ficam cópias clínicas internas permanentes ou cache de HTML/gráfico sem necessidade. |
| PDF-18 | Trocar de conta durante preparação ou pré-visualização | Invalida o resultado e impede entrega tardia dos dados da conta anterior; isolamento das consultas permanece protegido. |
| PDF-19 | Usar somente registros em cache ou com escrita pendente | Declara condição/cobertura ou solicita conexão; não promete completude nem sincronização já concluída. |
| PDF-20 | Alterar o histórico enquanto o documento é gerado | Resumo, gráfico e tabela continuam coerentes com um único retrato; nova geração incorpora alterações posteriores. |
| PDF-21 | Navegar com leitor de tela/teclado e ampliar fonte | Seleção de período, revisão, avisos e exportação permanecem operáveis; documento mantém texto selecionável quando suportado pela alternativa avaliada. |
| PDF-22 | Comparar uso legado e gerar relatórios de tamanhos crescentes | Não há degradação atribuível ao módulo no legado; limites de geração são explícitos, sem truncar dados ou encerrar o app por falta de memória. |

Os critérios devem ser verificados em Android real e nos navegadores Web declarados como suportados na decisão técnica. Testes unitários cobrem intervalo, agregação e sessões; testes de integração cobrem consulta, cancelamento e exportação; inspeção do PDF e impressão cobrem legibilidade e paginação. Inspeção em runtime cobre rede, temporários e memória. Testes de texto ou snapshots isolados não comprovam qualidade visual ou ausência de envio externo.

## 6. Evidências de conclusão

O módulo estará concluído quando os critérios de aceite tiverem evidências registradas e o PDF funcionar nas duas plataformas, gerado localmente, sem violar a constituição nem degradar o legado. Utilizar registros sintéticos nos PDFs de validação versionados ou compartilhados para revisão; não anexar relatórios clínicos reais a testes, repositório ou ferramentas de observabilidade. Documentar biblioteca, versões, limites de período/volume e diferenças entre plataformas, mantendo todas as partes obrigatórias do relatório legíveis.

## 7. [DECISÕES DO ENGENHEIRO]

### 7.1 Bibliotecas de geração do PDF escolhidas

A decisão é **Expo Print com HTML/CSS autocontido no Android** e **jsPDF com `jspdf-autotable` na Web**, com seleção de dados e cálculos compartilhados. A geração será inteiramente local, sem serviço de PDF ou IA generativa.

| Plataforma | Escolha definitiva | Justificativa | Condições de implementação |
|---|---|---|---|
| Android | `expo-print`, usando `printToFileAsync` para gerar PDF local a partir de HTML/CSS | Integração no ecossistema Expo e menor esforço para cabeçalho, resumo, gráfico SVG e tabela com estilo consistente | Validar versão compatível com Expo SDK 57, paginação, fontes e SVG no motor do Android. Gerar em cache privado com política de limpeza e compartilhar por `expo-sharing` |
| Web | `jsPDF` + `jspdf-autotable`, com desenho vetorial direto | Download local de bytes, controle de layout e tabela multipágina sem rasterizar a página inteira | Carregar sob demanda, incluir somente plugins/fontes necessários, validar acentos, paginação e legibilidade. Não presumir compatibilidade React Native nem usar conversão HTML rasterizada |

**Custo de geração:** R$ 0,00 por relatório, com bibliotecas e fontes de licença elegível. Demais despesas permanecem no teto global de **R$ 300,00**. Tamanho do app, tempo e memória serão medidos; nenhuma redução de bundle está comprovada por esta decisão.

`pdfmake` foi descartado para esta entrega por acrescentar outro motor de layout/fontes sem necessidade diante dos adaptadores escolhidos; `pdf-lib` exigiria mais código de tabela e paginação. `html2pdf.js` traz rasterização, limites de canvas e menor controle de texto selecionável. Outra bridge HTML-to-PDF duplicaria integração nativa já atendida pelo Expo Print.

### 7.2 Composição do gráfico e entrega local

- **Conteúdo compartilhado:** preparar um único retrato validado do período e um modelo puro com médias, contagens, séries e linhas. As duas renderizações usam esse mesmo modelo e as regras da seção 3, incluindo pulso ausente e sessões de duas leituras.
- **Gráfico:** gerar SVG autocontido no template Android e primitivas vetoriais do jsPDF na Web, a partir das mesmas coordenadas/dados. Usar escala temporal real, unidades, legenda e distinção legível em escala de cinza. Não capturar o gráfico do Histórico nem adicionar biblioteca pesada de charts para PDF.
- **Tabela:** usar HTML/CSS de impressão no Android e AutoTable na Web, com cabeçalhos repetidos, linhas completas, tratamento de observações extensas e numeração de páginas. Quebras do motor Android precisam de validação em documento extenso.
- **Fontes:** usar fonte local licenciada com suporte a português, incorporada quando necessário, com poucos pesos. HTML, SVG, estilos e fontes não carregam recursos remotos. Escapar conteúdo variável e impedir recursos ativos no template.
- **Android:** gerar em armazenamento privado temporário; entregar URI com permissão de leitura pelo sistema. Limpar somente quando o consumidor não precisar mais do arquivo e tratar resíduos de interrupção. Não copiar para `documentDirectory` como padrão de retenção.
- **Web:** gerar bytes/`Blob`, abrir pré-visualização local ou baixar por ação do usuário e liberar URL de objeto após o consumo. Não depender do diálogo de impressão como mecanismo principal de geração.
- **Privacidade:** o PDF exportado por escolha do usuário pode existir como arquivo. Isso não altera a proibição de persistir áudio/fotografia de reconhecimento. Não guardar HTML, PDF, observações ou valores clínicos em logs ou serviços de geração externos.

### 7.3 Validação da decisão

1. Verificar geração local, conteúdo completo, legibilidade, ausência de vazamento em rede/logs, isolamento entre contas e preservação do legado. Renderizadores não podem iniciar consulta ou escrita clínica por conta própria.
2. Avaliar os dois adaptadores com o mesmo conjunto sintético e layout de referência, registrando versões e fontes. Esta validação proporcional de PDF não cria um estudo acadêmico obrigatório adicional ao comparativo de reconhecimento previsto no TAP.
3. Cobrir período vazio, um dia, 7/30 dias, múltiplos anos, ausência de pulso, sessões de duas leituras, observações extensas, acentos e bordas de fuso. Conferir contagens e médias com resultados independentes.
4. Medir inicialização, geração, memória, páginas, tamanho do arquivo e responsividade em Android real e navegador móvel. Separar consulta e renderização; fixar limites de volume e timeout antes da avaliação final, sem omitir dados silenciosamente.
5. Medir o delta real do pacote Android e do bundle Web, incluindo fontes e dependências transitivas. Carregamento sob demanda reduz inicialização, mas não elimina bytes distribuídos.
6. Inspecionar tela e impressão A4/escala de cinza, texto selecionável, quebras, cabeçalhos e ordem de leitura. Registrar acessibilidade comprovada sem presumir PDF/UA.
7. Registrar limitações, ciclo de temporários e diferenças entre plataformas. A escolha está fechada; performance e compatibilidade continuam dependentes de evidências na implementação.

### 7.4 Integração definitiva e parâmetros de validação

- Isolar renderização/entrega em adaptadores Android/Web e compartilhar o modelo de relatório e os cálculos. Carregar módulos apenas quando solicitados e preservar CSV e gráfico legados.
- Garantir sinalização explícita de documentos inválidos omitidos pela consulta e de cobertura/cache incompletos; não apresentar subconjunto como histórico completo nem alterar silenciosamente o contrato do CSV.
- Manter exportação como leitura, sem nova coleção, gravação de médias ou mudança de `source`. Exigir ação explícita para salvar/compartilhar o arquivo; essa ação não substitui a confirmação clínica exigida no registro por foto/voz.
- Validar volume suportado, timeout, fontes, paginação e ciclo seguro de temporários. Se o volume exceder a capacidade, informar o limite e solicitar período menor, sem truncar registros.

O TAP prevê relatório PDF operante até **24/11/2026**, avaliação final em **08/12** e ajustes até **15/12/2026**. A implementação prioriza os três conteúdos obrigatórios, geração local e desenvolvimento individual dentro de aproximadamente 100 horas totais do ciclo.
