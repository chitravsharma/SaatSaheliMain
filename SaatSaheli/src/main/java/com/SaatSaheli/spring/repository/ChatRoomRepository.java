package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.ChatRoom;
import com.google.api.services.sheets.v4.Sheets;
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
public class ChatRoomRepository {

    private static final String SHEET_NAME = "ChatRooms";
    private static final String RANGE = SHEET_NAME + "!A2:F";

    @Autowired
    private Sheets sheetsService;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    public List<ChatRoom> findAll() throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, RANGE).execute();
        List<List<Object>> values = response.getValues();
        List<ChatRoom> rooms = new ArrayList<>();
        if (values == null) return rooms;
        for (List<Object> row : values) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().isEmpty()) continue;
            rooms.add(rowToRoom(row));
        }
        return rooms;
    }

    public Optional<ChatRoom> findById(Long id) throws IOException {
        return findAll().stream().filter(r -> r.getId().equals(id)).findFirst();
    }

    public ChatRoom save(ChatRoom room) throws IOException {
        if (room.getId() == null) {
            room.setId(nextId());
            ValueRange body = new ValueRange().setValues(List.of(roomToRow(room)));
            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, RANGE, body)
                    .setValueInputOption("RAW").execute();
        } else {
            int rowIndex = findRowIndex(room.getId());
            if (rowIndex == -1) {
                // New room with explicit ID — append
                ValueRange body = new ValueRange().setValues(List.of(roomToRow(room)));
                sheetsService.spreadsheets().values()
                        .append(spreadsheetId, RANGE, body)
                        .setValueInputOption("RAW").execute();
            } else {
                String updateRange = SHEET_NAME + "!A" + rowIndex + ":F" + rowIndex;
                ValueRange body = new ValueRange().setValues(List.of(roomToRow(room)));
                sheetsService.spreadsheets().values()
                        .update(spreadsheetId, updateRange, body)
                        .setValueInputOption("RAW").execute();
            }
        }
        return room;
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

    private ChatRoom rowToRoom(List<Object> row) {
        ChatRoom r = new ChatRoom();
        r.setId(Long.parseLong(row.get(0).toString()));
        if (row.size() > 1 && row.get(1) != null) r.setName(row.get(1).toString());
        if (row.size() > 2 && row.get(2) != null) r.setCategory(row.get(2).toString());
        if (row.size() > 3 && row.get(3) != null) r.setDescription(row.get(3).toString());
        if (row.size() > 4 && row.get(4) != null) r.setCreatedDate(row.get(4).toString());
        if (row.size() > 5 && row.get(5) != null) r.setModifiedDate(row.get(5).toString());
        return r;
    }

    private List<Object> roomToRow(ChatRoom r) {
        return Arrays.asList(
                r.getId(),
                r.getName() != null ? r.getName() : "",
                r.getCategory() != null ? r.getCategory() : "",
                r.getDescription() != null ? r.getDescription() : "",
                r.getCreatedDate() != null ? r.getCreatedDate() : "",
                r.getModifiedDate() != null ? r.getModifiedDate() : ""
        );
    }
}
