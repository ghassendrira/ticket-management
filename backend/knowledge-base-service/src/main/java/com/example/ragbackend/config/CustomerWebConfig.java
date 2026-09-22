package com.example.ragbackend.config;

import com.example.ragbackend.customer.CustomerHeaderInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CustomerWebConfig implements WebMvcConfigurer {

    private final CustomerHeaderInterceptor customerHeaderInterceptor;

    public CustomerWebConfig(CustomerHeaderInterceptor customerHeaderInterceptor) {
        this.customerHeaderInterceptor = customerHeaderInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(customerHeaderInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/admin/**");
    }
}
