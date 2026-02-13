package com.SaatSaheli.spring.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class Login {
    private Long id;
    private Long userId;
    private String email;

    @JsonIgnore
    private String password;

    private String status; // ACTIVE, INACTIVE, DISABLED, DELETED, BLOCKED
    private String accountCreatedDate;
    private String lastLoginDate;
    private String createdDate;

    // For API responses — include user details
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

    public String getAccountCreatedDate() { return accountCreatedDate; }
    public void setAccountCreatedDate(String accountCreatedDate) { this.accountCreatedDate = accountCreatedDate; }

    public String getLastLoginDate() { return lastLoginDate; }
    public void setLastLoginDate(String lastLoginDate) { this.lastLoginDate = lastLoginDate; }

    public String getCreatedDate() { return createdDate; }
    public void setCreatedDate(String createdDate) { this.createdDate = createdDate; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    @Override
    public String toString() {
        return "Login [id=" + id + ", userId=" + userId + ", email=" + email + ", status=" + status + "]";
    }
}
