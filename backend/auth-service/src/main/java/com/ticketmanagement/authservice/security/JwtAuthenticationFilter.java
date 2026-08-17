package com.ticketmanagement.authservice.security;

import com.ticketmanagement.authservice.entity.Role;
import com.ticketmanagement.authservice.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Value("${internal.service-secret}")
    private String internalServiceSecret;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        log.info("Auth filter processing request: {} {}", request.getMethod(), request.getRequestURI());
        
        // Check for internal service secret header first
        String internalSecretHeader = request.getHeader("X-Internal-Service-Key");
        if (StringUtils.hasText(internalSecretHeader) && internalSecretHeader.equals(internalServiceSecret)) {
            log.info("Internal service request detected, skipping JWT validation");
            // Create an authentication with ADMIN role for internal requests
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    "internal-service",
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
            return;
        }

        // Proceed with normal JWT authentication
        String authHeader = request.getHeader("Authorization");
        String jwt = null;

        if (StringUtils.hasText(authHeader)) {
            log.info("Authorization header present: {}", authHeader.substring(0, Math.min(authHeader.length(), 20)) + "...");
            if (authHeader.startsWith("Bearer ")) {
                jwt = authHeader.substring(7);
                log.info("Extracted JWT (first 20 chars): {}", jwt.substring(0, Math.min(jwt.length(), 20)) + "...");
            } else {
                log.warn("Authorization header does not start with 'Bearer '");
            }
        } else {
            log.info("No Authorization header present");
        }

        if (jwt != null) {
            try {
                boolean valid = jwtService.validateToken(jwt);
                if (valid) {
                    log.info("JWT validation successful");
                    String userId = jwtService.getUserIdFromToken(jwt);
                    String username = jwtService.getUsernameFromToken(jwt);
                    String roleStr = jwtService.getRoleFromToken(jwt);
                    log.info("JWT resolved user: userId={}, username={}, role={}", userId, username, roleStr);
                    Role role = Role.valueOf(roleStr);

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userId,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
                    );
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    log.warn("JWT validation failed");
                }
            } catch (Exception e) {
                log.error("Error processing JWT", e);
            }
        }

        filterChain.doFilter(request, response);
    }
}
