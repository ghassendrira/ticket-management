package com.ticketmanagement.notificationservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequestWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class InternalAuthenticationFilter extends OncePerRequestFilter {
    @Value("${internal.service-secret}")
    private String internalServiceSecret;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${auth.service.url:http://localhost:8082}")
    private String authServiceUrl;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        if ("/api/notifications/stream".equals(request.getRequestURI())) {
            authenticateStreamRequest(request, response, filterChain);
            return;
        }

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
            authenticateUser(request, userIdHeader, roleHeader);
            filterChain.doFilter(request, response);
            return;
        }
        // If neither, continue (public endpoints, etc.)
        filterChain.doFilter(request, response);
    }

    private void authenticateStreamRequest(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws IOException, ServletException {
        String token = request.getParameter("token");
        if (!StringUtils.hasText(token)) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing stream token");
            return;
        }

        try {
            Jws<Claims> claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            String userId = claims.getPayload().getSubject();
            String role = claims.getPayload().get("role", String.class);
            if (!StringUtils.hasText(userId) || !StringUtils.hasText(role)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid stream token");
                return;
            }

            UUID.fromString(userId);
            verifyUserExists(token);
            authenticateUser(request, userId, role);
            filterChain.doFilter(withUserHeaders(request, userId, role), response);
        } catch (Exception exception) {
            log.warn("Invalid notification stream authentication: {}", exception.getMessage());
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid stream token");
        }
    }

    private void verifyUserExists(String token) {
        RestClient.create(authServiceUrl)
                .get()
                .uri("/api/auth/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new IllegalStateException("Auth service rejected user");
                })
                .toBodilessEntity();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    private void authenticateUser(HttpServletRequest request, String userId, String role) {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                userId,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private HttpServletRequest withUserHeaders(HttpServletRequest request, String userId, String role) {
        return new HttpServletRequestWrapper(request) {
            @Override
            public String getHeader(String name) {
                if ("X-User-Id".equalsIgnoreCase(name)) {
                    return userId;
                }
                if ("X-User-Role".equalsIgnoreCase(name)) {
                    return role;
                }
                return super.getHeader(name);
            }
        };
    }
}
