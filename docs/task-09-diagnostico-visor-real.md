# TASK-09 — diagnóstico dirigido do visor real Android

## Base e evidência

Etapa baseada em staging `5d88c0bc709e3c114921fe8abac31655efbe11e3`, após
merge do PR#76 confirmado no GitHub. Trabalho anterior preservado. Autor
identifica aparelho G-Tech BSPII, linha Home, e relata tentativa na demo sem
identificação dos três campos. A tentativa terminou; não há diagnóstico de
associação correspondente recuperado. Não atribuir essa falha ao APK259 ou a
outro hash sem confirmação da identidade daquela execução.

Duas fotos foram fornecidas no chat, com LCD ligado/desligado. Inspeção visual
pelo assistente, sem executar ML Kit sobre elas. Fotos, valores e metadados
pessoais não foram adicionados a arquivos, fixtures, logs ou PR. Registro apenas
do layout: SIS/DIA/PULSO e unidades impressos na carcaça à direita do LCD;
dígitos de sete segmentos; região inferior com acessórios de calendário/relógio;
reflexo e contraste não uniformes. Isso não reproduz o quadro entregue pela demo.
Imagem vista pelo assistente não equivale a resultado do ML Kit no Samsung.

## Hipóteses e implementação

Enquadrar apenas o LCD pode excluir rótulos. OCR pode ler somente a carcaça,
falhar nos segmentos ou entregar caixas inadequadas à associação. Nenhuma dessas
causas foi comprovada. O parser já aceita SIS/PULSO e possui testes sintéticos
para números à esquerda dos rótulos/unidades separadas. Não relaxar geometria,
inventar campos por ordem/faixa nem substituir o motor com base nas fotos.

`associacao-2` mantém os quatro indicadores anteriores e acrescenta apenas:

- `ocr:digitos-ascii-presentes` ou `ocr:sem-digitos-ascii`;
- `rotulo:SYS=presente/ausente`, `rotulo:DIA=presente/ausente` e
  `rotulo:PUL=presente/ausente`.

Rótulos usam normalização/tokenização/dicionário do próprio parser; não se trata
de busca de substring. A presença é lexical, não conta ocorrências nem confirma
identidade, número clínico, caixa válida, proximidade ou acerto. Dígitos podem
pertencer a acessórios. Ausência de dígitos ASCII não prova ausência de imagem
ou OCR: letras confundidas com números e outros caracteres permanecem possíveis.
Não há texto bruto, valor, posição, confiança, hora, arquivo, logger, upload ou
nova captura. Diagnóstico segue transitório e os testes de ciclo de vida conferem
seu descarte. Nenhuma regra de interpretação/câmera/nativo/permissão mudou.

## Próximo ensaio — ainda não executado ou solicitado

Nenhum novo build/instalação ou repetição agora. Alteração é JS/TS, mas sua
adoção exige fonte/Metro/bundle identificados para não usar ferramentas fixadas
na fonte ca786ed de outra rodada como prova desta. App instalado e snapshots
anteriores devem ser preservados. Primeiro conferir mudança e CI do PR.

Preparar posteriormente um único ensaio dirigido com entradas não clínicas,
identidade do artefato, ambiente local controlado e redes verificadas conforme
protocolo de privacidade; nenhuma foto ou texto bruto precisa ser devolvido.
Enquadramento deve incluir LCD e rótulos externos, câmera aproximadamente frontal,
sem zoom digital e sem brilho cobrindo o visor. Não usar o ciclo de inflar/medir
como estímulo de teste. Não pedir medições adicionais ou invocar modo de teste
não documentado. LCD desligado testa layout, não leitura de segmentos; estímulo
sintético tampouco homologa o display real.

Retorno futuro: somente versão visível, App/Fase/Nativo, os oito indicadores de
associação e observação de encerramento/erro, sem screenshot ou valores.
Se não há dígitos, investigar captura/OCR; se faltam rótulos, investigar
cobertura/reconhecimento da carcaça; se ambos existem mas campos seguem incertos,
investigar associação. Essas classificações orientam, não comprovam causa.

Privacidade SDK, tráfego por UID/destino, efeito compilado do inspector e demais
critérios permanecem pendentes. TASK-04/06/07/09/18 parciais, habilitação clínica
bloqueada. Esta mudança diagnostica; não corrige ou comprova leitura do medidor.

## Verificações desta alteração

Lint, TypeScript raiz e demo, 745 testes em 67 suítes e diff sem erros de
whitespace aprovados. Testes usam somente textos sintéticos, cobrem marca sem
dígitos, acessórios numéricos, rótulos sem valores, limites léxicos, ausência de
conteúdo sensível na saída e distinção entre presença lexical/associação.
Regressões confirmam descarte do diagnóstico e rejeição de resultados tardios.
Nenhum ML Kit real, APK novo ou ensaio físico executado pelo Codex.
