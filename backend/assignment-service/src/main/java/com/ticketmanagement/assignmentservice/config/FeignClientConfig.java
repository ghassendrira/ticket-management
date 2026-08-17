package com.ticketmanagement.assignmentservice.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class FeignClientConfig {

    @Bean
    public RequestInterceptor internalServiceInterceptor(
            @Value("${internal.service-secret}") String internalSecret
    ) {
        return template -> template.header("X-Internal-Service-Key", internalSecret);
    }
}
