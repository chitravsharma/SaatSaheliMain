package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Page;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ClearValuesRequest;
import com.google.api.services.sheets.v4.model.ValueRange;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class PageRepository {

    private static final String SHEET_NAME = "Pages";

    @Autowired
    private Sheets sheetsService;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    private boolean headersVerified = false;

    private void ensureHeaders() throws IOException {
        if (headersVerified) return;
        try {
            ValueRange response = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, SHEET_NAME + "!A1:I1").execute();
            List<List<Object>> values = response.getValues();
            if (values == null || values.isEmpty() || values.get(0).isEmpty()
                    || !"id".equalsIgnoreCase(values.get(0).get(0).toString().trim())) {
                writeHeaders();
            }
        } catch (Exception e) {
            writeHeaders();
        }
        headersVerified = true;
    }

    private void writeHeaders() throws IOException {
        ValueRange headerBody = new ValueRange().setValues(List.of(
                Arrays.asList("id", "bookId", "pageNumber", "content", "imageUrl", "imageUrl2", "format", "createdDate", "modifiedDate")));
        sheetsService.spreadsheets().values()
                .update(spreadsheetId, SHEET_NAME + "!A1:I1", headerBody)
                .setValueInputOption("RAW").execute();
    }

    public List<Page> findAll() throws IOException {
        ensureHeaders();
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, SHEET_NAME + "!A2:I").execute();
        List<List<Object>> values = response.getValues();
        List<Page> pages = new ArrayList<>();
        if (values == null) return pages;
        for (List<Object> row : values) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            try {
                pages.add(rowToPage(row));
            } catch (Exception e) {
                // skip malformed rows
            }
        }
        return pages;
    }

    public Optional<Page> findById(Long id) throws IOException {
        return findAll().stream().filter(p -> p.getId().equals(id)).findFirst();
    }

    public List<Page> findByBookIdOrderByPageNumberAsc(Long bookId) throws IOException {
        return findAll().stream()
                .filter(p -> bookId.equals(p.getBookId()))
                .sorted(Comparator.comparingInt(Page::getPageNumber))
                .collect(Collectors.toList());
    }

    public Page save(Page page) throws IOException {
        ensureHeaders();
        if (page.getId() == null) {
            page.setId(nextId());
            ValueRange body = new ValueRange().setValues(List.of(pageToRow(page)));
            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, SHEET_NAME + "!A1:I", body)
                    .setValueInputOption("RAW").execute();
        } else {
            int rowIndex = findRowIndex(page.getId());
            if (rowIndex == -1) throw new RuntimeException("Page not found with id: " + page.getId());
            String updateRange = SHEET_NAME + "!A" + rowIndex + ":I" + rowIndex;
            ValueRange body = new ValueRange().setValues(List.of(pageToRow(page)));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, updateRange, body)
                    .setValueInputOption("RAW").execute();
        }
        return page;
    }

    public void deleteById(Long id) throws IOException {
        int rowIndex = findRowIndex(id);
        if (rowIndex == -1) return;
        String clearRange = SHEET_NAME + "!A" + rowIndex + ":I" + rowIndex;
        sheetsService.spreadsheets().values()
                .clear(spreadsheetId, clearRange, new ClearValuesRequest()).execute();
    }

    public void deleteByBookId(Long bookId) throws IOException {
        List<Page> pages = findByBookIdOrderByPageNumberAsc(bookId);
        for (Page page : pages) {
            deleteById(page.getId());
        }
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

    // Fixed column order: id(A), bookId(B), pageNumber(C), content(D), imageUrl(E), imageUrl2(F), format(G), createdDate(H), modifiedDate(I)
    private Page rowToPage(List<Object> row) {
        Page p = new Page();
        p.setId(Long.parseLong(row.get(0).toString().trim()));
        if (row.size() > 1 && row.get(1) != null && !row.get(1).toString().trim().isEmpty()) {
            try { p.setBookId(Long.parseLong(row.get(1).toString().trim())); } catch (NumberFormatException e) {}
        }
        if (row.size() > 2 && row.get(2) != null && !row.get(2).toString().trim().isEmpty()) {
            try { p.setPageNumber(Integer.parseInt(row.get(2).toString().trim())); } catch (NumberFormatException e) {}
        }
        if (row.size() > 3 && row.get(3) != null) p.setContent(row.get(3).toString());
        if (row.size() > 4 && row.get(4) != null) p.setImageUrl(row.get(4).toString());
        if (row.size() > 5 && row.get(5) != null) p.setImageUrl2(row.get(5).toString());
        if (row.size() > 6 && row.get(6) != null) p.setFormat(row.get(6).toString());
        if (row.size() > 7 && row.get(7) != null) p.setCreatedDate(row.get(7).toString());
        if (row.size() > 8 && row.get(8) != null) p.setModifiedDate(row.get(8).toString());
        return p;
    }

    private List<Object> pageToRow(Page p) {
        return Arrays.asList(
                p.getId(),
                p.getBookId() != null ? p.getBookId() : "",
                p.getPageNumber(),
                p.getContent() != null ? p.getContent() : "",
                p.getImageUrl() != null ? p.getImageUrl() : "",
                p.getImageUrl2() != null ? p.getImageUrl2() : "",
                p.getFormat() != null ? p.getFormat() : "",
                p.getCreatedDate() != null ? p.getCreatedDate() : "",
                p.getModifiedDate() != null ? p.getModifiedDate() : ""
        );
    }
}
