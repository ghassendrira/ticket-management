package com.example.ragbackend.customer;

public final class CustomerContextHolder {

    private static final ThreadLocal<String> CURRENT_CUSTOMER_ID = new ThreadLocal<>();

    private CustomerContextHolder() {
    }

    public static void setCurrentCustomerId(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            CURRENT_CUSTOMER_ID.remove();
            return;
        }
        CURRENT_CUSTOMER_ID.set(customerId.trim());
    }

    public static String getCurrentCustomerId() {
        return CURRENT_CUSTOMER_ID.get();
    }

    public static void clear() {
        CURRENT_CUSTOMER_ID.remove();
    }
}
