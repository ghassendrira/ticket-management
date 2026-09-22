package com.example.ragbackend.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class AdminJdbcRepository {

    private final JdbcTemplate jdbcTemplate;
    private final RowMapper<AdminUserEntity> mapper = new RowMapper<>() {
        @Override
        public AdminUserEntity mapRow(ResultSet rs, int rowNum) throws SQLException {
            AdminUserEntity e = new AdminUserEntity();
            e.setId(rs.getObject("id", java.util.UUID.class));
            e.setEmail(rs.getString("email"));
            e.setPasswordHash(rs.getString("password_hash"));
            e.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
            return e;
        }
    };

    public AdminJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<AdminUserEntity> findByEmail(String email) {
        List<AdminUserEntity> list = jdbcTemplate.query(
            "select id, email, password_hash, created_at from admin_users where lower(email)=lower(?)",
            mapper, email
        );
        return list.stream().findFirst();
    }

    public long count() {
        Long cnt = jdbcTemplate.queryForObject("select count(*) from admin_users", Long.class);
        return cnt == null ? 0L : cnt;
    }

    public void save(AdminUserEntity admin) {
        jdbcTemplate.update("insert into admin_users(email, password_hash) values (?, ?)",
            admin.getEmail(), admin.getPasswordHash());
    }

    public List<AdminUserEntity> findAll() {
        return jdbcTemplate.query("select id, email, password_hash, created_at from admin_users order by created_at desc", mapper);
    }
}
