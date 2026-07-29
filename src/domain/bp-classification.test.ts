import { classifyBloodPressure } from './bp-classification';

describe('classifyBloodPressure', () => {
  describe('normal (< 120 E < 80)', () => {
    it('classifica 119/79 como normal — o último ponto antes de qualquer faixa superior', () => {
      expect(classifyBloodPressure(119, 79)).toBe('normal');
    });

    it('classifica o mínimo plausível como normal', () => {
      expect(classifyBloodPressure(90, 60)).toBe('normal');
    });
  });

  describe('elevada (120–129 E < 80)', () => {
    it('classifica 120/79 como elevada — só a sistólica cruzou o limite', () => {
      expect(classifyBloodPressure(120, 79)).toBe('elevated');
    });

    it('classifica 129/79 como elevada — o topo da faixa', () => {
      expect(classifyBloodPressure(129, 79)).toBe('elevated');
    });
  });

  describe('estágio 1 (130–139 OU 80–89)', () => {
    it('classifica 120/80 como estágio 1, não elevada — a diastólica manda', () => {
      expect(classifyBloodPressure(120, 80)).toBe('stage1');
    });

    it('classifica 130/79 como estágio 1 — só a sistólica cruzou', () => {
      expect(classifyBloodPressure(130, 79)).toBe('stage1');
    });

    it('classifica 119/80 como estágio 1 — só a diastólica cruzou', () => {
      expect(classifyBloodPressure(119, 80)).toBe('stage1');
    });

    it('classifica 130/80 como estágio 1 — ambos cruzaram', () => {
      expect(classifyBloodPressure(130, 80)).toBe('stage1');
    });

    it('classifica 139/89 como estágio 1 — o topo da faixa', () => {
      expect(classifyBloodPressure(139, 89)).toBe('stage1');
    });
  });

  describe('estágio 2 (>= 140 OU >= 90)', () => {
    it('classifica 140/89 como estágio 2 — só a sistólica cruzou', () => {
      expect(classifyBloodPressure(140, 89)).toBe('stage2');
    });

    it('classifica 139/90 como estágio 2 — só a diastólica cruzou', () => {
      expect(classifyBloodPressure(139, 90)).toBe('stage2');
    });

    it('classifica 140/90 como estágio 2 — ambos cruzaram', () => {
      expect(classifyBloodPressure(140, 90)).toBe('stage2');
    });

    it('classifica 180/120 como estágio 2 — o limite da crise é exclusivo (> 180 / > 120)', () => {
      expect(classifyBloodPressure(180, 120)).toBe('stage2');
    });
  });

  describe('crise (> 180 OU > 120)', () => {
    it('classifica 181/120 como crise — só a sistólica cruzou', () => {
      expect(classifyBloodPressure(181, 120)).toBe('crisis');
    });

    it('classifica 180/121 como crise — só a diastólica cruzou', () => {
      expect(classifyBloodPressure(180, 121)).toBe('crisis');
    });

    it('classifica 181/121 como crise — ambos cruzaram', () => {
      expect(classifyBloodPressure(181, 121)).toBe('crisis');
    });

    it('classifica crise mesmo com a outra medida em faixa normal', () => {
      expect(classifyBloodPressure(185, 70)).toBe('crisis');
      expect(classifyBloodPressure(110, 125)).toBe('crisis');
    });
  });

  it('nunca classifica uma medida mais grave para baixo: a categoria segue o pior dos dois valores', () => {
    // Sistólica fixa em faixa normal; cada degrau da diastólica sobe a categoria.
    expect(classifyBloodPressure(110, 79)).toBe('normal');
    expect(classifyBloodPressure(110, 80)).toBe('stage1');
    expect(classifyBloodPressure(110, 90)).toBe('stage2');
    expect(classifyBloodPressure(110, 121)).toBe('crisis');
  });
});
