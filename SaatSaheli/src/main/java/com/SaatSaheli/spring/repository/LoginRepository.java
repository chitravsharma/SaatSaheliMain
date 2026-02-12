package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.Login;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.model.ClearValuesRequest;
import com.google.api.services.sheets.v4.model.ValueRange;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Repository
public class LoginRepository {

    private static final String SHEET_NAME = "Logins";
    private static final String RANGE = SHEET_NAME + "!A2:H";

    @Autowired
    private Sheets sheetsService;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    public List<Login> findAll() throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, RANGE).execute();
        List<List<Object>> values = response.getValues();
        List<Login> logins = new ArrayList<>();
        if (values == null) return logins;
        for (List<Object> row : values) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().isEmpty()) continue;
            logins.add(rowToLogin(row));
        }
        return logins;
    }

    public Optional<Login> findById(Long id) throws IOException {
        return findAll().stream().filter(l -> l.getId().equals(id)).findFirst();
    }

    public Optional<Login> findByEmail(String email) throws IOException {
        return findAll().stream().filter(l -> email.equalsIgnoreCase(l.getEmail())).findFirst();
    }

    public Optional<Login> findByUserId(Long userId) throws IOException {
        return findAll().stream().filter(l -> userId.equals(l.getUserId())).findFirst();
    }

    public Login save(Login login) throws IOException {
        if (login.getId() == null) {
            login.setId(nextId());
            ValueRange body = new ValueRange().setValues(List.of(loginToRow(login)));
            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, RANGE, body)
                    .setValueInputOption("RAW").execute();
        } else {
            int rowIndex = findRowIndex(login.getId());
            if (rowIndex == -1) throw new RuntimeException("Login not found with id: " + login.getId());
            String updateRange = SHEET_NAME + "!A" + rowIndex + ":H" + rowIndex;
            ValueRange body = new ValueRange().setValues(List.of(loginToRow(login)));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, updateRange, body)
                    .setValueInputOption("RAW").execute();
        }
        return login;
    }

    public void deleteById(Long id) throws IOException {
        int rowIndex = findRowIndex(id);
        if (rowIndex == -1) return;
        String clearRange = SHEET_NAME + "!A" + rowIndex + ":H" + rowIndex;
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
            if (!row.isEmpty() && row.get(0) != null && !row.get(0).toString().isEmpty()) {
                long val = Long.parseLong(row.get(0).toString());
                if (val > max) max = val;
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
            if (!row.isEmpty() && row.get(0) != null && Long.parseLong(row.get(0).toString()) == id)
                return i + 2;
        }
        return -1;
    }

    private Login rowToLogin(List<Object> row) {
        Login l = new Login();
        l.setId(Long.parseLong(row.get(0).toString()));
        if (row.size() > 1 && row.get(1) != null && !row.get(1).toString().isEmpty())
            l.setUserId(Long.parseLong(row.get(1).toString()));
        if (row.size() > 2 && row.get(2) != null) l.setEmail(row.get(2).toString());
        if (row.size() > 3 && row.get(3) != null) l.setPassword(row.get(3).toString());
        if (row.size() > 4 && row.get(4) != null) l.setStatus(row.get(4).toString());
        if (row.size() > 5 && row.get(5) != null) l.setAccountCreatedDate(row.get(5).toString());
        if (row.size() > 6 && row.get(6) != null) l.setLastLoginDate(row.get(6).toString());
        if (row.size() > 7 && row.get(7) != null) l.setProvider(row.get(7).toString());
        return l;
    }

    private List<Object> loginToRow(Login l) {
        return Arrays.asList(
                l.getId(),
                l.getUserId(),
                l.getEmail() != null ? l.getEmail() : "",
                l.getPassword() != null ? l.getPassword() : "",
                l.getStatus() != null ? l.getStatus() : "ACTIVE",
                l.getAccountCreatedDate() != null ? l.getAccountCreatedDate() : "",
                l.getLastLoginDate() != null ? l.getLastLoginDate() : "",
                l.getProvider() != null ? l.getProvider() : "email"
        );
    }
}
