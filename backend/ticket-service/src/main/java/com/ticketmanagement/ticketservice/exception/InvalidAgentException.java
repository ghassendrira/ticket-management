package com.ticketmanagement.ticketservice.exception;

public class InvalidAgentException extends RuntimeException {
    public InvalidAgentException(String message) {
        super(message);
    }
}
