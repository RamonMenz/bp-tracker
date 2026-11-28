package aferi.lab.sevensegment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TreeSet;

/**
 * LABORATÓRIO — protótipo em Java puro do H-seg v2 (estudo para um porte Android sobre o quadro NV21 em
 * memória; docs/fotografia-lab.md §15). NÃO integrado a native-modules/ nem ao app; candidato não
 * habilitado, aguarda decisão da orientadora (P02/P106/P048). Espelha src/domain/seven-segment
 * (mesma aritmética float32/double do TypeScript). Entrada: LCD retificado em tons de cinza.
 * Saída por campo: "C:<valor>" (candidato) ou "U:<motivo>" (incerto; campo vazio na revisão).
 */
public final class SevenSegmentDecoder {
    private SevenSegmentDecoder() {}

    public static final String[] FIELDS = {"systolic", "diastolic", "pulse"};
    /** Por modelo e campo: início e fim do centro vertical, altura mínima, x mínimo, altura esperada. */
    private static final double[][] GTECH = {
        {0, 0.39, 0.2, 0.25, 0.31}, {0.39, 0.755, 0.2, 0.25, 0.31}, {0.755, 1, 0.13, 0.55, 0.21}};
    private static final double[][] GENERIC = {
        {0.11, 0.43, 0.18, 0.3, 0.26}, {0.43, 0.755, 0.18, 0.3, 0.26}, {0.755, 1, 0.12, 0.5, 0.2}};
    private static final String[] PATTERN_KEYS = {
        "abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "cdefg", "abc", "abcf", "abcdefg", "abcdfg", "abcfg"};
    private static final int[] PATTERN_VALUES = {0, 1, 2, 3, 4, 5, 6, 6, 7, 7, 8, 9, 9};

    private static float[] rank(float[] src, int w, int h, int kx, int ky, boolean max) {
        float[] tmp = new float[w * h];
        float[] out = new float[w * h];
        int rx = kx >> 1, ry = ky >> 1;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                float v = src[y * w + x];
                for (int d = Math.max(0, x - rx); d <= Math.min(w - 1, x + rx); d++) {
                    v = max ? Math.max(v, src[y * w + d]) : Math.min(v, src[y * w + d]);
                }
                tmp[y * w + x] = v;
            }
        }
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                float v = tmp[y * w + x];
                for (int d = Math.max(0, y - ry); d <= Math.min(h - 1, y + ry); d++) {
                    v = max ? Math.max(v, tmp[d * w + x]) : Math.min(v, tmp[d * w + x]);
                }
                out[y * w + x] = v;
            }
        }
        return out;
    }

    private static int reflect(int i, int n) {
        int j = i;
        while (j < 0 || j >= n) j = j < 0 ? -j : 2 * n - 2 - j;
        return j;
    }

    private static float[] blur(float[] src, int w, int h, int size) {
        double sigma = 0.3 * ((size - 1) * 0.5 - 1) + 0.8;
        int r = size >> 1;
        float[] kernel = new float[size];
        double sum = 0;
        for (int i = 0; i < size; i++) {
            kernel[i] = (float) Math.exp(-((double) (i - r) * (i - r)) / (2 * sigma * sigma));
            sum += kernel[i];
        }
        for (int i = 0; i < size; i++) kernel[i] = (float) (kernel[i] / sum);
        float[] tmp = new float[w * h];
        float[] out = new float[w * h];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                double v = 0;
                for (int k = 0; k < size; k++) v += (double) kernel[k] * src[y * w + reflect(x + k - r, w)];
                tmp[y * w + x] = (float) v;
            }
        }
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                double v = 0;
                for (int k = 0; k < size; k++) v += (double) kernel[k] * tmp[reflect(y + k - r, h) * w + x];
                out[y * w + x] = (float) v;
            }
        }
        return out;
    }

    private static int otsu(int[] values) {
        double[] hist = new double[256];
        for (int v : values) hist[v]++;
        double sum = 0;
        for (int i = 0; i < 256; i++) sum += i * hist[i];
        double sumB = 0, weightB = 0, best = -1;
        int threshold = 0;
        for (int i = 0; i < 256; i++) {
            weightB += hist[i];
            double weightF = values.length - weightB;
            if (weightB == 0 || weightF == 0) continue;
            sumB += i * hist[i];
            double diff = sumB / weightB - (sum - sumB) / weightF;
            double between = weightB * weightF * diff * diff;
            if (between > best) {
                best = between;
                threshold = i;
            }
        }
        return threshold;
    }

    private static int[] shear(int[] src, int w, int h, double s, int fill) {
        int[] out = new int[w * h];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                long sx = Math.round(x - s * y + (s * h) / 2);
                out[y * w + x] = sx >= 0 && sx < w ? src[(int) (y * w + sx)] : fill;
            }
        }
        return out;
    }

    /** Componentes conexos (vizinhança 8) filtrados: ruído, moldura e traço na borda lateral. */
    private static List<int[]> components(int[] fg, int w, int h) {
        boolean[] seen = new boolean[w * h];
        List<int[]> out = new ArrayList<>();
        int[] stack = new int[w * h];
        for (int start = 0; start < fg.length; start++) {
            if (fg[start] == 0 || seen[start]) continue;
            int x0 = w, y0 = h, x1 = -1, y1 = -1, area = 0, top = 0;
            stack[top++] = start;
            seen[start] = true;
            while (top > 0) {
                int p = stack[--top];
                int px = p % w, py = p / w;
                area++;
                x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
                for (int dy = -1; dy <= 1; dy++) {
                    for (int dx = -1; dx <= 1; dx++) {
                        int nx = px + dx, ny = py + dy;
                        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                        int q = ny * w + nx;
                        if (fg[q] != 0 && !seen[q]) {
                            seen[q] = true;
                            stack[top++] = q;
                        }
                    }
                }
            }
            int bw = x1 - x0 + 1, bh = y1 - y0 + 1;
            if (area < 0.0004 * w * h) continue;
            if ((bw > 0.5 * w && bh < 0.06 * h) || (bh > 0.5 * h && bw < 0.06 * w)) continue;
            if (bw < 0.04 * w && (x0 <= 0.03 * w || x0 + bw >= 0.97 * w)) continue;
            out.add(new int[] {x0, y0, bw, bh});
        }
        return out;
    }

    private static List<int[]> group(List<int[]> parts) {
        List<int[]> sorted = new ArrayList<>(parts);
        sorted.sort((a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> groups = new ArrayList<>();
        for (int[] c : sorted) {
            int index = -1;
            for (int i = 0; i < groups.size(); i++) {
                int[] g = groups.get(i);
                if (Math.min(g[0] + g[2], c[0] + c[2]) - Math.max(g[0], c[0]) >= 0.3 * Math.min(g[2], c[2])) {
                    index = i;
                    break;
                }
            }
            if (index < 0) {
                groups.add(c);
                continue;
            }
            int[] g = groups.get(index);
            int x0 = Math.min(g[0], c[0]), y0 = Math.min(g[1], c[1]);
            groups.set(index, new int[] {x0, y0, Math.max(g[0] + g[2], c[0] + c[2]) - x0, Math.max(g[1] + g[3], c[1] + c[3]) - y0});
        }
        groups.sort((a, b) -> Integer.compare(a[0], b[0]));
        return groups;
    }

    private static List<int[]> runs(int[] line) {
        List<int[]> out = new ArrayList<>();
        int start = -1;
        for (int i = 0; i <= line.length; i++) {
            boolean on = i < line.length && line[i] > 0;
            if (on && start < 0) start = i;
            if (!on && start >= 0) {
                if (i - start >= 2) out.add(new int[] {start, i});
                start = -1;
            }
        }
        return out;
    }

    private static String sorted(TreeSet<Character> lit) {
        StringBuilder b = new StringBuilder();
        for (char c : lit) b.append(c);
        return b.toString();
    }

    private static String segments(int[] cell, int w, int h) {
        String vertical = null;
        for (double fx : new double[] {0.46, 0.5, 0.54}) {
            int[] column = new int[h];
            int x = (int) Math.floor(fx * w);
            for (int y = 0; y < h; y++) column[y] = cell[y * w + x];
            TreeSet<Character> lit = new TreeSet<>();
            for (int[] r : runs(column)) {
                double center = (r[0] + r[1]) / 2.0 / h;
                if (r[1] - r[0] > 0.3 * h) return null;
                if (center < 0.22) lit.add('a');
                else if (center > 0.36 && center < 0.64) lit.add('g');
                else if (center > 0.78) lit.add('d');
                else return null;
            }
            String s = sorted(lit);
            if (vertical != null && !vertical.equals(s)) return null;
            vertical = s;
        }
        TreeSet<Character> all = new TreeSet<>();
        for (char c : vertical.toCharArray()) all.add(c);
        double[][] rows = {{0.2, 0.27, 0.34}, {0.66, 0.73, 0.8}};
        char[][] sides = {{'f', 'b'}, {'e', 'c'}};
        for (int t = 0; t < 2; t++) {
            String found = null;
            for (double fy : rows[t]) {
                int y = (int) Math.floor(fy * h);
                TreeSet<Character> lit = new TreeSet<>();
                for (int[] r : runs(Arrays.copyOfRange(cell, y * w, y * w + w))) {
                    if (r[1] - r[0] > 0.45 * w) return null;
                    double center = (r[0] + r[1]) / 2.0 / w;
                    if (center < 0.4) lit.add(sides[t][0]);
                    else if (center > 0.6) lit.add(sides[t][1]);
                    else return null;
                }
                String s = sorted(lit);
                if (found != null && !found.equals(s)) return null;
                found = s;
            }
            for (char c : found.toCharArray()) all.add(c);
        }
        return sorted(all);
    }

    /** Dígito decodificado (0–9) ou motivo de recusa. */
    private static Object digit(int[] fg, int width, int[] box, int fieldHeight) {
        int x = box[0], y = box[1], w = box[2], h = box[3];
        int[] cell = new int[w * h];
        for (int r = 0; r < h; r++) System.arraycopy(fg, (y + r) * width + x, cell, r * w, w);
        if (h < 0.85 * fieldHeight) return "baixo";
        if ((double) w / h < 0.35) {
            return covered(cell, w, h, 0.1, 0.4) > 0.9 && covered(cell, w, h, 0.6, 0.9) > 0.9 ? (Object) 1 : "estreito";
        }
        if ((double) w / h > 0.8) return "largo";
        String lit = segments(cell, w, h);
        if (lit == null) return "varredura";
        for (int i = 0; i < PATTERN_KEYS.length; i++) if (PATTERN_KEYS[i].equals(lit)) return PATTERN_VALUES[i];
        return "padrao";
    }

    private static double covered(int[] cell, int w, int h, double from, double to) {
        int start = (int) Math.floor(from * h), end = (int) Math.floor(to * h), n = 0;
        for (int r = start; r < end; r++) {
            for (int c = 0; c < w; c++) {
                if (cell[r * w + c] > 0) {
                    n++;
                    break;
                }
            }
        }
        return (double) n / (end - start);
    }

    private static boolean hundredsOccluded(int[] gray, int width, int[] first, int[] second) {
        int step = second[0] + second[2] - (first[0] + first[2]);
        int x1 = first[0] + first[2] - step;
        int x0 = Math.max(0, x1 - first[2]);
        if (x1 <= x0) return false;
        int hidden = 0;
        for (int y = first[1]; y < first[1] + first[3]; y++) {
            for (int x = x0; x < x1; x++) {
                int v = gray[y * width + x];
                if (v >= 250 || v <= 15) hidden++;
            }
        }
        return (double) hidden / ((long) (x1 - x0) * first[3]) > 0.25;
    }

    /** Um "1" com barra horizontal não explicada logo acima, terminando na sua borda direita: pode ser "7". */
    private static boolean sevenBarNearby(List<int[]> parts, List<int[]> digits, int[] box, int fieldHeight) {
        int right = box[0] + box[2], top = box[1];
        for (int[] c : parts) {
            boolean inside = false;
            for (int[] g : digits) {
                if (c[0] >= g[0] && c[1] >= g[1] && c[0] + c[2] <= g[0] + g[2] && c[1] + c[3] <= g[1] + g[3]) inside = true;
            }
            if (!inside && c[2] >= 0.25 * fieldHeight && c[2] >= 2 * c[3]
                && Math.abs(c[0] + c[2] - right) <= 0.2 * fieldHeight
                && top - 0.15 * fieldHeight <= c[1] + c[3] && c[1] + c[3] <= top + 0.12 * fieldHeight) return true;
        }
        return false;
    }

    /** Lê os três campos de um LCD retificado ("gtech" ou "generic"). Não modifica a entrada. */
    public static String[] decode(byte[] grayBytes, int width, int height, String device) {
        double[][] template = "generic".equals(device) ? GENERIC : GTECH;
        int n = width * height;
        float[] data = new float[n];
        int[] gray = new int[n];
        for (int i = 0; i < n; i++) {
            gray[i] = grayBytes[i] & 0xff;
            data[i] = gray[i];
        }
        float[] background = blur(rank(rank(data, width, height, 41, 41, true), width, height, 41, 41, false), width, height, 31);
        int[] normalized = new int[n];
        for (int i = 0; i < n; i++) {
            normalized[i] = (int) Math.floor(Math.min(1, Math.max(0, gray[i] / (double) Math.max(background[i], 1f))) * 255);
        }
        int threshold = otsu(normalized);
        float[] fg = new float[n];
        int margin = (int) Math.floor(0.02 * width);
        for (int y = margin; y < height - margin; y++) {
            for (int x = margin; x < width - margin; x++) fg[y * width + x] = normalized[y * width + x] <= threshold ? 1 : 0;
        }
        float[] opened = rank(rank(fg, width, height, 3, 3, false), width, height, 3, 3, true);
        int[] mask = new int[n];
        for (int i = 0; i < n; i++) mask[i] = (int) opened[i];
        double bestScore = -1, bestShear = 0;
        for (int i = 0; i <= 30; i++) {
            double s = -0.3 + 0.02 * i;
            int[] sheared = shear(mask, width, height, s, 0);
            double[] columns = new double[width];
            for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) columns[x] += sheared[y * width + x];
            double score = 0;
            for (double c : columns) score += c * c;
            if (score > bestScore) {
                bestScore = score;
                bestShear = s;
            }
        }
        int[] upright = shear(mask, width, height, bestShear, 0);
        int[] grayUpright = shear(gray, width, height, bestShear, 128);
        List<int[]> parts = components(upright, width, height);
        String[] result = new String[3];
        boolean anyDigit = false;
        for (int f = 0; f < 3; f++) {
            double[] t = template[f];
            List<int[]> band = new ArrayList<>();
            for (int[] c : parts) {
                double center = (c[1] + c[3] / 2.0) / height;
                if (t[0] <= center && center < t[1] && c[0] >= t[3] * width) band.add(c);
            }
            List<int[]> tall = new ArrayList<>();
            for (int[] c : band) if (c[3] >= 0.08 * height) tall.add(c);
            if (!tall.isEmpty()) {
                int top = Integer.MAX_VALUE, bottom = Integer.MIN_VALUE;
                for (int[] c : tall) {
                    top = Math.min(top, c[1]);
                    bottom = Math.max(bottom, c[1] + c[3]);
                }
                double m = 0.02 * height, expected = t[4] * height, low = top, high = bottom;
                if (bottom - top < 0.8 * expected) {
                    low = Math.min(top, bottom - expected);
                    high = Math.max(bottom, top + expected);
                }
                List<int[]> kept = new ArrayList<>();
                for (int[] c : band) {
                    double mid = c[1] + c[3] / 2.0;
                    if (low - m <= mid && mid <= high + m) kept.add(c);
                }
                band = kept;
            }
            List<int[]> groups = group(band);
            List<int[]> digits = new ArrayList<>();
            for (int[] g : groups) if (g[3] >= t[2] * height) digits.add(g);
            anyDigit |= !digits.isEmpty();
            boolean unexplained = false;
            for (int[] g : groups) if (!digits.contains(g) && (g[3] >= 0.08 * height || g[2] >= 0.06 * width)) unexplained = true;
            if (unexplained) { result[f] = "U:tinta-nao-explicada"; continue; }
            if (digits.size() < 2 || digits.size() > 3) { result[f] = "U:" + digits.size() + "-digitos"; continue; }
            boolean coherent = true;
            for (int i = 1; i < digits.size(); i++) if (digits.get(i)[0] < digits.get(i - 1)[0] + digits.get(i - 1)[2]) coherent = false;
            if (!coherent) { result[f] = "U:incoerente"; continue; }
            if (digits.size() == 2 && hundredsOccluded(grayUpright, width, digits.get(0), digits.get(1))) {
                result[f] = "U:centena-encoberta";
                continue;
            }
            int fieldHeight = 0;
            for (int[] g : digits) fieldHeight = Math.max(fieldHeight, g[3]);
            StringBuilder value = new StringBuilder();
            String failure = null;
            for (int[] g : digits) {
                Object d = digit(upright, width, g, fieldHeight);
                if (d instanceof String) {
                    failure = (String) d;
                    break;
                }
                value.append((int) d);
            }
            if (failure == null && value.charAt(0) == '0') failure = "zero-a-esquerda";
            if (failure == null) {
                for (int i = 0; i < digits.size(); i++) {
                    if (value.charAt(i) == '1' && sevenBarNearby(parts, digits, digits.get(i), fieldHeight)) failure = "um-ou-sete";
                }
            }
            result[f] = failure != null ? "U:" + failure : "C:" + Integer.parseInt(value.toString());
        }
        if (!anyDigit) Arrays.fill(result, "U:visor-sem-digitos");
        return result;
    }
}
