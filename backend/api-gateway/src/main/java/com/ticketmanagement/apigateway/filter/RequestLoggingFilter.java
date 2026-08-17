package com.ticketmanagement.apigateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@Slf4j
public class RequestLoggingFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        log.info("Incoming request: {} {}", request.getMethod(), request.getURI().getPath());
        request.getHeaders().forEach((key, value) -> log.debug("Header {}: {}", key, value));

        return chain.filter(exchange)
                .doOnSuccess(aVoid ->
                        log.info("Request completed successfully: {} {}", request.getMethod(), request.getURI().getPath())
                )
                .doOnError(throwable ->
                        log.error("Request failed: {} {} - Error: {}", request.getMethod(), request.getURI().getPath(), throwable.getMessage(), throwable)
                );
    }

    @Override
    public int getOrder() {
    return Ordered.LOWEST_PRECEDENCE;
    }
}