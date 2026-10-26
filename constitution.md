# Constituição do projeto Aferi

Este documento estabelece as regras imutáveis do ciclo de evolução do Aferi (anteriormente BP Tracker), correspondente ao 2º semestre de 2026 na Universidade Feevale. Sua referência é o Termo de Abertura de Projeto (TAP), versão 1.0, de 22/09/2026.

Estas regras orientam todas as especificações, decisões técnicas e implementações deste ciclo. Nenhuma entrega, dependência ou otimização pode contrariá-las.

## 1. Teto orçamentário absoluto

- O custo total do projeto não pode ultrapassar **R$ 300,00**, custeados pelo próprio desenvolvedor.
- O teto abrange aquisições e eventual consumo de serviços de reconhecimento ou hospedagem previstos no TAP; não constitui uma franquia mensal ou por funcionalidade.
- Camadas gratuitas e software de código aberto devem ser priorizados. A existência de custo recorrente é fator desfavorável na escolha técnica.
- Atingido o limite, deve prevalecer a alternativa técnica de menor custo que respeite as demais regras desta constituição. O limite não pode ser excedido para concluir uma funcionalidade.

## 2. Privacidade e conformidade com a LGPD

- Dados de pressão arterial são dados pessoais sensíveis de saúde e devem ser tratados conforme a LGPD, com finalidade definida e minimização de dados.
- **Imagens e áudios capturados durante o uso devem ser processados estritamente em memória, sem persistência nem registro em logs.** Essa obrigação abrange captura, processamento, tratamento de falhas e descarte, inclusive eventuais serviços externos.
- Imagens, áudios, transcrições com dados clínicos e valores de medição não podem integrar logs, relatórios de falha ou telemetria. Eventual telemetria das novas modalidades deve ser anônima e agregada, sem identificadores pessoais.
- Eventual envio a serviço de terceiros deve ser informado ao usuário e considerado fator desfavorável na decisão técnica. A escolha de um provedor não dispensa o cumprimento das restrições de memória, persistência e logs.
- Os casos de teste acadêmicos constituem um conjunto separado: devem ser coletados pelo autor, sem dados de usuários do produto. Amostras de voz de terceiros exigem consentimento informado e por escrito, anonimização e uso exclusivo na construção dos casos de teste, conforme o TAP.

## 3. Confirmação explícita antes de salvar

- **Nenhum valor reconhecido automaticamente por fotografia ou voz pode ser gravado sem confirmação explícita prévia do usuário.**
- O reconhecimento produz apenas valores candidatos, que devem ser apresentados para revisão e correção antes da confirmação.
- Concluir o reconhecimento, obter alta confiança ou deixar transcorrer um intervalo de tempo não constitui confirmação.
- Cancelamento, falha ou ausência de confirmação não podem criar nem atualizar uma medição com os valores reconhecidos, inclusive em filas de sincronização offline.

## 4. Preservação do caminho legado

- As modalidades por fotografia e voz são caminhos adicionais de entrada. O registro manual deve continuar disponível e funcional.
- **Autenticação, registro manual, edição e consulta de medições não podem sofrer perda de funcionalidade nem degradação de desempenho em decorrência das novas modalidades.**
- Histórico, classificação informativa, gráfico de tendência, exportação em CSV, lembretes, tema e acessibilidade existentes devem ser preservados.
- O caminho legado não pode depender de permissões de câmera ou microfone, de serviços de reconhecimento ou da disponibilidade das novas modalidades.
- Alterações de modelo, validação ou regras de segurança devem manter a compatibilidade com os registros existentes. A preservação do legado deve ser verificada nas entregas que o afetem.
- O Aferi registra e organiza dados; as novas funcionalidades não podem introduzir diagnóstico ou prescrição.

## Aplicação

Uma entrega que viole qualquer uma destas regras não pode ser considerada concluída ou aceita. Conflitos de implementação devem ser resolvidos pela escolha de outra abordagem ou pela redução de escopo permitida pelo TAP, preservando estas regras.
