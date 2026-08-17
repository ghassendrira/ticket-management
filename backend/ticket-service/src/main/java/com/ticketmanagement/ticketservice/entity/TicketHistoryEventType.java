package com.ticketmanagement.ticketservice.entity;

public enum TicketHistoryEventType {
    TICKET_CREATED,
    TICKET_ASSIGNED,
    TICKET_REASSIGNED,
    STATUS_CHANGED,
    ESCALATION_REQUESTED,
    ESCALATION_ACCEPTED,
    ESCALATION_REJECTED,
    ESCALATION_REASSIGNED
}
