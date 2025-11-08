package com.parking.mlcp.websocket;

import com.parking.mlcp.dto.OccupancyResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service for sending real-time notifications via WebSocket
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast occupancy update to all connected clients
     */
    public void sendOccupancyUpdate(OccupancyResponse occupancy) {
        messagingTemplate.convertAndSend("/topic/occupancy", occupancy);
        log.debug("Sent occupancy update via WebSocket");
    }

    /**
     * Send floor-specific slot update
     */
    public void sendSlotUpdate(Long floorId, Map<String, Object> slotData) {
        messagingTemplate.convertAndSend("/topic/slots/" + floorId, slotData);
        log.debug("Sent slot update for floor {} via WebSocket", floorId);
    }

    /**
     * Send maintenance alert notification
     */
    public void sendMaintenanceAlert(Map<String, Object> alertData) {
        messagingTemplate.convertAndSend("/topic/alerts", alertData);
        log.info("Sent maintenance alert via WebSocket");
    }

    /**
     * Send general parking event
     */
    public void sendParkingEvent(String eventType, Map<String, Object> eventData) {
        Map<String, Object> message = Map.of(
                "eventType", eventType,
                "data", eventData,
                "timestamp", System.currentTimeMillis()
        );
        messagingTemplate.convertAndSend("/topic/events", message);
        log.debug("Sent parking event: {} via WebSocket", eventType);
    }
}
