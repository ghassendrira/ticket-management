package com.ticketmanagement.aiservice.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DbFixMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DbFixMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        // Ajoute la colonne status si elle n'existe pas
        jdbcTemplate.execute(
            "ALTER TABLE ticket_embeddings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'RESOLVED'"
        );
        
        // Rétro-compatibilité : marque les anciens enregistrements
        jdbcTemplate.execute(
            "UPDATE ticket_embeddings SET status = 'RESOLVED' WHERE status IS NULL"
        );
        
        // Index pour perf
        jdbcTemplate.execute(
            "CREATE INDEX IF NOT EXISTS idx_ticket_embeddings_status ON ticket_embeddings(status)"
        );
        
        System.out.println("✅ DB migration applied: status column added to ticket_embeddings");
    }
}