package com.SaatSaheli.spring.config;

import org.hibernate.envers.RevisionListener;

/**
 * Populates {@link SaatSaheliRevisionEntity} from the per-request
 * {@link AuditActorContext} ThreadLocal. If no context is set (e.g.
 * background jobs, migrations) the revision still gets written with
 * null actor/target — the audit row is never skipped.
 */
public class SaatSaheliRevisionListener implements RevisionListener {

    @Override
    public void newRevision(Object revisionEntity) {
        SaatSaheliRevisionEntity rev = (SaatSaheliRevisionEntity) revisionEntity;
        AuditActorContext.Actor actor = AuditActorContext.get();
        if (actor != null) {
            rev.setActorUserId(actor.actorUserId());
            rev.setTargetUserId(actor.targetUserId());
            rev.setRequestPath(actor.requestPath());
        }
    }
}
