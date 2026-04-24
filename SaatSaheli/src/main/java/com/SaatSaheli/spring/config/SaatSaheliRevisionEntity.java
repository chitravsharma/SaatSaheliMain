package com.SaatSaheli.spring.config;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.envers.RevisionEntity;
import org.hibernate.envers.RevisionNumber;
import org.hibernate.envers.RevisionTimestamp;

/**
 * Shared Envers revision entity. Every change to any {@code @Audited}
 * entity creates one row here plus one row in the corresponding
 * {@code <table>_aud} table. {@code actorUserId} captures the real
 * SuperAdmin when impersonating; {@code targetUserId} is the owner
 * of the content being modified.
 */
@Entity
@Table(name = "revision_info")
@RevisionEntity(SaatSaheliRevisionListener.class)
public class SaatSaheliRevisionEntity {

    @Id
    @GeneratedValue
    @RevisionNumber
    @Column(name = "rev")
    private int id;

    @RevisionTimestamp
    @Column(name = "revtstmp")
    private long timestamp;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @Column(name = "request_path", length = 512)
    private String requestPath;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }

    public Long getActorUserId() { return actorUserId; }
    public void setActorUserId(Long actorUserId) { this.actorUserId = actorUserId; }

    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }

    public String getRequestPath() { return requestPath; }
    public void setRequestPath(String requestPath) { this.requestPath = requestPath; }
}
