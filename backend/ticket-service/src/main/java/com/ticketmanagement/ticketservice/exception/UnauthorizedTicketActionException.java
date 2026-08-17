package com.ticketmanagement.ticketservice.exception;

public class UnauthorizedTicketActionException extends RuntimeException {
    public UnauthorizedTicketActionException(String message) {
        super(message);
    }
}
