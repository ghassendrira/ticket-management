package com.example.ragbackend.customer;

import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private static final Logger log = LoggerFactory.getLogger(CustomerController.class);
    private final CustomerRepository customerRepository;

    public CustomerController(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @PostMapping("/link")
    @Transactional
    public ResponseEntity<?> linkEmail(@RequestBody LinkEmailRequest request) {
        try {
            Optional<CustomerEntity> existing = customerRepository.findById(request.customerId());
            CustomerEntity customer = existing.orElseGet(() -> {
                CustomerEntity c = new CustomerEntity();
                c.setId(request.customerId());
                return c;
            });

            customer.setEmail(request.email() == null ? null : request.email().trim().toLowerCase());
            customerRepository.save(customer);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erreur lors du lien customer/email", e);
            return ResponseEntity.status(500).body("Erreur: " + e.getMessage());
        }
    }

    @GetMapping("/by-email")
    public ResponseEntity<?> getByEmail(@RequestParam String email) {
        String normalized = email == null ? null : email.trim().toLowerCase();
        return customerRepository.findByEmail(normalized)
                .map(c -> ResponseEntity.ok(Map.of("customerId", c.getId().toString())))
                .orElse(ResponseEntity.notFound().build());
    }
}

record LinkEmailRequest(java.util.UUID customerId, String email) {}
