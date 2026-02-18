package com.SaatSaheli.spring.model;

public class ChatMessage {
    private Long id;
    private Long roomId;
    private Long senderId;
    private String senderName;
    private String message;
    private String createdDate;
    private boolean isDeleted;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getCreatedDate() { return createdDate; }
    public void setCreatedDate(String createdDate) { this.createdDate = createdDate; }

    public boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(boolean isDeleted) { this.isDeleted = isDeleted; }
}
