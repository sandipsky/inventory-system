package com.sandipsky.inventory_system.common.export;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;

import com.sandipsky.inventory_system.common.util.MoneyUtil;

// A table as a file writes it: a list's rows, a report, or a document's lines. A feature declares
// each column with how to read its cell from a row; the writers do the rest. Cancelled rows stay
// in the table but count for nothing in the totals row, as on screen.
public final class ExportTable {

    // `total` adds the column up in the totals row; `totalValue`, when set, is shown there instead
    public record Column(String header, CellFormat format, boolean total, Object totalValue) {

        boolean inTotals() {
            return total || totalValue != null;
        }
    }

    private final String title;
    private final List<Field> details;
    private final List<Column> columns;
    private final List<List<Object>> rows;
    private final List<Boolean> cancelled;
    private final boolean numbered;

    private ExportTable(String title, List<Field> details, List<Column> columns, List<List<Object>> rows,
            List<Boolean> cancelled, boolean numbered) {
        this.title = title;
        this.details = details;
        this.columns = columns;
        this.rows = rows;
        this.cancelled = cancelled;
        this.numbered = numbered;
    }

    public static <T> Builder<T> of(String title) {
        return new Builder<>(title);
    }

    public String title() {
        return title;
    }

    // Shown under the title, e.g. the From / To dates the rows were picked by
    public List<Field> details() {
        return details;
    }

    public List<Column> columns() {
        return columns;
    }

    public List<List<Object>> rows() {
        return rows;
    }

    public boolean isCancelled(int row) {
        return cancelled.get(row);
    }

    // Whether the first column is a running S.N
    public boolean numbered() {
        return numbered;
    }

    public boolean hasTotals() {
        return !rows.isEmpty() && columns.stream().anyMatch(Column::inTotals);
    }

    // The totals row: each total column added up over the rows not cancelled, and "Total" in the
    // first column that isn't one
    public List<Object> totals() {
        List<Object> totals = new ArrayList<>();
        boolean labelled = false;
        for (int c = 0; c < columns.size(); c++) {
            if (columns.get(c).totalValue() != null) {
                totals.add(columns.get(c).totalValue());
            } else if (columns.get(c).total()) {
                double sum = 0;
                for (int r = 0; r < rows.size(); r++) {
                    if (!cancelled.get(r) && rows.get(r).get(c) instanceof Number number) {
                        sum += number.doubleValue();
                    }
                }
                totals.add(MoneyUtil.round2(sum));
            } else {
                totals.add(labelled ? null : "Total");
                labelled = true;
            }
        }
        return totals;
    }

    public static final class Builder<T> {
        private final String title;
        private final List<Field> details = new ArrayList<>();
        private final List<Column> columns = new ArrayList<>();
        private final List<Function<? super T, ?>> values = new ArrayList<>();
        private Predicate<? super T> cancelled = row -> false;
        private boolean numbered = true;

        private Builder(String title) {
            this.title = title;
        }

        public Builder<T> text(String header, Function<? super T, ?> value) {
            return column(header, CellFormat.TEXT, value);
        }

        public Builder<T> number(String header, Function<? super T, ?> value) {
            return column(header, CellFormat.NUMBER, value);
        }

        public Builder<T> amount(String header, Function<? super T, ?> value) {
            return column(header, CellFormat.AMOUNT, value);
        }

        public Builder<T> date(String header, Function<? super T, String> value) {
            return column(header, CellFormat.DATE, value);
        }

        public Builder<T> column(String header, CellFormat format, Function<? super T, ?> value) {
            columns.add(new Column(header, format, false, null));
            values.add(value);
            return this;
        }

        // Adds up the column declared last in the totals row
        public Builder<T> total() {
            Column last = columns.removeLast();
            columns.add(new Column(last.header(), last.format(), true, null));
            return this;
        }

        // Shows `value` for the column declared last in the totals row, e.g. a closing balance
        public Builder<T> totalAs(Object value) {
            Column last = columns.removeLast();
            columns.add(new Column(last.header(), last.format(), false, value));
            return this;
        }

        // A line under the title; a blank value is left out
        public Builder<T> detail(Field field) {
            if (!field.isBlank()) {
                details.add(field);
            }
            return this;
        }

        // The From / To dates the rows were picked by, when given
        public Builder<T> period(String fromDate, String toDate) {
            return detail(Field.date("From", fromDate)).detail(Field.date("To", toDate));
        }

        public Builder<T> cancelledWhen(Predicate<? super T> test) {
            cancelled = test;
            return this;
        }

        // No S.N column, e.g. when one row stands for one line of a document
        public Builder<T> unnumbered() {
            numbered = false;
            return this;
        }

        public ExportTable build(List<? extends T> source) {
            List<List<Object>> rows = new ArrayList<>();
            List<Boolean> flags = new ArrayList<>();
            for (T row : source) {
                List<Object> cells = new ArrayList<>();
                for (Function<? super T, ?> value : values) {
                    cells.add(value.apply(row));
                }
                rows.add(cells);
                flags.add(cancelled.test(row));
            }
            return new ExportTable(title, List.copyOf(details), List.copyOf(columns), rows, flags, numbered);
        }
    }
}
