package com.SaatSaheli.spring.util;

public class RoleUtil {

    public static final String ROLE_USER = "USER";
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_SUPER_ADMIN = "SUPER_ADMIN";

    public static boolean isAdmin(String role) {
        return ROLE_ADMIN.equalsIgnoreCase(role) || ROLE_SUPER_ADMIN.equalsIgnoreCase(role);
    }

    public static boolean isSuperAdmin(String role) {
        return ROLE_SUPER_ADMIN.equalsIgnoreCase(role);
    }

    public static boolean isValidRole(String role) {
        return ROLE_USER.equalsIgnoreCase(role)
                || ROLE_ADMIN.equalsIgnoreCase(role)
                || ROLE_SUPER_ADMIN.equalsIgnoreCase(role);
    }

    public static boolean canAssignRole(String actorRole, String targetRole) {
        if (!isSuperAdmin(actorRole)) return false;
        return isValidRole(targetRole);
    }
}
