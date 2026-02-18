package com.SaatSaheli.spring.repository;

import com.SaatSaheli.spring.model.ChatMessage;
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
import java.util.stream.Collectors;

@Repository
public class ChatMessageRepository {

    private static final String SHEET_NAME = "ChatMessages";
    private static final String RANGE = SHEET_NAME + "!A2:G";

    @Autowired
    private Sheets sheetsService;

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    public List<ChatMessage> findAll() throws IOException {
        ValueRange response = sheetsService.spreadsheets().values()
                .get(spreadsheetId, RANGE).execute();
        List<List<Object>> values = response.getValues();
        List<ChatMessage> messages = new ArrayList<>();
        if (values == null) return messages;
        for (List<Object> row : values) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().isEmpty()) continue;
            messages.add(rowToMessage(row));
        }
        return messages;
    }

    public Optional<ChatMessage> findById(Long id) throws IOException {
        return findAll().stream().filter(m -> m.getId().equals(id)).findFirst();
    }

    public List<ChatMessage> findByRoomId(Long roomId) throws IOException {
        return findAll().stream()
                .filter(m -> roomId.equals(m.getRoomId()))
                .collect(Collectors.toList());
    }

    /** Efficient polling: get messages in a room with id > afterId */
    public List<ChatMessage> findByRoomIdAfter(Long roomId, Long afterId) throws IOException {
        return findAll().stream()
                .filter(m -> roomId.equals(m.getRoomId()))
                .filter(m -> afterId == null || m.getId() > afterId)
                .collect(Collectors.toList());
    }

    public ChatMessage save(ChatMessage msg) throws IOException {
        if (msg.getId() == null) {
            msg.setId(nextId());
            ValueRange body = new ValueRange().setValues(List.of(messageToRow(msg)));
            sheetsService.spreadsheets().values()
                    .append(spreadsheetId, RANGE, body)
                    .setValueInputOption("RAW").execute();
        } else {
            int rowIndex = findRowIndex(msg.getId());
            if (rowIndex == -1) throw new RuntimeException("Message not found with id: " + msg.getId());
            String updateRange = SHEET_NAME + "!A" + rowIndex + ":G" + rowIndex;
            ValueRange body = new ValueRange().setValues(List.of(messageToRow(msg)));
            sheetsService.spreadsheets().values()
                    .update(spreadsheetId, updateRange, body)
                    .setValueInputOption("RAW").execute();
        }
        return msg;
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

    private ChatMessage rowToMessage(List<Object> row) {
        ChatMessage m = new ChatMessage();
        m.setId(Long.parseLong(row.get(0).toString()));
        if (row.size() > 1 && row.get(1) != null && !row.get(1).toString().isEmpty())
            m.setRoomId(Long.parseLong(row.get(1).toString()));
        if (row.size() > 2 && row.get(2) != null && !row.get(2).toString().isEmpty())
            m.setSenderId(Long.parseLong(row.get(2).toString()));
        if (row.size() > 3 && row.get(3) != null) m.setSenderName(row.get(3).toString());
        if (row.size() > 4 && row.get(4) != null) m.setMessage(row.get(4).toString());
        if (row.size() > 5 && row.get(5) != null) m.setCreatedDate(row.get(5).toString());
        if (row.size() > 6 && row.get(6) != null)
            m.setIsDeleted("true".equalsIgnoreCase(row.get(6).toString()) || "TRUE".equals(row.get(6).toString()));
        return m;
    }

    private List<Object> messageToRow(ChatMessage m) {
        return Arrays.asList(
                m.getId(),
                m.getRoomId(),
                m.getSenderId(),
                m.getSenderName() != null ? m.getSenderName() : "",
                m.getMessage() != null ? m.getMessage() : "",
                m.getCreatedDate() != null ? m.getCreatedDate() : "",
                m.getIsDeleted() ? "TRUE" : "FALSE"
        );
    }
}
