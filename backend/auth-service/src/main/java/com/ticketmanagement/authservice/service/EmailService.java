package com.ticketmanagement.authservice.service;

import com.ticketmanagement.authservice.entity.Role;

public interface EmailService {
    boolean sendTemporaryPasswordEmail(String toEmail, String toName, String username, String tempPassword, Role role);
}
