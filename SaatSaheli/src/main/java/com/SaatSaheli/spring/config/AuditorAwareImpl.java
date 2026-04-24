package com.SaatSaheli.spring.config;

import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Supplies the {@code @CreatedBy} / {@code @LastModifiedBy} value.
 * Returns the <em>target</em> user — content is attributed to the
 * owner, not the impersonating SuperAdmin. The actor is captured
 * separately in {@link SaatSaheliRevisionEntity}.
 */
@Component
public class AuditorAwareImpl implements AuditorAware<Long> {

    @Override
    public Optional<Long> getCurrentAuditor() {
        AuditActorContext.Actor actor = AuditActorContext.get();
        if (actor == null || actor.targetUserId() == null) {
            return Optional.empty();
        }
        return Optional.of(actor.targetUserId());
    }
}
