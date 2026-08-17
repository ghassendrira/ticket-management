package com.ticketmanagement.notificationservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
public class InternalAuthenticationFilter extends OncePerRequestFilter {
    @Value("${internal.service-secret}")
    private String internalServiceSecret;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String internalSecretHeader = request.getHeader("X-Internal-Service-Key");
        if (StringUtils.hasText(internalSecretHeader) && internalSecretHeader.equals(internalServiceSecret)) {
            log.info("Internal service request detected for {}", request.getRequestURI());
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "internal-service",
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_INTERNAL"))
            );
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
            return;
        }
        // For non-internal endpoints, we'll use X-User-Id/X-User-Role (since gateway will set them, no JWT needed here)
        String userIdHeader = request.getHeader("X-User-Id");
        String roleHeader = request.getHeader("X-User-Role");
        if (StringUtils.hasText(userIdHeader) && StringUtils.hasText(roleHeader)) {
            log.info("User request detected: userId={}, role={}", userIdHeader, roleHeader);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    userIdHeader,
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + roleHeader))
            );
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
            filterChain.doFilter(request, response);
            return;
        }
        // If neither, continue (public endpoints, etc.)
        filterChain.doFilter(request, response);
    }
}
