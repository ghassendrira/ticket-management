package com.ticketmanagement.assignmentservice.controller;

import com.ticketmanagement.assignmentservice.dto.AssignmentRecommendationRequest;
import com.ticketmanagement.assignmentservice.dto.AssignmentRecommendationResponse;
import com.ticketmanagement.assignmentservice.service.AssignmentRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentRecommendationController {

    private final AssignmentRecommendationService recommendationService;

    @PostMapping("/recommend")
    public ResponseEntity<AssignmentRecommendationResponse> recommend(
            @RequestBody AssignmentRecommendationRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String callerUserId,
            @RequestHeader(value = "X-User-Role", required = false) String callerRole) {
        UUID callerUserIdUuid = null;
        if (callerUserId != null && !callerUserId.isBlank()) {
            try {
                callerUserIdUuid = UUID.fromString(callerUserId);
            } catch (IllegalArgumentException ignored) {
            }
        }
        return ResponseEntity.ok(recommendationService.recommend(request, callerUserIdUuid, callerRole));
    }
}