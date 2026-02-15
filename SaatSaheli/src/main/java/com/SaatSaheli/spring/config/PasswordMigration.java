package com.SaatSaheli.spring.config;

import com.SaatSaheli.spring.model.Login;
import com.SaatSaheli.spring.repository.LoginRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PasswordMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PasswordMigration.class);
    private static final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    private LoginRepository loginRepo;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        List<Login> logins = loginRepo.findAll();
        int migrated = 0;

        for (Login login : logins) {
            String pwd = login.getPassword();
            // Skip empty passwords (Google/Apple OAuth users)
            if (pwd == null || pwd.isEmpty()) continue;
            // BCrypt hashes always start with "$2a$", "$2b$", or "$2y$" — skip already-hashed passwords
            if (pwd.startsWith("$2a$") || pwd.startsWith("$2b$") || pwd.startsWith("$2y$")) continue;

            // This is a plain-text password — hash it
            login.setPassword(passwordEncoder.encode(pwd));
            loginRepo.save(login);
            migrated++;
            log.info("Migrated password for login id={}, email={}", login.getId(), login.getEmail());
        }

        if (migrated > 0) {
            log.info("Password migration complete: {} passwords hashed", migrated);
        } else {
            log.info("Password migration: no plain-text passwords found");
        }
    }
}
