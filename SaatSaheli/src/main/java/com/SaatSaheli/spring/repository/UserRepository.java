package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.User;
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
public class UserRepository {

    private static final String SHEET_NAME = "Users";
    private static final String RANGE = SHEET_NAME + "!A2:K";

    @Autowired
    private Sheets sheetsService;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    public List<User> findAll() throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, RANGE).execute();
        List<List<Object>> values = response.getValues();
        List<User> users = new ArrayList<>();
        if (values == null) return users;
        for (List<Object> row : values) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().isEmpty()) continue;
            users.add(rowToUser(row));
        }
        return users;
    }

    public Optional<User> findById(Long id) throws IOException {
        return findAll().stream().filter(u -> u.getId().equals(id)).findFirst();
    }

    public Optional<User> findByEmail(String email) throws IOException {
        return findAll().stream().filter(u -> email.equalsIgnoreCase(u.getEmail())).findFirst();
    }

    public User save(User user) throws IOException {
        if (user.getId() == null) {
            user.setId(nextId());
            ValueRange body = new ValueRange().setValues(List.of(userToRow(user)));
            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, RANGE, body)
                    .setValueInputOption("RAW").execute();
        } else {
            int rowIndex = findRowIndex(user.getId());
            if (rowIndex == -1) throw new RuntimeException("User not found with id: " + user.getId());
            String updateRange = SHEET_NAME + "!A" + rowIndex + ":K" + rowIndex;
            ValueRange body = new ValueRange().setValues(List.of(userToRow(user)));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, updateRange, body)
                    .setValueInputOption("RAW").execute();
        }
        return user;
    }

    public void deleteById(Long id) throws IOException {
        int rowIndex = findRowIndex(id);
        if (rowIndex == -1) return;
        String clearRange = SHEET_NAME + "!A" + rowIndex + ":K" + rowIndex;
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

    private User rowToUser(List<Object> row) {
        User u = new User();
        u.setId(Long.parseLong(row.get(0).toString()));
        if (row.size() > 1 && row.get(1) != null) u.setFirstName(row.get(1).toString());
        if (row.size() > 2 && row.get(2) != null) u.setMiddleName(row.get(2).toString());
        if (row.size() > 3 && row.get(3) != null) u.setLastName(row.get(3).toString());
        if (row.size() > 4 && row.get(4) != null) u.setPhoneNumber(row.get(4).toString());
        if (row.size() > 5 && row.get(5) != null) u.setEmail(row.get(5).toString());
        if (row.size() > 6 && row.get(6) != null && !row.get(6).toString().isEmpty())
            u.setAge(Integer.parseInt(row.get(6).toString()));
        if (row.size() > 7 && row.get(7) != null) u.setGender(row.get(7).toString());
        if (row.size() > 8 && row.get(8) != null) u.setRole(row.get(8).toString());
        if (row.size() > 9 && row.get(9) != null) u.setCreatedDate(row.get(9).toString());
        if (row.size() > 10 && row.get(10) != null) u.setModifiedDate(row.get(10).toString());
        return u;
    }

    private List<Object> userToRow(User u) {
        return Arrays.asList(
                u.getId(),
                u.getFirstName() != null ? u.getFirstName() : "",
                u.getMiddleName() != null ? u.getMiddleName() : "",
                u.getLastName() != null ? u.getLastName() : "",
                u.getPhoneNumber() != null ? u.getPhoneNumber() : "",
                u.getEmail() != null ? u.getEmail() : "",
                u.getAge() != null ? u.getAge() : "",
                u.getGender() != null ? u.getGender() : "",
                u.getRole() != null ? u.getRole() : "USER",
                u.getCreatedDate() != null ? u.getCreatedDate() : "",
                u.getModifiedDate() != null ? u.getModifiedDate() : ""
        );
    }
}
