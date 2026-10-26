# Especificação — Relatório em PDF para apresentação em consulta médica

**Projeto:** Aferi — ciclo do 2º semestre de 2026, Universidade Feevale.  
**Estado:** proposta funcional; escolha de biblioteca de geração de PDF pendente de avaliação técnica.  
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

### 7.1 Alternativas de bibliotecas para geração do PDF

As opções abaixo são **candidatas para investigação**, não dependências aprovadas. Compatibilidade com Expo SDK 57, licenças, manutenção, suporte a SVG/fontes, paginação e entrega local devem ser conferidos na documentação vigente e comprovados na prova de conceito. Impactos em tamanho e performance são qualitativos, não medições; não há tamanho de bundle validado nesta spec.

| Alternativa | Aplicação possível e prós | Contras e esforço | Performance a medir | Estilização e paginação | Impacto esperado no bundle/app |
|---|---|---|---|---|---|
| `expo-print` com HTML autocontido | Android via impressão/renderização do sistema; integração no ecossistema Expo e possível reaproveitamento de HTML/CSS | Confirmar comportamento de geração para arquivo na versão instalada. A Web pode oferecer impressão em vez de bytes de PDF equivalentes; não presumir que a mesma chamada entregue download nas duas plataformas | Custo de inicializar renderizador e compor tabelas; medir relatórios extensos e memória de HTML/gráfico | CSS facilita layout, mas suporte de regras de quebra e cabeçalho depende do motor; validar fontes e SVG locais | Acrescenta módulo nativo e JS, sem pressupor motor PDF inteiro embutido; exige novo Dev Client se não disponível. Medir delta real do build |
| `react-native-html-to-pdf` | Android; converte template HTML em arquivo local por módulo nativo | Nova bridge/dependência a validar com Expo e arquitetura RN instalada; sem solução Web equivalente garantida. Auditar temporários e permissões | Renderização nativa tende a aproveitar o sistema; custo cresce com HTML e páginas, sem garantia de rapidez | Boa familiaridade com HTML/CSS; limitações do motor de impressão e necessidade de testes de quebra de tabela | Aumenta binário nativo e JS; impacto depende do pacote e dependências. Comparar com `expo-print` em builds equivalentes |
| `pdf-lib` | Gerador de bytes em JS; candidato para Web e Android sem servidor; controle de texto e primitivas vetoriais | Não é motor HTML/CSS nem resolve tabela multipágina automaticamente. Verificar compatibilidade RN, fontes e conversão de SVG; construir layout exige mais código | Pode evitar WebView e produzir gráfico vetorial leve; medir uso de memória e execução JS para muitos registros | Posicionamento e paginação manuais; boa precisão, menor facilidade de ajustes visuais; fontes com acentos devem ser incluídas/validadas | Sem módulo nativo obrigatório pelo núcleo JS; bibliotecas auxiliares de fonte e assets podem dominar o tamanho. Carregar sob demanda não elimina bytes do pacote Android |
| `jsPDF` com `jspdf-autotable` | Principalmente Web; tabela paginada pronta, desenho vetorial e geração local para download | Integração RN não deve ser presumida; módulos podem depender de APIs de navegador. Evitar usar conversão HTML que introduza captura raster ou dependências pesadas sem necessidade | Bom candidato para tabelas sem renderizador HTML; medir paginação e tempo na thread JS; usar worker onde viável | AutoTable reduz esforço de cabeçalhos e quebras; gráfico e demais elementos requerem desenho/layout próprios | JS adicional e plugin de tabela; fontes e plugins HTML podem ampliar bastante o bundle. Medir importação efetiva e dependências transitivas |
| `pdfmake` | Documento declarativo com tabelas, cabeçalhos, rodapés e paginação; candidato forte para Web | Compatibilidade Android/RN, dependências e fontes precisam de prova. Não presumir que build para navegador funcione no Metro sem adaptação | Layout declarativo poupa código, mas pode consumir memória em grandes documentos; medir custo de fontes e tabelas | Mais simples que posicionamento manual; não usa CSS completo. Verificar suporte ao gráfico vetorial e controle de quebras | Motor de layout e fontes embutidas podem aumentar significativamente o bundle; reduzir conjunto de fontes e carregar sob demanda |
| HTML local com CSS de impressão do navegador | Web; poucas dependências e facilidade de pré-visualização com layout familiar | “Salvar como PDF” depende do diálogo do navegador e da ação do usuário; não equivale necessariamente a gerar um arquivo pronto com nome e bytes controlados. Só atende se satisfizer o fluxo de entrega especificado | Evita biblioteca PDF própria, mas depende do motor de impressão; medir documentos longos e bloqueio de popup/iframe | Estilização simples com CSS; margens, rodapés do navegador e cabeçalhos repetidos podem variar | Baixo JS adicional; template e fontes locais ainda têm custo. Pode exigir motor diferente no Android |

**Custo:** versões de código aberto/licenças elegíveis dessas alternativas podem permitir **R$ 0 por relatório**, pois a geração é local e não usa API paga. Confirmar licença da biblioteca e das fontes antes da adoção; builds, eventuais componentes comerciais e demais despesas continuam dentro do teto global. Não adotar serviço remoto para contornar uma dificuldade de layout.

**Orientação inicial para as provas de conceito:** comparar HTML local no Android com um gerador vetorial JS na Web e avaliar se um único gerador JS atende às duas plataformas com esforço aceitável. A escolha pode variar por plataforma, mas regras de cálculo, conteúdo e critérios de legibilidade devem ser únicos. A preferência por HTML ou vetores deve resultar das medições e do custo de manutenção para uma pessoa, não apenas da aparência de um exemplo curto.

### 7.2 Composição do gráfico e entrega local

- **Gráfico:** preferir SVG autocontido ou primitivas vetoriais do gerador, a partir de dados agregados puros. Não presumir que `TrendChart` de React Native seja renderizável em PDF. Rasterização local é alternativa se a resolução em A4 for suficiente e não exigir screenshot com dados cortados; medir peso do arquivo e legibilidade impressa.
- **Fontes e estilos:** usar fonte local com suporte a português, incorporada quando necessário e com licença adequada. Não carregar fonte por URL externa. Evitar dependências de ícones ou múltiplos pesos que aumentem o documento sem melhorar a consulta médica.
- **Android:** avaliar geração em cache privado e compartilhamento pelo sistema com prazo seguro de limpeza; `expo-sharing` já existe, mas não resolve geração nem confirma que o destinatário recebeu o documento. Revisar o uso atual de `expo-file-system/legacy` antes de escolher a API de arquivo.
- **Web:** avaliar bytes/`Blob`, URL de objeto e pré-visualização local, além da compatibilidade com bloqueio de popup e leitores externos. Uma solução baseada apenas em impressão precisa demonstrar que o usuário consegue salvar o PDF com todas as seções obrigatórias.
- Não instalar dependências, gerar builds pagos ou mudar o adaptador de CSV nesta etapa. Eventual dependência nativa implica novo build; a decisão deve justificar compatibilidade, tamanho e esforço.

### 7.3 Método de comparação e seleção

1. Aplicar primeiro os critérios eliminatórios: geração local, ausência de vazamento em logs/rede, conteúdo obrigatório completo, legibilidade, isolamento entre contas, preservação do legado, orçamento global e viabilidade até 15/12/2026.
2. Comparar pelo menos duas alternativas de geração sobre os mesmos conjuntos sintéticos e layout de referência, registrando versões, fontes e plataformas. O TAP exige comparação de abordagens de reconhecimento; esta avaliação de bibliotecas PDF é uma decisão de engenharia proporcional, sem criar um estudo acadêmico adicional obrigatório.
3. Usar casos com zero registros, um dia, 7/30 dias, múltiplos anos, pulsos ausentes, sessões de duas leituras, observações extensas, caracteres especiais e registros nas bordas do dia/fuso. Verificar contagens e médias contra resultados calculados independentemente.
4. Medir tempo de inicialização e geração, pico de memória, número de páginas, tamanho do PDF e responsividade. Comparar frio/aquecido em Android real e navegador móvel, separando tempo de consulta do tempo de renderização; definir limites de volume e timeout antes da validação final.
5. Medir impacto na build Web e no pacote Android com a mesma base de comparação, incluindo dependências transitivas, fontes e assets. Registrar JS comprimido/transferido, estratégia de carregamento e delta do artefato nativo quando aplicável; não confundir tamanho publicado no npm com tamanho adicionado ao app.
6. Avaliar facilidade de manutenção: alterações de coluna, inclusão de observação longa, cabeçalhos repetidos, paginação e gráfico em escala de cinza. Inspecionar visualmente PDF em tela e impresso, além de conferir texto extraído, ordem de leitura e ausência de requisições externas.
7. Formalizar escolha, alternativas descartadas, limitações, política de temporários e diferenças de plataforma. Registrar resultados sem declarar tamanho, performance ou conformidade de acessibilidade que não tenham sido medidos.

### 7.4 Decisões ainda pendentes

- Biblioteca de geração por plataforma, estratégia de pré-visualização e necessidade de módulo nativo adicional.
- Renderização vetorial ou raster do gráfico, fonte incorporada, escala dos painéis e limites práticos de paginação.
- Volume máximo suportado por operação, timeout, execução fora da thread da interface e comportamento explícito para relatórios grandes, sem omissão silenciosa.
- Forma de comprovar completude da consulta, sinalizar documentos inválidos e identificar registros pendentes/cache sem alterar o comportamento do CSV.
- Política de vida útil dos temporários e concessões de leitura no Android, compatibilidade de download/preview Web e nível comprovado de acessibilidade do PDF.

O TAP prevê relatório PDF operante até **24/11/2026**, avaliação final em **08/12** e ajustes até **15/12/2026**. A escolha deve caber no prazo e no desenvolvimento individual, com prioridade para uma entrega legível e correta dos três conteúdos obrigatórios, preservando privacidade e funcionalidades existentes.
