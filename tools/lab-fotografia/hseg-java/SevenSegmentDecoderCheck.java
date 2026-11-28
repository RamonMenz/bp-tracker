package aferi.lab.sevensegment;

import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * LABORATÓRIO — checks do protótipo Java com visores 100% SINTÉTICOS desenhados aqui (sem fotos).
 * Sem argumentos: roda os checks e sai com código 1 se algum falhar.
 * Com "--dir <pasta>" (uso local, nunca comitar a pasta nem a saída): decodifica cada
 * <id>-<modelo>-<L>x<A>.raw e imprime o resultado por campo, para comparar com a referência Python.
 */
public final class SevenSegmentDecoderCheck {
    private SevenSegmentDecoderCheck() {}

    private static final int WIDTH = 400;
    private static final String[] SEG = {"abcdef", "bc", "abdeg", "abcdg", "bcfg", "acdfg", "acdefg", "abc", "abcdefg", "abcdfg"};
    private static final double[][] GTECH_ROWS = {{0.05, 0.3}, {0.44, 0.3}, {0.78, 0.19}};
    private static final double[][] GENERIC_ROWS = {{0.14, 0.26}, {0.47, 0.25}, {0.79, 0.18}};
    private static int failures = 0;

    private static byte[] blank(int height) {
        byte[] data = new byte[WIDTH * height];
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < WIDTH; x++) data[y * WIDTH + x] = (byte) (int) (170 + 50 * ((double) x / WIDTH) - 20 * ((double) y / height));
        }
        return data;
    }

    private static void darken(byte[] img, int height, double x, double y, double w, double h) {
        for (long r = Math.round(y); r < Math.round(y + h); r++) {
            for (long c = Math.round(x); c < Math.round(x + w); c++) {
                if (c >= 0 && c < WIDTH && r >= 0 && r < height) {
                    int i = (int) (r * WIDTH + c);
                    img[i] = (byte) Math.round((img[i] & 0xff) * 0.25);
                }
            }
        }
    }

    private static void paint(byte[] img, int height, double x, double y, double w, double h, int value) {
        for (long r = Math.round(y); r < Math.round(y + h); r++) {
            for (long c = Math.round(x); c < Math.round(x + w); c++) {
                if (c >= 0 && c < WIDTH && r >= 0 && r < height) img[(int) (r * WIDTH + c)] = (byte) value;
            }
        }
    }

    private static void drawDigit(byte[] img, int height, String segments, double x, double y, double h) {
        double w = 0.5 * h, t = 0.09 * h, gap = 2, half = h / 2, length = half - t / 2 - 2 * gap;
        for (char s : segments.toCharArray()) {
            switch (s) {
                case 'a': darken(img, height, x + t / 2, y, w - t, t); break;
                case 'g': darken(img, height, x + t / 2, y + half - t / 2, w - t, t); break;
                case 'd': darken(img, height, x + t / 2, y + h - t, w - t, t); break;
                case 'f': darken(img, height, x, y + t / 2 + gap, t, length); break;
                case 'b': darken(img, height, x + w - t, y + t / 2 + gap, t, length); break;
                case 'e': darken(img, height, x, y + half + gap, t, length); break;
                default: darken(img, height, x + w - t, y + half + gap, t, length); break;
            }
        }
    }

    private static double slotX(double h, int indexFromRight) {
        return 0.95 * WIDTH - (indexFromRight + 1) * 0.62 * h;
    }

    private static byte[] display(String device, int height, String... values) {
        double[][] rows = "generic".equals(device) ? GENERIC_ROWS : GTECH_ROWS;
        byte[] img = blank(height);
        for (int f = 0; f < 3; f++) {
            double h = rows[f][1] * height;
            String value = values[f];
            for (int k = 0; k < value.length(); k++) {
                int digit = value.charAt(value.length() - 1 - k) - '0';
                drawDigit(img, height, SEG[digit], slotX(h, k), rows[f][0] * height, h);
            }
        }
        return img;
    }

    private static void expect(String name, String[] actual, String... expected) {
        if (!Arrays.equals(actual, expected)) {
            failures++;
            System.out.println("FALHOU " + name + ": " + Arrays.toString(actual) + " != " + Arrays.toString(expected));
        } else {
            System.out.println("ok " + name);
        }
    }

    public static void main(String[] args) throws IOException {
        if (args.length == 2 && "--dir".equals(args[0])) {
            List<Path> files = new ArrayList<>();
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(Paths.get(args[1]), "*.raw")) {
                for (Path p : stream) files.add(p);
            }
            files.sort(null);
            for (Path p : files) {
                String[] parts = p.getFileName().toString().replace(".raw", "").split("-");
                String[] size = parts[2].split("x");
                byte[] data = Files.readAllBytes(p);
                System.out.println(parts[0] + " " + String.join(" ", SevenSegmentDecoder.decode(data, Integer.parseInt(size[0]), Integer.parseInt(size[1]), parts[1])));
            }
            return;
        }
        for (String device : new String[] {"gtech", "generic"}) {
            int height = "generic".equals(device) ? 520 : 540;
            for (int d = 0; d <= 9; d++) {
                String[] r = SevenSegmentDecoder.decode(display(device, height, "1" + d + d, "8" + d, "6" + d), WIDTH, height, device);
                expect(device + " digito " + d, r, "C:" + (100 + 11 * d), "C:" + (80 + d), "C:" + (60 + d));
            }
        }
        expect("visor apagado", SevenSegmentDecoder.decode(blank(540), WIDTH, 540, "gtech"),
            "U:visor-sem-digitos", "U:visor-sem-digitos", "U:visor-sem-digitos");
        byte[] partial = display("gtech", 540, "38", "84", "70");
        double h = 0.3 * 540;
        drawDigit(partial, 540, "b", slotX(h, 2), 0.05 * 540, h);
        String[] r = SevenSegmentDecoder.decode(partial, WIDTH, 540, "gtech");
        expect("centena parcialmente apagada", new String[] {r[0].substring(0, 2), r[1], r[2]}, "U:", "C:84", "C:70");
        byte[] glare = display("gtech", 540, "138", "84", "70");
        paint(glare, 540, slotX(h, 2) - 4, 0.05 * 540 - 4, 0.5 * h + 8, h + 8, 255);
        expect("centena encoberta por reflexo", SevenSegmentDecoder.decode(glare, WIDTH, 540, "gtech"),
            "U:centena-encoberta", "C:84", "C:70");
        byte[] seven = display("gtech", 540, "", "80", "70");
        drawDigit(seven, 540, "bc", slotX(h, 2), 0.05 * 540, h);
        drawDigit(seven, 540, "bc", slotX(h, 1), 0.05 * 540, h);
        drawDigit(seven, 540, "bc", slotX(h, 0), 0.05 * 540 + 0.06 * h, 0.94 * h);
        darken(seven, 540, slotX(h, 0) + 0.045 * h, 0.05 * 540 - 0.02 * h, 0.41 * h, 0.09 * h);
        expect("sete com barra separada (modelo certo)", SevenSegmentDecoder.decode(seven, WIDTH, 540, "gtech"), "C:117", "C:80", "C:70");
        expect("sete com barra fora da faixa (modelo trocado)",
            new String[] {SevenSegmentDecoder.decode(seven, WIDTH, 540, "generic")[0]}, "U:um-ou-sete");
        byte[] copy = display("generic", 520, "121", "79", "64");
        byte[] before = copy.clone();
        SevenSegmentDecoder.decode(copy, WIDTH, 520, "generic");
        expect("entrada intacta", new String[] {String.valueOf(Arrays.equals(copy, before))}, "true");
        if (failures > 0) {
            System.out.println(failures + " check(s) falharam");
            System.exit(1);
        }
        System.out.println("todos os checks sinteticos passaram");
    }
}
