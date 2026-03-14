package com.SaatSaheli.spring.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileInputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * One-time data migration from Google Sheets to PostgreSQL.
 * Run with: ./mvnw spring-boot:run -Dspring-boot.run.profiles=migrate
 *
 * After successful migration, remove this file.
 */
@Component
@Profile("migrate")
public class DataMigrationRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataMigrationRunner.class);
    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Value("${google.sheets.credentials-file}")
    private String credentialsFilePath;

    @Value("${GOOGLE_SHEETS_SPREADSHEET_ID:}")
    private String spreadsheetId;

    @PersistenceContext
    private EntityManager em;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (spreadsheetId == null || spreadsheetId.isEmpty()) {
            log.error("GOOGLE_SHEETS_SPREADSHEET_ID env variable is required for migration");
            return;
        }

        log.info("=== Starting Data Migration from Google Sheets to PostgreSQL ===");

        Sheets sheetsService = buildSheetsService();

        migrateUsers(sheetsService);
        migrateLogins(sheetsService);
        migrateBooks(sheetsService);
        migratePages(sheetsService);
        migrateChatRooms(sheetsService);
        migrateChatMessages(sheetsService);

        // Reset sequences
        resetSequences();

        log.info("=== Data Migration Complete ===");
    }

    private Sheets buildSheetsService() throws Exception {
        GoogleCredentials credentials = GoogleCredentials
                .fromStream(new FileInputStream(credentialsFilePath))
                .createScoped(List.of(SheetsScopes.SPREADSHEETS_READONLY));

        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("SaatSaheli-Migration")
                .build();
    }

    private void migrateUsers(Sheets sheets) throws Exception {
        log.info("Migrating Users...");
        ValueRange response = sheets.spreadsheets().values()
                .get(spreadsheetId, "Users!A2:K").execute();
        List<List<Object>> rows = response.getValues();
        if (rows == null || rows.isEmpty()) {
            log.info("No users to migrate");
            return;
        }

        int count = 0;
        for (List<Object> row : rows) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            Long id = Long.parseLong(row.get(0).toString().trim());
            String firstName = getStr(row, 1);
            String middleName = getStr(row, 2);
            String lastName = getStr(row, 3);
            String phoneNumber = getStr(row, 4);
            String email = getStr(row, 5);
            Integer age = getInt(row, 6);
            String gender = getStr(row, 7);
            String role = getStr(row, 8);
            if (role.isEmpty()) role = "USER";
            LocalDateTime createdDate = parseDate(getStr(row, 9));
            LocalDateTime modifiedDate = parseDate(getStr(row, 10));

            em.createNativeQuery("INSERT INTO users (id, first_name, middle_name, last_name, phone_number, email, age, gender, role, created_date, modified_date) " +
                            "VALUES (:id, :firstName, :middleName, :lastName, :phoneNumber, :email, :age, :gender, :role, :createdDate, :modifiedDate)")
                    .setParameter("id", id)
                    .setParameter("firstName", firstName.isEmpty() ? null : firstName)
                    .setParameter("middleName", middleName.isEmpty() ? null : middleName)
                    .setParameter("lastName", lastName.isEmpty() ? null : lastName)
                    .setParameter("phoneNumber", phoneNumber.isEmpty() ? null : phoneNumber)
                    .setParameter("email", email.isEmpty() ? null : email)
                    .setParameter("age", age)
                    .setParameter("gender", gender.isEmpty() ? null : gender)
                    .setParameter("role", role)
                    .setParameter("createdDate", createdDate)
                    .setParameter("modifiedDate", modifiedDate)
                    .executeUpdate();
            count++;
        }
        log.info("Migrated {} users", count);
    }

    private void migrateLogins(Sheets sheets) throws Exception {
        log.info("Migrating Logins...");
        ValueRange response = sheets.spreadsheets().values()
                .get(spreadsheetId, "Logins!A2:H").execute();
        List<List<Object>> rows = response.getValues();
        if (rows == null || rows.isEmpty()) {
            log.info("No logins to migrate");
            return;
        }

        int count = 0;
        for (List<Object> row : rows) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            Long id = Long.parseLong(row.get(0).toString().trim());
            Long userId = getLong(row, 1);
            String email = getStr(row, 2);
            String password = getStr(row, 3);
            String status = getStr(row, 4);
            if (status.isEmpty()) status = "ACTIVE";
            LocalDateTime accountCreatedDate = parseDate(getStr(row, 5));
            LocalDateTime lastLoginDate = parseDate(getStr(row, 6));
            String provider = getStr(row, 7);
            if (provider.isEmpty()) provider = "email";

            em.createNativeQuery("INSERT INTO logins (id, user_id, email, password, status, account_created_date, last_login_date, provider) " +
                            "VALUES (:id, :userId, :email, :password, :status, :accountCreatedDate, :lastLoginDate, :provider)")
                    .setParameter("id", id)
                    .setParameter("userId", userId)
                    .setParameter("email", email.isEmpty() ? null : email)
                    .setParameter("password", password.isEmpty() ? null : password)
                    .setParameter("status", status)
                    .setParameter("accountCreatedDate", accountCreatedDate)
                    .setParameter("lastLoginDate", lastLoginDate)
                    .setParameter("provider", provider)
                    .executeUpdate();
            count++;
        }
        log.info("Migrated {} logins", count);
    }

    private void migrateBooks(Sheets sheets) throws Exception {
        log.info("Migrating Books...");
        ValueRange response = sheets.spreadsheets().values()
                .get(spreadsheetId, "Books!A2:G").execute();
        List<List<Object>> rows = response.getValues();
        if (rows == null || rows.isEmpty()) {
            log.info("No books to migrate");
            return;
        }

        int count = 0;
        for (List<Object> row : rows) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            Long id = Long.parseLong(row.get(0).toString().trim());
            String title = getStr(row, 1);
            Long userId = getLong(row, 2);
            String status = getStr(row, 3);
            if (status.isEmpty()) status = "DRAFT";
            LocalDateTime createdDate = parseDate(getStr(row, 4));
            LocalDateTime modifiedDate = parseDate(getStr(row, 5));
            String category = getStr(row, 6);

            em.createNativeQuery("INSERT INTO books (id, title, user_id, status, created_date, modified_date, category) " +
                            "VALUES (:id, :title, :userId, :status, :createdDate, :modifiedDate, :category)")
                    .setParameter("id", id)
                    .setParameter("title", title.isEmpty() ? null : title)
                    .setParameter("userId", userId)
                    .setParameter("status", status)
                    .setParameter("createdDate", createdDate)
                    .setParameter("modifiedDate", modifiedDate)
                    .setParameter("category", category.isEmpty() ? null : category)
                    .executeUpdate();
            count++;
        }
        log.info("Migrated {} books", count);
    }

    private void migratePages(Sheets sheets) throws Exception {
        log.info("Migrating Pages...");
        ValueRange response = sheets.spreadsheets().values()
                .get(spreadsheetId, "Pages!A2:I").execute();
        List<List<Object>> rows = response.getValues();
        if (rows == null || rows.isEmpty()) {
            log.info("No pages to migrate");
            return;
        }

        int count = 0;
        for (List<Object> row : rows) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            Long id = Long.parseLong(row.get(0).toString().trim());
            Long bookId = getLong(row, 1);
            Integer pageNumber = getInt(row, 2);
            String content = getStr(row, 3);
            String imageUrl = getStr(row, 4);
            String imageUrl2 = getStr(row, 5);
            String format = getStr(row, 6);
            LocalDateTime createdDate = parseDate(getStr(row, 7));
            LocalDateTime modifiedDate = parseDate(getStr(row, 8));

            em.createNativeQuery("INSERT INTO pages (id, book_id, page_number, content, image_url, image_url_2, format, created_date, modified_date) " +
                            "VALUES (:id, :bookId, :pageNumber, :content, :imageUrl, :imageUrl2, :format, :createdDate, :modifiedDate)")
                    .setParameter("id", id)
                    .setParameter("bookId", bookId)
                    .setParameter("pageNumber", pageNumber != null ? pageNumber : 0)
                    .setParameter("content", content.isEmpty() ? null : content)
                    .setParameter("imageUrl", imageUrl.isEmpty() ? null : imageUrl)
                    .setParameter("imageUrl2", imageUrl2.isEmpty() ? null : imageUrl2)
                    .setParameter("format", format.isEmpty() ? null : format)
                    .setParameter("createdDate", createdDate)
                    .setParameter("modifiedDate", modifiedDate)
                    .executeUpdate();
            count++;
        }
        log.info("Migrated {} pages", count);
    }

    private void migrateChatRooms(Sheets sheets) throws Exception {
        log.info("Migrating ChatRooms...");
        ValueRange response = sheets.spreadsheets().values()
                .get(spreadsheetId, "ChatRooms!A2:F").execute();
        List<List<Object>> rows = response.getValues();
        if (rows == null || rows.isEmpty()) {
            log.info("No chat rooms to migrate");
            return;
        }

        int count = 0;
        for (List<Object> row : rows) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            Long id = Long.parseLong(row.get(0).toString().trim());
            String name = getStr(row, 1);
            String category = getStr(row, 2);
            String description = getStr(row, 3);
            LocalDateTime createdDate = parseDate(getStr(row, 4));
            LocalDateTime modifiedDate = parseDate(getStr(row, 5));

            em.createNativeQuery("INSERT INTO chat_rooms (id, name, category, description, created_date, modified_date) " +
                            "VALUES (:id, :name, :category, :description, :createdDate, :modifiedDate)")
                    .setParameter("id", id)
                    .setParameter("name", name.isEmpty() ? null : name)
                    .setParameter("category", category.isEmpty() ? null : category)
                    .setParameter("description", description.isEmpty() ? null : description)
                    .setParameter("createdDate", createdDate)
                    .setParameter("modifiedDate", modifiedDate)
                    .executeUpdate();
            count++;
        }
        log.info("Migrated {} chat rooms", count);
    }

    private void migrateChatMessages(Sheets sheets) throws Exception {
        log.info("Migrating ChatMessages...");
        ValueRange response = sheets.spreadsheets().values()
                .get(spreadsheetId, "ChatMessages!A2:G").execute();
        List<List<Object>> rows = response.getValues();
        if (rows == null || rows.isEmpty()) {
            log.info("No chat messages to migrate");
            return;
        }

        int count = 0;
        for (List<Object> row : rows) {
            if (row.isEmpty() || row.get(0) == null || row.get(0).toString().trim().isEmpty()) continue;
            Long id = Long.parseLong(row.get(0).toString().trim());
            Long roomId = getLong(row, 1);
            Long senderId = getLong(row, 2);
            String senderName = getStr(row, 3);
            String message = getStr(row, 4);
            LocalDateTime createdDate = parseDate(getStr(row, 5));
            boolean isDeleted = row.size() > 6 && row.get(6) != null &&
                    ("true".equalsIgnoreCase(row.get(6).toString()) || "TRUE".equals(row.get(6).toString()));

            em.createNativeQuery("INSERT INTO chat_messages (id, room_id, sender_id, sender_name, message, created_date, is_deleted) " +
                            "VALUES (:id, :roomId, :senderId, :senderName, :message, :createdDate, :isDeleted)")
                    .setParameter("id", id)
                    .setParameter("roomId", roomId)
                    .setParameter("senderId", senderId)
                    .setParameter("senderName", senderName.isEmpty() ? null : senderName)
                    .setParameter("message", message.isEmpty() ? null : message)
                    .setParameter("createdDate", createdDate)
                    .setParameter("isDeleted", isDeleted)
                    .executeUpdate();
            count++;
        }
        log.info("Migrated {} chat messages", count);
    }

    private void resetSequences() {
        log.info("Resetting PostgreSQL sequences...");
        String[] tables = {"users", "logins", "books", "pages", "chat_rooms", "chat_messages"};
        for (String table : tables) {
            try {
                em.createNativeQuery("SELECT setval('" + table + "_id_seq', COALESCE((SELECT MAX(id) FROM " + table + "), 0))")
                        .getSingleResult();
                log.info("Reset sequence for {}", table);
            } catch (Exception e) {
                log.warn("Could not reset sequence for {}: {}", table, e.getMessage());
            }
        }
    }

    // Helper methods
    private String getStr(List<Object> row, int index) {
        if (row.size() <= index || row.get(index) == null) return "";
        // Strip null bytes — PostgreSQL rejects 0x00 in text columns
        return row.get(index).toString().replace("\u0000", "");
    }

    private Long getLong(List<Object> row, int index) {
        String val = getStr(row, index).trim();
        if (val.isEmpty()) return null;
        try { return Long.parseLong(val); } catch (NumberFormatException e) { return null; }
    }

    private Integer getInt(List<Object> row, int index) {
        String val = getStr(row, index).trim();
        if (val.isEmpty()) return null;
        try { return Integer.parseInt(val); } catch (NumberFormatException e) { return null; }
    }

    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;
        try {
            return LocalDateTime.parse(dateStr.trim(), DTF);
        } catch (Exception e) {
            log.warn("Could not parse date '{}', using null", dateStr);
            return null;
        }
    }
}
