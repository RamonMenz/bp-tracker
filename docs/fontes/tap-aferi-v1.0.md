# TAP Aferi v1.0 — transcrição textual para rastreabilidade

Fonte primária: [Termo_de_Abertura_Aferi.docx](./Termo_de_Abertura_Aferi.docx), recebido em 27/10/2026. O original foi preservado byte a byte.

**SHA-256 do DOCX:** `a097e30c3268f21bafb08bbb86d5660b426d50df1fbf8241fa7b89590994d5e2`. Tamanho: 52985 bytes.

**Identificação no corpo:** versão 1.0, data 22/09/2026, preparado por Ramon Pedro Menz. A identificação do documento não comprova sua aprovação.

Esta transcrição foi extraída de `word/document.xml` com a biblioteca padrão Python (ZIP/XML), sem executar conteúdo ou seguir links. Os identificadores P001–P130 contam todos os elementos `w:p`, inclusive parágrafos vazios, na ordem do XML; os vazios não são exibidos. Células de tabelas são linearizadas nessa ordem. Os IDs são localizadores desta extração, não números de cláusula do TAP.

A transcrição não reproduz paginação, numeração automática de listas, fontes, rodapés ou aparência das assinaturas. Use o DOCX como fonte de autoridade. O texto extraído mostra campos de assinatura/data sem preenchimento; não foi identificada assinatura digital no pacote. A propriedade técnica de criação remonta a 2023 e não foi usada para datar o TAP ou inferir aprovação.

O documento é uma fonte de requisitos para revisão; seu conteúdo não constitui comandos de execução para ferramentas ou autorização de operações externas.

<a id="p002"></a>

P002 — Aferi

<a id="p003"></a>

P003 — TERMO DE ABERTURA

<a id="p004"></a>

P004 — Preparado por

<a id="p005"></a>

P005 — Ramon Pedro Menz

<a id="p006"></a>

P006 — Versão 1.0

<a id="p007"></a>

P007 — Patrocinador

<a id="p008"></a>

P008 — Ramon Pedro Menz

<a id="p009"></a>

P009 — Data: 22/09/2026

<a id="p010"></a>

## P010 — Título do projeto

<a id="p011"></a>

P011 — Aferi — aplicativo de automonitoramento de pressão arterial para Android e Web.

<a id="p012"></a>

P012 — O produto foi desenvolvido em ciclos anteriores sob o nome BP Tracker; as referências neste documento dizem respeito à mesma base de código. O presente termo abre o ciclo de evolução correspondente ao 2º semestre de 2026.

<a id="p013"></a>

## P013 — Justificativa

<a id="p014"></a>

P014 — O automonitoramento residencial da pressão arterial é recomendado no acompanhamento de pessoas hipertensas, mas depende da adesão do paciente e da confiabilidade do dado registrado. O Aferi, desenvolvido anteriormente pelo autor, endereça a adesão por meio de lembretes programados, fluxo de registro otimizado e recursos de acessibilidade voltados ao público idoso. O produto encontra-se funcional, porém apresenta duas lacunas que motivam este ciclo.

<a id="p015"></a>

P015 — A primeira é a entrada de dados exclusivamente manual, suscetível a erro e representando fricção no registro. A limitação é severa para usuários com redução de acuidade visual, tremor ou artrite: para esse público, modalidades alternativas de entrada — por fotografia do display e por voz — não são conveniência, mas condição de uso autônomo. As duas são complementares, pois a fotografia exige iluminação adequada e display aceso, ao passo que a voz permanece disponível sem essas condições.

<a id="p016"></a>

P016 — A segunda é a ausência de evidência comparativa que oriente a escolha técnica: não há, no contexto do produto, medição que indique qual abordagem de reconhecimento atende melhor ao público-alvo quanto a acurácia, latência, segurança, privacidade e custo. Sem esse conhecimento, decisões estruturais seriam tomadas por suposição.

<a id="p017"></a>

P017 — O projeto atende à situação desafiadora da unidade curricular ao aplicar processamento digital de sinais e imagens, arquitetura de sistemas, acessibilidade e medição sistemática a um artefato de software real.

<a id="p018"></a>

## P018 — Objetivo do Projeto

<a id="p019"></a>

P019 — Desenvolver modalidades assistidas de registro de medições de pressão arterial por fotografia e por voz no aplicativo Aferi e disponibilizar a informação registrada em formato adequado à consulta médica, fundamentando a escolha técnica de cada modalidade em comparação documentada entre abordagens alternativas. Conclusão prevista para dezembro de 2026.

<a id="p020"></a>

P020 — Entregas principais:

<a id="p021"></a>

P021 — Módulo de registro de medições por fotografia do display do aparelho, com confirmação do usuário antes de salvar a medição. O método de reconhecimento não é definido a priori, sendo objeto da decisão técnica a ser formalizada até 06/10/2026.

<a id="p022"></a>

P022 — Módulo de registro de medições por voz, com interpretação das formas de enunciação usuais em português brasileiro e confirmação do usuário antes de salvar a medição. O método de reconhecimento igualmente não é definido a priori.

<a id="p023"></a>

P023 — Relatório em PDF para apresentação em consulta médica, alternativa mais legível à exportação em CSV existente, com gráfico de tendência, tabela do período e médias do intervalo.

<a id="p024"></a>

P024 — Relatório técnico final contendo contextualização, referencial teórico, trabalhos correlatos, metodologia, desenvolvimento, decisão técnica documentada, comparação entre abordagens alternativas de cada modalidade sobre casos de teste rotulados, resultados, discussão crítica e considerações finais, atendendo à exigência de evidenciação de habilidades discursivas de análise e síntese. A decisão técnica é registrada em documento próprio até 06/10/2026 e posteriormente incorporada ao relatório.

<a id="p025"></a>

P025 — Entregas complementares, conforme o cronograma permitir, listadas da última à primeira a ser cortada:

<a id="p026"></a>

P026 — Observabilidade em pontos críticos, com telemetria anônima e agregada que apure latência por etapa, desfecho do reconhecimento, taxa de correção de valores pré-preenchidos e custo operacional estimado.

<a id="p027"></a>

P027 — Serviço próprio para capacidades que demandem processamento fora do dispositivo, caso a decisão técnica evidencie a necessidade.

<a id="p028"></a>

P028 — Indicadores agregados por período: médias semanal e mensal e adesão calculada sobre os lembretes configurados.

<a id="p029"></a>

P029 — Adequação do modelo de dados e das regras de segurança, com ampliação da suíte de testes além do necessário à cobertura das novas funcionalidades.

<a id="p030"></a>

## P030 — Benefícios do Projeto

<a id="p031"></a>

P031 — Produto ampliado e funcional, com acessibilidade estendida a pessoas com redução de acuidade visual ou limitação motora, e menor risco de erro no registro de dado clínico.

<a id="p032"></a>

P032 — Entrega de informação ao profissional de saúde em formato legível, superando a limitação prática da exportação em CSV.

<a id="p033"></a>

P033 — Evidência comparativa entre abordagens de reconhecimento por imagem e por voz aplicadas a dado clínico, com casos de teste rotulados reaproveitáveis em trabalhos futuros.

<a id="p034"></a>

P034 — Decisão técnica rastreável, que documenta as alternativas consideradas e os critérios aplicados, orientando a evolução subsequente do produto.

<a id="p035"></a>

P035 — Referencial teórico, método e resultados aproveitáveis no Trabalho de Conclusão de Curso e em posterior conversão em artigo científico, além de potencial de disponibilização pública e exploração comercial do produto.

<a id="p036"></a>

## P036 — Exclusões do Projeto

<a id="p037"></a>

P037 — Não integram este ciclo, ficando registrados como trabalhos futuros:

<a id="p038"></a>

P038 — Avaliação de usabilidade com participantes, sua reavaliação após correções e a fixação de metas numéricas em escalas de usabilidade.

<a id="p039"></a>

P039 — Redação de artigo em formato SBC e sua submissão a evento. O relatório técnico final contempla as mesmas seções, admitida a conversão posterior.

<a id="p040"></a>

P040 — Migração da infraestrutura existente de autenticação, persistência e notificações. Eventual serviço próprio é complementar a ela e restrito às capacidades identificadas na decisão técnica.

<a id="p041"></a>

P041 — Treinamento de modelos de aprendizado de máquina a partir do zero. Recaindo a decisão sobre aprendizado, serão empregados modelos pré-treinados, serviços de terceiros ou recursos nativos, admitido ajuste fino apenas se o cronograma permitir.

<a id="p042"></a>

P042 — Observabilidade operacional ampla — rastreamento distribuído, painéis de monitoramento, alertas e indicadores de nível de serviço —, bem como o acompanhamento contínuo de indicadores de desempenho do produto em produção.

<a id="p043"></a>

P043 — Publicação em loja de aplicativos, desenvolvimento para iOS, integração via Bluetooth, widget de tela inicial, modo cuidador e qualquer funcionalidade diagnóstica ou prescritiva: o sistema registra e organiza dados, não interpreta resultados clínicos.

<a id="p044"></a>

P044 — Registra-se que o produto preexiste a esta unidade curricular. As funcionalidades já implementadas — autenticação, registro e edição de medições, classificação, histórico, gráfico de tendência, exportação em CSV, lembretes, tema e acessibilidade — não são objeto de avaliação deste ciclo, servindo como base. A delimitação entre o preexistente e o produzido neste semestre será declarada nos documentos de entrega.

<a id="p045"></a>

## P045 — Designação do Gerente

<a id="p046"></a>

P046 — Gerente do projeto: Ramon Pedro Menz, acadêmico de Ciência da Computação da Universidade Feevale, atuando individualmente.

<a id="p047"></a>

P047 — Responsabilidades: controle do escopo, condução da decisão técnica, desenvolvimento do artefato, coleta dos casos de teste, condução das comparações, análise dos resultados e produção dos documentos de entrega.

<a id="p048"></a>

P048 — Limitações: aquisições restritas a R$ 300,00, custeados pelo próprio gerente, sem autorização para contratação de recursos externos. Alterações de escopo, procedimentos envolvendo terceiros e prazos de entrega dependem de aprovação prévia da professora orientadora.

<a id="p049"></a>

## P049 — Partes Interessadas (Stakeholders)

<a id="p050"></a>

P050 — Parte interessada

<a id="p051"></a>

P051 — Papel no projeto

<a id="p052"></a>

P052 — Interesse

<a id="p053"></a>

P053 — Ramon Pedro Menz

<a id="p054"></a>

P054 — Gerente e desenvolvedor

<a id="p055"></a>

P055 — Aprovação na unidade curricular, evolução do produto e base para o TCC

<a id="p056"></a>

P056 — Profa. Marta Rosecler Bez

<a id="p057"></a>

P057 — Orientadora e avaliadora

<a id="p058"></a>

P058 — Aderência ao plano de ensino e rigor metodológico

<a id="p059"></a>

P059 — Universidade Feevale (ICCT)

<a id="p060"></a>

P060 — Instituição de ensino

<a id="p061"></a>

P061 — Produção acadêmica e possível publicação vinculada à instituição

<a id="p062"></a>

P062 — Usuários do Aferi

<a id="p063"></a>

P063 — Usuários finais do produto

<a id="p064"></a>

P064 — Registro mais rápido, acessível e confiável das medições

<a id="p065"></a>

P065 — Locutores

<a id="p066"></a>

P066 — Fonte das amostras de voz, mediante consentimento

<a id="p067"></a>

P067 — Contribuir com a construção dos casos de teste

<a id="p068"></a>

P068 — Profissionais de saúde

<a id="p069"></a>

P069 — Destinatários indiretos do dado

<a id="p070"></a>

P070 — Qualidade e confiabilidade do histórico apresentado em consulta

<a id="p072"></a>

## P072 — Orçamento resumido

<a id="p073"></a>

P073 — O projeto é limitado a R$ 300,00, custeados integralmente pelo gerente. O valor constitui teto inultrapassável: atingido o limite, prevalecerá a alternativa técnica de menor custo. O custo efetivo tende a ser muito inferior, podendo aproximar-se de zero. Composição:

<a id="p074"></a>

P074 — Eventual consumo de serviço de reconhecimento de imagem ou de fala de terceiros: R$ 0,00 a R$ 100,00. A existência de camada gratuita suficiente é critério de custo na decisão técnica, sendo desfavorável a alternativa que exija desembolso recorrente.

<a id="p075"></a>

P075 — Eventual hospedagem de serviço próprio, caso a decisão técnica evidencie a necessidade: R$ 0,00 a R$ 100,00, em plataforma com escala a zero. Os dois itens eventuais acima são, na prática, alternativos entre si: o processamento ocorre em serviço de terceiros ou em serviço próprio, não em ambos.

<a id="p076"></a>

P076 — Aquisição ou empréstimo de aparelho adicional de medição: R$ 0,00 a R$ 200,00, conforme a possibilidade de empréstimo.

<a id="p077"></a>

P077 — Infraestrutura de backend como serviço já utilizada e licenças de software: R$ 0,00, mantidas em camada gratuita ou código aberto.

<a id="p078"></a>

P078 — Não há custo de pessoal, uma vez que o desenvolvimento é realizado pelo próprio acadêmico como atividade curricular.

<a id="p079"></a>

## P079 — Cronograma básico do projeto

<a id="p080"></a>

P080 — O projeto está estruturado em quatro fases ao longo do 2º semestre de 2026, totalizando aproximadamente 100 horas e 20 semanas, conforme o cronograma oficial da unidade curricular.

<a id="p081"></a>

P081 — Fase

<a id="p082"></a>

P082 — Descrição

<a id="p083"></a>

P083 — Período

<a id="p084"></a>

P084 — Entrega associada

<a id="p085"></a>

P085 — 1

<a id="p086"></a>

P086 — Fundação: escopo e método, revisão de literatura e trabalhos correlatos, e levantamento das alternativas de reconhecimento candidatas para cada modalidade

<a id="p087"></a>

P087 — 04/08 a 22/09/2026 (8 semanas)

<a id="p088"></a>

P088 — Atividade avaliativa 01 — Termo de Abertura (20%), em 22/09/2026

<a id="p089"></a>

P089 — 2

<a id="p090"></a>

P090 — Construção: provas de conceito das alternativas candidatas e decisão técnica até 06/10, implementação das duas modalidades de registro, coleta dos casos de teste, integração ao aplicativo e, havendo tempo, instrumentação dos pontos críticos

<a id="p091"></a>

P091 — 23/09 a 27/10/2026 (5 semanas)

<a id="p092"></a>

P092 — Apresentação em 13/10 e relatório de acompanhamento em 27/10/2026

<a id="p093"></a>

P093 — 3

<a id="p094"></a>

P094 — Comparação e refinamento: comparação entre abordagens sobre os casos de teste, refinamento das modalidades, relatório em PDF, redação de referencial e método e entregas complementares

<a id="p095"></a>

P095 — 28/10 a 24/11/2026 (4 semanas)

<a id="p096"></a>

P096 — Apresentação e ajustes em 10/11; Atividade avaliativa 02 (20%), em 24/11/2026

<a id="p097"></a>

P097 — 4

<a id="p098"></a>

P098 — Fechamento: consolidação do relatório técnico final, apresentação com demonstração e ajustes

<a id="p099"></a>

P099 — 25/11 a 15/12/2026 (3 semanas)

<a id="p100"></a>

P100 — Atividade avaliativa 03 (60%), em 08/12; ajustes até 15/12/2026

<a id="p102"></a>

P102 — O projeto deverá estar concluído no prazo de 20 semanas, encerrando-se em 15/12/2026.

<a id="p103"></a>

P103 — Marcos de verificação: 22/09 — levantamento das alternativas de reconhecimento concluído para ambas as modalidades; 06/10 — provas de conceito realizadas e decisão técnica formalizada em documento próprio, sem revisão posterior; 27/10 — ambas as modalidades integradas ao aplicativo e casos de teste coletados, coincidindo com o relatório de acompanhamento; 10/11 — comparação entre abordagens concluída e analisada para as modalidades entregues; 24/11 — relatório em PDF operante e seções de referencial, método e desenvolvimento redigidas.

<a id="p104"></a>

## P104 — Premissas

<a id="p105"></a>

P105 — O Aferi encontra-se funcional e será utilizado como base, sendo este ciclo restrito à sua evolução, e a orientadora aprovará esse aproveitamento nas condições de delimitação declaradas.

<a id="p106"></a>

P106 — Existirá ao menos uma abordagem viável por modalidade dentro das restrições de prazo, custo, segurança e privacidade. Não se mostrando nenhuma satisfatória para determinada modalidade, a entrega será reposicionada como análise comparativa dos limites das abordagens investigadas — resultado que permanece válido.

<a id="p107"></a>

P107 — Os casos de teste poderão ser coletados com recursos próprios ao longo do desenvolvimento, sem base externa licenciada, havendo disponibilidade de ao menos dois modelos de aparelho e de locutores suficientes, admitida a participação de pessoas do círculo de convivência do gerente, mediante consentimento informado e por escrito, com as amostras anonimizadas e utilizadas exclusivamente na construção dos casos de teste.

<a id="p108"></a>

P108 — Os serviços de nuvem manterão suas camadas gratuitas e as datas das atividades avaliativas seguirão o cronograma oficial da unidade curricular.

<a id="p109"></a>

## P109 — Restrições

<a id="p110"></a>

P110 — O prazo é a restrição prioritária: a entrega vincula-se ao calendário letivo do 2º semestre de 2026 e não admite prorrogação. Demais restrições:

<a id="p111"></a>

P111 — Carga horária de aproximadamente 100 horas, equipe de uma única pessoa e orçamento limitado a R$ 300,00, custeado pelo próprio acadêmico.

<a id="p112"></a>

P112 — Dados de saúde impõem conformidade com a LGPD. Imagens e áudios capturados em uso devem ser processados em memória, sem persistência ou registro em log; envio a serviço de terceiros deve ser informado ao usuário e conta como fator desfavorável na decisão técnica. Os casos de teste são coletados pelo próprio autor, não envolvendo dados de usuários do produto.

<a id="p113"></a>

P113 — Realizada a entrega complementar correspondente, a telemetria não poderá conter dado clínico, imagem, áudio ou identificador pessoal, devendo ser anônima e agregada, preservando a decisão de não identificar o usuário nas ferramentas de observabilidade.

<a id="p114"></a>

P114 — Nenhum valor reconhecido automaticamente pode ser gravado sem confirmação explícita do usuário, dada a natureza clínica do dado.

<a id="p115"></a>

P115 — As novas modalidades são caminhos adicionais de entrada: o caminho crítico já existente — registro manual, edição e consulta de medições — não pode sofrer degradação de desempenho nem perda de funcionalidade em decorrência delas.

<a id="p116"></a>

P116 — Havendo conflito entre escopo e prazo, a redução recairá primeiro sobre as entregas complementares, iniciando pela última da lista e seguindo para cima. Uma modalidade plenamente implementada e comparada tem precedência sobre duas parcialmente concluídas: não comportando o prazo ambas, a de fotografia será concluída integralmente e a de voz entregue em estágio parcial, com o alcance atingido declarado de forma explícita.

<a id="p117"></a>

P117 — Não são passíveis de corte, em nenhuma hipótese, a modalidade de registro por fotografia, a confirmação obrigatória do usuário e o relatório técnico final, este último com a decisão técnica e a comparação entre abordagens que o integram.

<a id="p118"></a>

P118 — APROVAÇÕES

<a id="p119"></a>

P119 — Nome e assinatura

<a id="p121"></a>

P121 — Ramon Pedro Menz

<a id="p122"></a>

P122 — Gerente do Projeto

<a id="p123"></a>

P123 — Assinatura:

<a id="p125"></a>

P125 — Profa. Marta Rosecler Bez

<a id="p126"></a>

P126 — Orientadora

<a id="p127"></a>

P127 — Data:

<a id="p129"></a>

P129 — ____/____/2026
