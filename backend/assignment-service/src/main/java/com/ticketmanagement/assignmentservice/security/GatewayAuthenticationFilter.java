package com.ticketmanagement.assignmentservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class GatewayAuthenticationFilter extends OncePerRequestFilter {

    @Value("${internal.service-secret}")
    private String internalServiceSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // Internal service key authentication for service-to-service calls
        String internalKey = request.getHeader("X-Internal-Service-Key");
        if (internalKey != null && internalKey.equals(internalServiceSecret)) {
            var auth = new UsernamePasswordAuthenticationToken("internal-service", null,
                    List.of(new SimpleGrantedAuthority("ROLE_INTERNAL_SERVICE")));
            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
            return;
        }

        String userId = request.getHeader("X-User-Id");
        String roleHeader = request.getHeader("X-User-Role");

        if (userId != null && !userId.isBlank() && roleHeader != null && !roleHeader.isBlank()) {
            String role = roleHeader.toUpperCase();
            if (!role.startsWith("ROLE_")) {
                role = "ROLE_" + role;
            }
            var authorities = List.of(new SimpleGrantedAuthority(role));
            var auth = new UsernamePasswordAuthenticationToken(userId, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}