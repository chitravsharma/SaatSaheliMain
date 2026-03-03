package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "logins")
public class Login {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true)
    private Long userId;

    @Column(unique = true)
    private String email;

    @JsonIgnore
    private String password;

    private String status; // ACTIVE, INACTIVE, DISABLED, DELETED, BLOCKED

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "account_created_date")
    private LocalDateTime accountCreatedDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "last_login_date")
    private LocalDateTime lastLoginDate;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Column(name = "created_date")
    private LocalDateTime createdDate;

    private String provider; // "email", "google", "apple"

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getAccountCreatedDate() { return accountCreatedDate; }
    public void setAccountCreatedDate(LocalDateTime accountCreatedDate) { this.accountCreatedDate = accountCreatedDate; }

    public LocalDateTime getLastLoginDate() { return lastLoginDate; }
    public void setLastLoginDate(LocalDateTime lastLoginDate) { this.lastLoginDate = lastLoginDate; }

    public LocalDateTime getCreatedDate() { return createdDate; }
    public void setCreatedDate(LocalDateTime createdDate) { this.createdDate = createdDate; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    @Override
    public String toString() {
        return "Login [id=" + id + ", userId=" + userId + ", email=" + email + ", status=" + status + "]";
    }
}
