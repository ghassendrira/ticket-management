package com.example.ragbackend.customer;

public class CustomerContextHolder {
    private static final ThreadLocal<String> currentCustomer = new ThreadLocal<>();

    public static void setCurrentCustomerId(String id) {
        currentCustomer.set(id);
    }

    public static String getCurrentCustomerId() {
        return currentCustomer.get();
    }

    public static void clear() {
        currentCustomer.remove();
    }
}
