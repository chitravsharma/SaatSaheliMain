package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Book;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.AppendDimensionRequest;
import com.google.api.services.sheets.v4.model.BatchUpdateSpreadsheetRequest;
import com.google.api.services.sheets.v4.model.ClearValuesRequest;
import com.google.api.services.sheets.v4.model.Request;
import com.google.api.services.sheets.v4.model.Sheet;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.ValueRange;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class BookRepository {

    private static final Logger log = LoggerFactory.getLogger(BookRepository.class);
    private static final String SHEET_NAME = "Books";

    @Autowired
    private Sheets sheetsService;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    private static final int MIN_SHEET_ROWS = 1000;

    private boolean headersVerified = false;

    private void ensureHeaders() throws IOException {
        if (headersVerified) return;
        try {
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, SHEET_NAME + "!A1:G1").execute();
            List<List<Object>> values = response.getValues();
            if (values == null || values.isEmpty() || values.get(0).isEmpty()
                    || !"id".equalsIgnoreCase(values.get(0).get(0).toString().trim())) {
                writeHeaders();
            }
        } catch (Exception e) {
            writeHeaders();
        }
        ensureSheetCapacity();
        headersVerified = true;
    }

    private void ensureSheetCapacity() {
        try {
            Spreadsheet spreadsheet = sheetsService.spreadsheets()
                    .get(spreadsheetId).execute();
            for (Sheet sheet : spreadsheet.getSheets()) {
                if (SHEET_NAME.equals(sheet.getProperties().getTitle())) {
                    int currentRows = sheet.getProperties().getGridProperties().getRowCount();
                    log.info("Books sheet current capacity: {} rows", currentRows);
                    if (currentRows < MIN_SHEET_ROWS) {
                        int rowsToAdd = MIN_SHEET_ROWS - currentRows;
                        AppendDimensionRequest appendDimension = new AppendDimensionRequest()
                                .setSheetId(sheet.getProperties().getSheetId())
                                .setDimension("ROWS")
                                .setLength(rowsToAdd);
                        BatchUpdateSpreadsheetRequest batchRequest = new BatchUpdateSpreadsheetRequest()
                                .setRequests(List.of(new Request().setAppendDimension(appendDimension)));
                        sheetsService.spreadsheets().batchUpdate(spreadsheetId, batchRequest).execute();
                        log.info("Expanded Books sheet from {} to {} rows", currentRows, MIN_SHEET_ROWS);
                    }
                    break;
                }
            }
        } catch (Exception e) {
            log.warn("Could not ensure sheet capacity: {}", e.getMessage());
        }
    }

    private void writeHeaders() throws IOException {
        ValueRange headerBody = new ValueRange().setValues(List.of(
                Arrays.asList("id", "title", "userId", "status", "createdDate", "modifiedDate", "category")));
        sheetsService.spreadsheets().values()
                .update(spreadsheetId, SHEET_NAME + "!A1:G1", headerBody)
                .setValueInputOption("RAW").execute();
    }

    public List<Book> findAll() throws IOException {
        ensureHeaders();
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, SHEET_NAME + "!A2:G").execute();
        List<List<Object>> values = response.getValues();
        List<Book> books = new ArrayList<>();
        if (values == null) {
            log.warn("Books sheet returned null values");
            return books;
        }
        log.info("Books sheet returned {} rows", values.size());
        for (int i = 0; i < values.size(); i++) {
            List<Object> row = values.get(i);
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            try {
                books.add(rowToBook(row));
            } catch (Exception e) {
                log.warn("Skipping malformed row {} (sheet row {}): {} - error: {}", i, i + 2, row, e.getMessage());
            }
        }
        log.info("Parsed {} books from sheet", books.size());
        return books;
    }

    public Optional<Book> findById(Long id) throws IOException {
        return findAll().stream().filter(b -> b.getId().equals(id)).findFirst();
    }

    public List<Book> findByUserId(Long userId) throws IOException {
        return findAll().stream().filter(b -> userId.equals(b.getUserId())).collect(Collectors.toList());
    }

    public List<Book> findByUserIdAndStatus(Long userId, String status) throws IOException {
        return findAll().stream()
                .filter(b -> userId.equals(b.getUserId()) && status.equalsIgnoreCase(b.getStatus()))
                .collect(Collectors.toList());
    }

    public Book save(Book book) throws IOException {
        ensureHeaders();
        if (book.getId() == null) {
            book.setId(nextId());
            ValueRange body = new ValueRange().setValues(List.of(bookToRow(book)));
            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, SHEET_NAME + "!A1:F", body)
                    .setValueInputOption("RAW").execute();
        } else {
            int rowIndex = findRowIndex(book.getId());
            if (rowIndex == -1) throw new RuntimeException("Book not found with id: " + book.getId());
            String updateRange = SHEET_NAME + "!A" + rowIndex + ":G" + rowIndex;
            ValueRange body = new ValueRange().setValues(List.of(bookToRow(book)));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, updateRange, body)
                    .setValueInputOption("RAW").execute();
        }
        return book;
    }

    public Book saveWithId(Book book) throws IOException {
        ensureHeaders();
        ValueRange body = new ValueRange().setValues(List.of(bookToRow(book)));
        sheetsService.spreadsheets().values()
                .append(spreadsheetId, SHEET_NAME + "!A1:F", body)
                .setValueInputOption("RAW").execute();
        log.info("Saved book with explicit id={}", book.getId());
        return book;
    }

    public void deleteById(Long id) throws IOException {
        int rowIndex = findRowIndex(id);
        if (rowIndex == -1) return;
        String clearRange = SHEET_NAME + "!A" + rowIndex + ":G" + rowIndex;
        sheetsService.spreadsheets().values()
                .clear(spreadsheetId, clearRange, new ClearValuesRequest()).execute();
    }

    private Long nextId() throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, SHEET_NAME + "!A2:A").execute();
        List<List<Object>> values = response.getValues();
        if (values == null || values.isEmpty()) return 1L;
        long max = 0;
        for (List<Object> row : values) {
            if (!row.isEmpty() && row.get(0) != null && !row.get(0).toString().trim().isEmpty()) {
                try {
                    long val = Long.parseLong(row.get(0).toString().trim());
                    if (val > max) max = val;
                } catch (NumberFormatException e) { /* skip */ }
            }
        }
        return max + 1;
    }

    private int findRowIndex(Long id) throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, SHEET_NAME + "!A2:A").execute();
        List<List<Object>> values = response.getValues();
        if (values == null) return -1;
        for (int i = 0; i < values.size(); i++) {
            List<Object> row = values.get(i);
            if (!row.isEmpty() && row.get(0) != null) {
                try {
                    if (Long.parseLong(row.get(0).toString().trim()) == id) return i + 2;
                } catch (NumberFormatException e) { /* skip */ }
            }
        }
        return -1;
    }

    // Fixed column order: id(A), title(B), userId(C), status(D), createdDate(E), modifiedDate(F)
    private Book rowToBook(List<Object> row) {
        Book b = new Book();
        b.setId(Long.parseLong(row.get(0).toString().trim()));
        if (row.size() > 1 && row.get(1) != null) b.setTitle(row.get(1).toString());
        if (row.size() > 2 && row.get(2) != null && !row.get(2).toString().trim().isEmpty()) {
            try { b.setUserId(Long.parseLong(row.get(2).toString().trim())); } catch (NumberFormatException e) {}
        }
        if (row.size() > 3 && row.get(3) != null) b.setStatus(row.get(3).toString());
        if (row.size() > 4 && row.get(4) != null) b.setCreatedDate(row.get(4).toString());
        if (row.size() > 5 && row.get(5) != null) b.setModifiedDate(row.get(5).toString());
        if (row.size() > 6 && row.get(6) != null) b.setCategory(row.get(6).toString());
        return b;
    }

    private List<Object> bookToRow(Book b) {
        return Arrays.asList(
                b.getId(),
                b.getTitle() != null ? b.getTitle() : "",
                b.getUserId() != null ? b.getUserId() : "",
                b.getStatus() != null ? b.getStatus() : "DRAFT",
                b.getCreatedDate() != null ? b.getCreatedDate() : "",
                b.getModifiedDate() != null ? b.getModifiedDate() : "",
                b.getCategory() != null ? b.getCategory() : ""
        );
    }
}
